import streamlit as st
import requests
import json
import time
from pathlib import Path

FALLBACK_PATH = Path(__file__).resolve().parent.parent / "data" / "fallback_snapshot.json"

API_BASE = "https://worldcup26.ir/api/get"
ENDPOINTS = {
    "games": f"{API_BASE}/games",
    "groups": f"{API_BASE}/groups",
    "teams": f"{API_BASE}/teams",
    "stadiums": f"{API_BASE}/stadiums",
}

CACHE_TTL = 600

STAGE_ORDER = [
    "GROUP",
    "ROUND_OF_32",
    "ROUND_OF_16",
    "QUARTER_FINAL",
    "SEMI_FINAL",
    "FINAL",
    "CHAMPION",
]

STAGE_LABELS = {
    "GROUP": "Fase de grupos",
    "ROUND_OF_32": "16 avos / Round of 32",
    "ROUND_OF_16": "Oitavas / Round of 16",
    "QUARTER_FINAL": "Quartas de final",
    "SEMI_FINAL": "Semifinais",
    "FINAL": "Final",
    "CHAMPION": "Campeã",
}

STAGE_RANK = {k: i for i, k in enumerate(STAGE_ORDER)}


def _load_fallback():
    try:
        with open(FALLBACK_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "games": [],
            "groups": [],
            "teams": [],
            "stadiums": [],
        }


def _normalize_array(payload, key):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        if isinstance(payload.get(key), list):
            return payload[key]
        if isinstance(payload.get("data"), list):
            return payload["data"]
        if isinstance(payload.get("data"), dict) and isinstance(payload["data"].get(key), list):
            return payload["data"][key]
        for v in payload.values():
            if isinstance(v, list):
                return v
    return []


def _fetch_resource(resource):
    url = ENDPOINTS.get(resource)
    if not url:
        return []
    try:
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        return _normalize_array(data, resource)
    except Exception:
        return None


def fetch_worldcup_data():
    cache_key = "worldcup_data"
    cached = st.session_state.get(cache_key)
    now = time.time()
    if cached and (now - cached["ts"] < CACHE_TTL):
        return cached["data"]

    results = {}
    all_ok = True
    errors = []
    for resource in ["games", "groups", "teams", "stadiums"]:
        data = _fetch_resource(resource)
        if data is None:
            all_ok = False
            errors.append(resource)
            results[resource] = []
        else:
            results[resource] = data

    if all_ok and len(results.get("games", [])) > 0:
        data = {
            "live": True,
            "fallback": False,
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "errors": errors,
            **results,
        }
    else:
        fallback = _load_fallback()
        data = {
            "live": False,
            "fallback": True,
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "errors": errors + ["Usando fallback local — API externa indisponível ou sem dados."],
            **fallback,
        }

    st.session_state[cache_key] = {"ts": now, "data": data}
    return data


def stage_from_game(game):
    raw = " ".join(
        str(game.get(k, "")) for k in
        ["type", "stage", "round", "group", "phase", "match_name", "name"]
    ).lower().strip()

    if "champion" in raw:
        return "CHAMPION"
    if "final" in raw and "semi" not in raw and "third" not in raw:
        return "FINAL"
    if any(x in raw for x in ["third", "3rd", "semi", "sf"]):
        return "SEMI_FINAL"
    if any(x in raw for x in ["quarter", "qf"]):
        return "QUARTER_FINAL"
    if any(x in raw for x in ["round of 16", "r16", "last 16"]):
        return "ROUND_OF_16"
    if any(x in raw for x in ["round of 32", "r32"]):
        return "ROUND_OF_32"

    match_id = game.get("id") or game.get("match_id") or game.get("matchNumber")
    if match_id is not None:
        try:
            mid = int(match_id)
            if mid >= 104:
                return "FINAL"
            if mid >= 101:
                return "SEMI_FINAL"
            if mid >= 97:
                return "QUARTER_FINAL"
            if mid >= 89:
                return "ROUND_OF_16"
            if mid >= 73:
                return "ROUND_OF_32"
        except (ValueError, TypeError):
            pass

    return "GROUP"


def _normalize_team(value):
    import unicodedata
    s = unicodedata.normalize("NFD", str(value))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def get_game_team_key(game, side):
    prefix = "home" if side == "home" else "away"
    candidates = [
        game.get(f"{prefix}_team_name_en"),
        game.get(f"{prefix}_team_en"),
        game.get(f"{prefix}_team_name"),
        game.get(f"{prefix}TeamName"),
    ]
    if isinstance(game.get(f"{prefix}Team"), dict):
        candidates.append(game[f"{prefix}Team"].get("name"))
        candidates.append(game[f"{prefix}Team"].get("name_en"))
    candidates = [c for c in candidates if c]
    for c in candidates:
        key = _normalize_team(c)
        if key and not any(x in key for x in ["winner", "runner", "loser", "tbd"]):
            return key
    return ""


def is_finished(game):
    vals = [
        str(game.get(k, "")).lower()
        for k in ["finished", "status", "time_elapsed", "timeElapsed", "match_status"]
    ]
    finished_vals = {
        "true", "finished", "finish", "ft", "fulltime",
        "full-time", "ended", "completed",
    }
    return any(v in finished_vals for v in vals)


def get_score(game, side):
    hs = game.get("home_score") or game.get("homeScore")
    as_ = game.get("away_score") or game.get("awayScore")
    if isinstance(game.get("score"), dict):
        hs = hs or game["score"].get("home")
        as_ = as_ or game["score"].get("away")
        if isinstance(game["score"].get("fullTime"), dict):
            hs = hs or game["score"]["fullTime"].get("home")
            as_ = as_ or game["score"]["fullTime"].get("away")

    try:
        hs = float(hs) if hs is not None else None
    except (ValueError, TypeError):
        hs = None
    try:
        as_ = float(as_) if as_ is not None else None
    except (ValueError, TypeError):
        as_ = None

    if side == "home":
        return hs
    return as_


def team_lost(game, side):
    home = get_score(game, "home")
    away = get_score(game, "away")
    if home is None or away is None:
        return False
    if side == "home":
        return home < away
    return away < home


def assess_team(team_key, target_stage, worldcup_data):
    games = worldcup_data.get("games", [])
    target_rank = STAGE_RANK.get(target_stage, 2)
    highest = "GROUP"
    highest_rank = 0
    reached_target = False
    eliminated = False
    elimination_stage = None

    for game in games:
        home = get_game_team_key(game, "home")
        away = get_game_team_key(game, "away")
        is_home = home == team_key
        is_away = away == team_key
        if not is_home and not is_away:
            continue

        stage = stage_from_game(game)
        rank = STAGE_RANK.get(stage, 0)
        if rank > highest_rank:
            highest = stage
            highest_rank = rank

        if rank >= target_rank:
            reached_target = True

        if rank > 0 and is_finished(game):
            if team_lost(game, "home" if is_home else "away"):
                eliminated = True
                elimination_stage = stage

    return {
        "highest": highest,
        "highest_rank": highest_rank,
        "reached_target": reached_target,
        "eliminated": eliminated,
        "elimination_stage": elimination_stage,
    }
