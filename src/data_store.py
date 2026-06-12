import streamlit as st
import pandas as pd
import io
from datetime import datetime

DEFAULT_LEGS = [
    {"id": "leg-br", "team": "Brazil", "display": "Brasil", "target": "SEMI_FINAL"},
    {"id": "leg-ar", "team": "Argentina", "display": "Argentina", "target": "SEMI_FINAL"},
    {"id": "leg-es", "team": "Spain", "display": "Espanha", "target": "QUARTER_FINAL"},
    {"id": "leg-de", "team": "Germany", "display": "Alemanha", "target": "ROUND_OF_16"},
    {"id": "leg-pt", "team": "Portugal", "display": "Portugal", "target": "ROUND_OF_16"},
    {"id": "leg-gb", "team": "England", "display": "Inglaterra", "target": "ROUND_OF_16"},
    {"id": "leg-fr", "team": "France", "display": "França", "target": "ROUND_OF_16"},
]

DEFAULT_BET = {
    "stake": 10.0,
    "odd": 75.0,
    "betano_url": "https://www.betano.bet.br/",
    "legs": DEFAULT_LEGS,
    "snapshots": [],
    "profile": "equilibrado",
    "cashout_margin": 0.88,
    "correlation_weight": 0.55,
    "base_chance": 50,
    "house_margin": 0.06,
}


def init_session():
    if "bet" not in st.session_state:
        st.session_state.bet = dict(DEFAULT_BET)

    if "snapshots" not in st.session_state:
        st.session_state.snapshots = []

    if "bet_updated" not in st.session_state:
        st.session_state.bet_updated = False


def restore_default():
    st.session_state.bet = dict(DEFAULT_BET)
    st.session_state.bet_updated = True


def add_snapshot(snapshot_odd, cashout, model_result, note=""):
    entry = {
        "createdAt": datetime.now().isoformat(),
        "odd": snapshot_odd,
        "cashout": cashout,
        "stake": st.session_state.bet["stake"],
        "entryOdd": st.session_state.bet["odd"],
        "modelOdd": model_result.get("fair_odd") if model_result else None,
        "modelProbability": model_result.get("probability") if model_result else None,
        "fairCashout": model_result.get("fair_cashout") if model_result else None,
        "note": note or _evaluate_note(model_result),
    }
    st.session_state.snapshots.insert(0, entry)
    st.session_state.snapshots = st.session_state.snapshots[:30]


def _evaluate_note(model_result):
    if not model_result:
        return "Pendente"
    p = model_result.get("probability", 0)
    if p <= 0:
        return "Perdeu"
    if p > model_result.get("implied", 0):
        return "Valor positivo"
    return "Abaixo do break-even"


def clear_snapshots():
    st.session_state.snapshots = []


def export_snapshots_csv():
    rows = st.session_state.snapshots
    if not rows:
        return None
    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    df.to_csv(buf, index=False, encoding="utf-8-sig")
    buf.seek(0)
    return buf


def export_summary_txt(model_result, status_label):
    bet = st.session_state.bet
    lines = [
        "🎯 O SONHO AINDA ESTÁ VIVO?",
        "=" * 50,
        "",
        f"📋 Status: {status_label}",
        f"💰 Stake: R$ {bet['stake']:.2f}",
        f"🎲 Odd contratada: {bet['odd']:.2f}",
        f"📈 Retorno potencial: R$ {bet['stake'] * bet['odd']:.2f}",
        f"💵 Lucro líquido: R$ {bet['stake'] * bet['odd'] - bet['stake']:.2f}",
    ]

    if model_result:
        lines += [
            "",
            "📊 MODELO ESTATÍSTICO",
            "-" * 50,
            f"Probabilidade modelada: {model_result['probability']*100:.2f}%",
            f"Odd justa: {model_result['fair_odd']:.2f}" if model_result["fair_odd"] != float("inf") else "Odd justa: ∞ (perdeu)",
            f"Valor justo: R$ {model_result['fair_value']:.2f}",
            f"Cashout justo: R$ {model_result['fair_cashout']:.2f}",
            f"EV esperado: R$ {model_result['ev']:.2f}",
            f"Confiança: {model_result['confidence']:.0f}%",
        ]

    lines += [
        "",
        "📋 CONDIÇÕES DA APOSTA",
        "-" * 50,
    ]

    for leg in bet["legs"]:
        lines.append(f"{leg['display']}: precisa de {leg['target']}")

    lines += [
        "",
        f"🕐 Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        "",
        "⚠️ Modelo estimativo — não substitui conferência oficial da Betano.",
    ]

    return "\n".join(lines)
