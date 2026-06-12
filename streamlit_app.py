import streamlit as st
import pandas as pd
from datetime import datetime

from src.ui_components import inject_css, render_glass_card, render_status_badge, render_probability_bar, render_footer
from src.data_store import init_session, restore_default, add_snapshot, clear_snapshots, export_snapshots_csv, export_summary_txt
from src.worldcup_api import (
    fetch_worldcup_data, assess_team, STAGE_LABELS, STAGE_RANK, _normalize_team,
)
from src.betting_model import calculate, estimate_team_probability, get_rating

st.set_page_config(
    page_title="O sonho ainda está vivo? — Copa 2026",
    page_icon="🏆",
    layout="wide",
    initial_sidebar_state="collapsed",
)

inject_css()
init_session()

bet = st.session_state.bet

with st.sidebar:
    st.markdown("### ⚙️ Controles")
    profile = st.selectbox(
        "Perfil do modelo",
        options=["conservador", "equilibrado", "agressivo"],
        index=["conservador", "equilibrado", "agressivo"].index(bet.get("profile", "equilibrado")),
        key="profile_sel",
    )
    bet["profile"] = profile

    cashout_margin = st.slider(
        "Margem para cashout (%)",
        min_value=70, max_value=100, value=int(bet.get("cashout_margin", 0.88) * 100),
        key="cashout_margin_slider",
    )
    bet["cashout_margin"] = cashout_margin / 100.0

    correlation = st.slider(
        "Correlação / risco de chave",
        min_value=0, max_value=100, value=int(bet.get("correlation_weight", 0.55) * 100),
        key="correlation_slider",
    )
    bet["correlation_weight"] = correlation / 100.0

    st.markdown("---")
    if st.button("🔄 Atualizar dados da Copa", use_container_width=True):
        st.session_state.pop("worldcup_data", None)
        st.rerun()

    if st.button("↩️ Restaurar aposta original", use_container_width=True):
        restore_default()
        st.rerun()

    st.markdown("---")
    st.markdown("**Exportar**")
    csv_buf = export_snapshots_csv()
    if csv_buf:
        st.download_button(
            "📥 Exportar histórico CSV",
            data=csv_buf,
            file_name="historico_betano.csv",
            mime="text/csv",
            use_container_width=True,
        )

    txt = export_summary_txt(None, "Aguardando")
    txt_buf = txt.encode("utf-8")
    st.download_button(
        "📤 Exportar resumo TXT",
        data=txt_buf,
        file_name="resumo_aposta.txt",
        mime="text/plain",
        use_container_width=True,
    )

# ── Hero ──────────────────────────────────────────────
st.markdown(
    """
    <div class="hero-card" style="margin-bottom: 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="
                    width:50px;height:50px;display:grid;place-items:center;border-radius:18px;
                    background:linear-gradient(135deg,#fff,#72d7ff 48%,#9b7cff);
                    color:#081018;font-weight:900;font-size:1.2rem;letter-spacing:-0.06em;
                    box-shadow:0 12px 34px rgba(114,215,255,0.18);
                ">26</div>
                <div>
                    <strong style="font-size:1rem;">Aposta Copa 2026</strong>
                    <div style="font-size:0.75rem;color:rgba(248,248,252,0.55);">Brasil + Argentina semis • Espanha quartas • 4 gigantes nas oitavas</div>
                </div>
            </div>
        </div>
        <div style="margin-top:10px;">
            <span class="pill">Odd 75</span>
            <span class="pill">Stake R$ 10</span>
            <span class="pill">Copa 2026</span>
        </div>
        <h1 class="title-main" style="margin-top:18px;">O sonho ainda<br>está vivo?</h1>
        <p class="subtitle">Painel premium para acompanhar se a múltipla da Copa 2026 continua viva.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ── API Status ────────────────────────────────────────
worldcup_data = fetch_worldcup_data()
api_live = worldcup_data.get("live", False)
api_fallback = worldcup_data.get("fallback", True)
generated_at = worldcup_data.get("generatedAt", "")
games_count = len(worldcup_data.get("games", []))
api_errors = worldcup_data.get("errors", [])

col_api1, col_api2, col_api3, _ = st.columns([1, 1, 1, 3])
with col_api1:
    if api_live:
        st.markdown(f'<span class="pill ok">API Online • {games_count} jogos</span>', unsafe_allow_html=True)
    elif api_fallback:
        st.markdown(f'<span class="pill warn">Fallback ativo • {games_count} jogos base</span>', unsafe_allow_html=True)
    else:
        st.markdown(f'<span class="pill danger">API offline</span>', unsafe_allow_html=True)
with col_api2:
    if generated_at:
        st.markdown(f'<span class="pill">Atualizado {generated_at}</span>', unsafe_allow_html=True)
with col_api3:
    if api_errors:
        with st.expander("⚠️ Erros da API"):
            for e in api_errors:
                st.caption(e)

# ── Ticket Overview ───────────────────────────────────
st.markdown("### 🎫 Visão geral do bilhete")

payout = bet["stake"] * bet["odd"]
profit = payout - bet["stake"]
implied = 1.0 / bet["odd"] if bet["odd"] > 0 else 0

# Assess each leg
assessments = []
for leg in bet["legs"]:
    team_key = _normalize_team(leg.get("team", leg.get("display", "")))
    assessment = assess_team(team_key, leg["target"], worldcup_data)
    prob, note = estimate_team_probability(
        team_key, leg["target"], assessment,
        form_multiplier=1.0,
    )

    if assessment["reached_target"]:
        status = "achieved"
        status_label = "Cumpriu"
    elif assessment["eliminated"]:
        status = "failed"
        status_label = "Falhou"
    else:
        status = "pending"
        status_label = "Pendente"
        if assessment["highest_rank"] > 0:
            status = "live"
            status_label = "Viva"

    assessments.append({
        "leg": leg,
        "team_key": team_key,
        "target": leg["target"],
        "highest": assessment["highest"],
        "highest_rank": assessment["highest_rank"],
        "reached_target": assessment["reached_target"],
        "eliminated": assessment["eliminated"],
        "status": status,
        "status_label": status_label,
        "probability": prob,
        "note": note,
    })

model_result = calculate(
    assessments,
    stake=bet["stake"],
    odd=bet["odd"],
    profile=bet["profile"],
    cashout_margin=bet["cashout_margin"],
    correlation_weight=bet["correlation_weight"],
    worldcup_data=worldcup_data,
)

achieved = sum(1 for a in assessments if a["status"] == "achieved")
failed = sum(1 for a in assessments if a["status"] == "failed")
total_legs = len(assessments)

if total_legs and achieved == total_legs:
    status_label = "Ganhou"
    status_color = "ok"
elif failed > 0:
    status_label = "Perdeu"
    status_color = "danger"
elif any(a["status"] == "risk" for a in assessments):
    status_label = "Em risco"
    status_color = "warn"
else:
    status_label = "Vivo"
    status_color = "ok"

# Metrics row
m1, m2, m3, m4, m5 = st.columns(5)
with m1:
    fair_odd_display = f"{model_result['fair_odd']:.2f}" if model_result["fair_odd"] != float("inf") else "∞"
    render_glass_card("Odd justa do modelo", fair_odd_display, "Atualizada com dados da Copa")
with m2:
    render_glass_card("Probabilidade modelada", f"{model_result['probability']*100:.2f}%", f"Break-even odd {bet['odd']:.2f}: {implied*100:.2f}%")
with m3:
    render_glass_card("Valor justo estimado", f"R$ {model_result['fair_value']:.2f}", "Valor matemático do bilhete")
with m4:
    ev_color = "style='color:#34d399'" if model_result["ev"] > 0 else ""
    render_glass_card("EV do modelo", f'<span {ev_color}>R$ {model_result["ev"]:.2f}</span>', "Valor esperado vs stake")
with m5:
    render_glass_card("Cashout justo", f'R$ {model_result["fair_cashout"]:.2f}', f"Após margem de {cashout_margin}%")

m6, m7, m8, m9, m10 = st.columns(5)
with m6:
    render_glass_card("Stake", f'R$ {bet["stake"]:.2f}')
with m7:
    render_glass_card("Odd contratada", f'{bet["odd"]:.2f}')
with m8:
    render_glass_card("Retorno potencial", f'R$ {payout:.2f}')
with m9:
    render_glass_card("Lucro líquido", f'R$ {profit:.2f}')
with m10:
    badge_html = f'<span class="pill {status_color}" style="font-size:1.1rem;padding:10px 20px;">{status_label}</span>'
    render_glass_card("Status geral", badge_html, f"{achieved}/{total_legs} condições cumpridas")

# ── Editable Bet Parameters ───────────────────────────
st.markdown("### ✏️ Editar aposta")
col_e1, col_e2, col_e3, col_e4 = st.columns(4)
with col_e1:
    new_stake = st.number_input("Stake (R$)", min_value=0.0, step=1.0, value=bet["stake"], format="%.2f", key="stake_input")
    if new_stake != bet["stake"]:
        bet["stake"] = new_stake
        st.session_state.bet_updated = True
with col_e2:
    new_odd = st.number_input("Odd contratada", min_value=1.0, step=0.5, value=bet["odd"], format="%.2f", key="odd_input")
    if new_odd != bet["odd"]:
        bet["odd"] = new_odd
        st.session_state.bet_updated = True
with col_e3:
    new_base = st.number_input("Chance base (%)", min_value=1, max_value=100, value=bet.get("base_chance", 50), key="base_chance")
    bet["base_chance"] = new_base
with col_e4:
    new_house = st.number_input("Margem da casa (%)", min_value=0.0, max_value=50.0, step=0.5, value=bet.get("house_margin", 6.0), format="%.1f", key="house_margin")
    bet["house_margin"] = new_house / 100.0

# ── Checklist Table ───────────────────────────────────
st.markdown("### 📋 Checklist da aposta")
table_data = []
for a in assessments:
    leg = a["leg"]
    team_label = leg.get("display", leg.get("team", ""))
    target_stage = STAGE_LABELS.get(a["target"], a["target"])
    current_stage = STAGE_LABELS.get(a["highest"], "Aguardando")
    prob_pct = a["probability"] * 100

    if a["status"] == "achieved":
        risk = "✅ Baixo"
        obs = "Condição cumprida"
    elif a["status"] == "failed":
        risk = "❌ Perdeu"
        obs = f"Eliminada antes de {target_stage}"
    elif a["probability"] < 0.10:
        risk = "🔴 Alto"
        obs = "Probabilidade muito baixa"
    elif a["probability"] < 0.30:
        risk = "🟡 Médio"
        obs = "Atenção necessária"
    else:
        risk = "🟢 Baixo"
        obs = "Caminho viável"

    table_data.append({
        "Seleção": team_label,
        "Fase necessária": target_stage,
        "Fase detectada": current_stage,
        "Prob.": f"{prob_pct:.1f}%",
        "Status": a["status_label"],
        "Risco": risk,
        "Observação": obs,
    })

df = pd.DataFrame(table_data)
st.dataframe(
    df,
    use_container_width=True,
    hide_index=True,
    column_config={
        "Status": st.column_config.TextColumn("Status", width="small"),
        "Prob.": st.column_config.TextColumn("Prob.", width="small"),
    },
)

# ── Add / Remove Legs ─────────────────────────────────
with st.expander("➕ Adicionar / Remover seleções"):
    col_l1, col_l2, col_l3 = st.columns([2, 2, 1])
    with col_l1:
        new_team = st.text_input("Nome da seleção", placeholder="ex: Holanda")
    with col_l2:
        stage_options = {v: k for k, v in STAGE_LABELS.items() if k != "GROUP"}
        new_target = st.selectbox("Fase necessária", options=list(stage_options.keys()))
    with col_l3:
        st.markdown("###")
        if st.button("Adicionar", use_container_width=True):
            if new_team.strip():
                st.session_state.bet["legs"].append({
                    "id": f"leg-{datetime.now().timestamp()}",
                    "team": new_team.strip(),
                    "display": new_team.strip(),
                    "target": stage_options[new_target],
                })
                st.session_state.bet_updated = True
                st.rerun()

    st.markdown("**Seleções atuais:**")
    for i, leg in enumerate(st.session_state.bet["legs"]):
        c1, c2, c3 = st.columns([2, 2, 1])
        with c1:
            st.text(leg.get("display", leg.get("team", "")))
        with c2:
            st.text(STAGE_LABELS.get(leg["target"], leg["target"]))
        with c3:
            if st.button("Remover", key=f"rm_leg_{i}"):
                st.session_state.bet["legs"].pop(i)
                st.session_state.bet_updated = True
                st.rerun()

# ── Probability Radar ─────────────────────────────────
st.markdown("### 📊 Radar de probabilidade por seleção")
sorted_assessments = sorted(assessments, key=lambda a: a["probability"])
for a in sorted_assessments:
    leg = a["leg"]
    team_label = leg.get("display", leg.get("team", ""))
    render_probability_bar(
        team_label,
        a["probability"],
        detail=f"{a['note']} • Precisa de {STAGE_LABELS.get(a['target'], a['target'])}",
    )

# ── Model Details ─────────────────────────────────────
st.markdown("### 🧠 Detalhes do modelo")
col_d1, col_d2, col_d3, col_d4 = st.columns(4)
with col_d1:
    render_glass_card("Confiança", f"{model_result['confidence']:.0f}%", model_result["data_quality"])
with col_d2:
    render_glass_card("Perfil", bet["profile"].capitalize(), "Ajuste de perfil")
with col_d3:
    render_glass_card("Fator correlação", f"{model_result['correlation_factor']:.4f}", "Penalidade por favoritos")
with col_d4:
    render_glass_card("Fator perfil", f"{model_result['profile_factor']:.2f}", "Multiplicador do perfil")

# ── Betano History ────────────────────────────────────
st.markdown("### 📜 Histórico Betano (manual)")
st.caption(
    "A Betano não tem API pública gratuita para consultar um bilhete específico. "
    "Registre manualmente a odd/cashout que você vê na Betano para comparar com o modelo."
)

col_h1, col_h2, col_h3 = st.columns([2, 2, 1])
with col_h1:
    snap_odd = st.number_input("Odd atual / cashout", min_value=0.0, step=0.5, format="%.2f", key="snap_odd")
with col_h2:
    snap_cash = st.number_input("Valor cashout (R$)", min_value=0.0, step=1.0, format="%.2f", key="snap_cash")
with col_h3:
    st.markdown("###")
    if st.button("💾 Salvar snapshot", use_container_width=True, type="primary"):
        if snap_odd > 0 or snap_cash > 0:
            add_snapshot(snap_odd if snap_odd > 0 else None, snap_cash if snap_cash > 0 else None, model_result)
            st.rerun()

if st.button("🗑️ Limpar histórico"):
    clear_snapshots()
    st.rerun()

if st.session_state.snapshots:
    for snap in st.session_state.snapshots:
        date_str = datetime.fromisoformat(snap["createdAt"]).strftime("%d/%m/%Y %H:%M")
        odd_text = f"{snap['odd']:.2f}" if snap.get("odd") else "—"
        cash_text = f"R$ {snap['cashout']:.2f}" if snap.get("cashout") else "—"
        fair_text = f"R$ {snap['fairCashout']:.2f}" if snap.get("fairCashout") else "—"
        model_odd = f"{snap['modelOdd']:.2f}" if snap.get("modelOdd") else "—"
        model_prob = f"{snap['modelProbability']*100:.2f}%" if snap.get("modelProbability") else "—"

        st.markdown(
            f"""
            <div class="snapshot-item">
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                    <small>{date_str}</small>
                    <strong>{snap.get('note', 'Pendente')}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-top:4px;">
                    <small>Betano</small>
                    <strong>Odd {odd_text} • Cashout {cash_text}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-top:4px;">
                    <small>Modelo</small>
                    <strong>Odd {model_odd} • {model_prob}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-top:4px;">
                    <small>Cashout justo</small>
                    <strong>{fair_text}</strong>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
else:
    st.info(
        "Nenhum snapshot registrado ainda. Quando você acessar a Betano, anote "
        "a odd atual e o valor de cashout e salve aqui."
    )

# ── Footer ────────────────────────────────────────────
render_footer()
