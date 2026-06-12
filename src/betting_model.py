import math

TEAM_RATINGS = {
    "brazil": 2140,
    "argentina": 2132,
    "france": 2148,
    "spain": 2112,
    "england": 2078,
    "portugal": 2058,
    "germany": 2038,
    "netherlands": 2032,
    "belgium": 1996,
    "italy": 1994,
    "uruguay": 1988,
    "croatia": 1972,
    "morocco": 1958,
    "colombia": 1954,
    "usa": 1902,
    "mexico": 1888,
    "switzerland": 1904,
    "denmark": 1900,
    "japan": 1896,
    "senegal": 1882,
    "austria": 1878,
    "canada": 1838,
}

DEFAULT_RATING = 1765

PROFILE_FACTORS = {
    "conservador": 0.86,
    "equilibrado": 1.0,
    "agressivo": 1.14,
}

STAGE_RANK = {
    "GROUP": 0,
    "ROUND_OF_32": 1,
    "ROUND_OF_16": 2,
    "QUARTER_FINAL": 3,
    "SEMI_FINAL": 4,
    "FINAL": 5,
    "CHAMPION": 6,
}

STAGE_LABELS = {
    "GROUP": "Fase de grupos",
    "ROUND_OF_32": "16 avos / Round of 32",
    "ROUND_OF_16": "Oitavas / Round of 16",
    "QUARTER_FINAL": "Quartas de final",
    "SEMI_FINAL": "Semifinais",
    "FINAL": "Final",
    "CHAMPION": "Campeã",
}


def get_rating(team_key):
    return TEAM_RATINGS.get(team_key, DEFAULT_RATING)


def rating_strength(rating):
    return 1.0 / (1.0 + math.exp(-(rating - 1850) / 210))


def _pre_tournament_prob(stage_key, strength):
    table = {
        "ROUND_OF_32": 0.68 + 0.30 * strength,
        "ROUND_OF_16": 0.34 + 0.54 * strength,
        "QUARTER_FINAL": 0.13 + 0.50 * strength,
        "SEMI_FINAL": 0.045 + 0.36 * strength,
        "FINAL": 0.018 + 0.205 * strength,
        "CHAMPION": 0.008 + 0.108 * strength,
    }
    return table.get(stage_key, 0.5)


def _knockout_win_prob(rating, form_multiplier=1.0):
    base = 0.46 + 0.23 * rating_strength(rating)
    adjusted = base * math.sqrt(max(0.82, min(1.18, form_multiplier)))
    return max(0.42, min(0.72, adjusted))


def estimate_team_probability(team_key, target_stage, assessment,
                              form_multiplier=1.0):
    status = assessment.get("status", "pending")

    if status == "achieved":
        return 1.0, "Condição já cumprida"
    if status == "failed":
        return 0.0, "Condição falhou"

    rating = get_rating(team_key)
    strength = rating_strength(rating)
    highest_rank = assessment.get("highest_rank", 0)
    target_rank = STAGE_RANK.get(target_stage, 2)

    if highest_rank > 0:
        wins_needed = max(0, target_rank - highest_rank)
        if wins_needed == 0:
            prob = 1.0
            note = "Já apareceu na fase exigida"
        else:
            kwp = _knockout_win_prob(rating, form_multiplier)
            prob = kwp ** wins_needed
            note = f"{wins_needed} vitória(s) restante(s)"
    else:
        prob = _pre_tournament_prob(target_stage, strength) * form_multiplier
        note = "Baseado em rating + caminho até a fase"

    if status == "risk":
        prob *= 0.72

    prob = max(0.002, min(0.985, prob))
    return prob, note


def calculate_correlation_factor(assessments, correlation_weight=0.55):
    pending = [
        a for a in assessments
        if a.get("status") not in ("achieved", "failed")
    ]

    semi_needs = sum(
        1 for a in pending
        if STAGE_RANK.get(a.get("target", "ROUND_OF_16"), 0) >= 4
    )
    qf_needs = sum(
        1 for a in pending
        if STAGE_RANK.get(a.get("target", "ROUND_OF_16"), 0) >= 3
    )
    r16_needs = sum(
        1 for a in pending
        if STAGE_RANK.get(a.get("target", "ROUND_OF_16"), 0) >= 2
    )

    w = max(0.0, min(1.0, correlation_weight))
    scarcity = 1.0 - w * (
        max(0, semi_needs - 1) * 0.105
        + max(0, qf_needs - 2) * 0.028
        + max(0, r16_needs - 4) * 0.012
    )

    semi_keys = [
        _normalize_team(a.get("team", ""))
        for a in pending
        if STAGE_RANK.get(a.get("target", "ROUND_OF_16"), 0) >= 4
    ]
    bracket_penalty = 1.0
    if "brazil" in semi_keys and "argentina" in semi_keys:
        bracket_penalty = 1.0 - (0.055 * w)

    return max(0.68, min(1.02, scarcity * bracket_penalty))


def _normalize_team(value):
    import unicodedata
    s = unicodedata.normalize("NFD", str(value))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def calculate(assessments, stake=10, odd=75, profile="equilibrado",
              cashout_margin=0.88, correlation_weight=0.55,
              worldcup_data=None):
    raw_product = 1.0
    for a in assessments:
        raw_product *= max(0.0, min(1.0, a.get("probability", 0)))

    corr = calculate_correlation_factor(assessments, correlation_weight)
    profile_factor = PROFILE_FACTORS.get(profile, 1.0)

    probability = raw_product * corr * profile_factor
    probability = max(0.0, min(0.999999, probability))

    fair_odd = 1.0 / probability if probability > 0 else float("inf")
    payout = stake * odd
    fair_value = payout * probability
    ev = fair_value - stake
    fair_cashout = fair_value * max(0.1, min(1.2, cashout_margin))
    implied = 1.0 / odd if odd > 0 else 0

    live = bool(worldcup_data and worldcup_data.get("live"))
    fallback = bool(worldcup_data and worldcup_data.get("fallback"))
    errors = (worldcup_data or {}).get("errors", [])
    games_count = len((worldcup_data or {}).get("games", []))

    confidence = 42
    if live:
        confidence = 72
    elif fallback:
        confidence = 50
    else:
        confidence = 42

    finished_games = sum(
        1 for g in (worldcup_data or {}).get("games", [])
        if g.get("finished") or g.get("status") == "finished"
    )
    confidence += min(16, finished_games * 0.55)
    confidence += sum(1 for a in assessments if a.get("status") in ("achieved", "failed")) * 2.2
    confidence -= len(errors) * 3
    confidence = max(25, min(94, confidence))

    if live:
        data_quality = "API externa ativa"
    elif fallback:
        data_quality = "Fallback local ativo"
    else:
        data_quality = "Sem confirmação externa"

    return {
        "probability": probability,
        "fair_odd": fair_odd,
        "fair_value": fair_value,
        "ev": ev,
        "fair_cashout": fair_cashout,
        "correlation_factor": corr,
        "profile_factor": profile_factor,
        "confidence": confidence,
        "data_quality": data_quality,
        "raw_product": raw_product,
        "implied": implied,
    }
