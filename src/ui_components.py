import streamlit as st

CSS = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    html, body, [data-testid="stAppViewContainer"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: #07070d;
        color: #f8f8fc;
    }

    .stApp {
        background: #07070d;
    }

    .stApp > header {
        display: none !important;
    }

    .main > .block-container {
        padding: 1.5rem 2rem 4rem;
        max-width: 1500px;
    }

    /* Hide Streamlit branding */
    #MainMenu, footer, .stDeployButton {
        display: none !important;
    }

    .glass-card {
        background: linear-gradient(145deg, rgba(255,255,255,0.125), rgba(255,255,255,0.045));
        border: 1px solid rgba(255,255,255,0.16);
        box-shadow: 0 30px 90px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12);
        backdrop-filter: blur(24px) saturate(140%);
        -webkit-backdrop-filter: blur(24px) saturate(140%);
        border-radius: 26px;
        padding: 22px 24px;
    }

    .hero-card {
        border-radius: 34px;
        padding: 28px 30px 24px;
        position: relative;
        overflow: hidden;
        background:
            radial-gradient(circle at 70% 48%, rgba(255,255,255,0.22), transparent 16%),
            radial-gradient(circle at 90% 18%, rgba(114,215,255,0.18), transparent 26%),
            linear-gradient(115deg, rgba(155,124,255,0.16), transparent 40%, rgba(114,215,255,0.12));
        border: 1px solid rgba(255,255,255,0.20);
    }

    .metric-value {
        font-size: 2.6rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        line-height: 1;
        margin-top: 6px;
    }

    .metric-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: rgba(248,248,252,0.7);
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 800;
    }

    .status-achieved {
        background: rgba(52, 211, 153, 0.18);
        color: #bfffe6;
        border: 1px solid rgba(52, 211, 153, 0.32);
    }

    .status-failed {
        background: rgba(255, 93, 93, 0.18);
        color: #ffd1d1;
        border: 1px solid rgba(255, 93, 93, 0.32);
    }

    .status-risk {
        background: rgba(255, 209, 102, 0.16);
        color: #ffe7a5;
        border: 1px solid rgba(255, 209, 102, 0.30);
    }

    .status-pending {
        background: rgba(155, 124, 255, 0.16);
        color: #e4dbff;
        border: 1px solid rgba(155, 124, 255, 0.30);
    }

    .status-live {
        background: rgba(114, 215, 255, 0.14);
        color: #d7f7ff;
        border: 1px solid rgba(114, 215, 255, 0.30);
    }

    .title-main {
        font-size: clamp(2.2rem, 6vw, 4.5rem);
        font-weight: 900;
        letter-spacing: -0.07em;
        line-height: 0.9;
        margin: 0 0 0.25rem;
    }

    .subtitle {
        font-size: 1.05rem;
        color: rgba(248,248,252,0.68);
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .pill {
        display: inline-block;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.85);
        border-radius: 999px;
        padding: 6px 14px;
        font-size: 0.75rem;
        font-weight: 800;
        white-space: nowrap;
    }

    .pill::before {
        content: "";
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 7px;
        border-radius: 999px;
        background: rgba(255,255,255,0.52);
        vertical-align: middle;
    }

    .pill.ok::before { background: #34d399; box-shadow: 0 0 12px #34d399; }
    .pill.warn::before { background: #ffd166; box-shadow: 0 0 12px #ffd166; }
    .pill.danger::before { background: #ff5d5d; box-shadow: 0 0 12px #ff5d5d; }

    .prob-bar-bg {
        height: 8px;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        overflow: hidden;
        margin-top: 6px;
    }

    .prob-bar-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #9b7cff, #72d7ff, #34d399);
        transition: width 0.4s ease;
    }

    .snapshot-item {
        padding: 14px;
        border-radius: 18px;
        background: rgba(255,255,255,0.065);
        border: 1px solid rgba(255,255,255,0.08);
        margin-bottom: 8px;
    }

    .snapshot-item small {
        color: rgba(248,248,252,0.55);
    }

    .divider-custom {
        height: 1px;
        background: rgba(255,255,255,0.08);
        margin: 1.5rem 0;
    }

    .stButton > button {
        border-radius: 999px !important;
        font-weight: 700 !important;
        border: 1px solid rgba(255,255,255,0.16) !important;
        background: rgba(255,255,255,0.10) !important;
        color: #f8f8fc !important;
        padding: 0.35rem 1.2rem !important;
        transition: all 0.18s ease !important;
    }

    .stButton > button:hover {
        transform: translateY(-1px);
        background: rgba(255,255,255,0.18) !important;
        border-color: rgba(255,255,255,0.30) !important;
    }

    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #ffffff, #72d7ff) !important;
        color: #090910 !important;
        border-color: rgba(255,255,255,0.44) !important;
        box-shadow: 0 8px 24px rgba(114,215,255,0.15) !important;
    }

    .stTextInput > div > div, .stNumberInput > div > div, .stSelectbox > div > div {
        border-radius: 14px !important;
        background: rgba(255,255,255,0.10) !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        color: #f8f8fc !important;
    }

    .stDataFrame {
        border-radius: 18px !important;
        overflow: hidden !important;
    }

    .stDataFrame table {
        font-size: 0.85rem;
    }

    h1, h2, h3 {
        color: #f8f8fc !important;
        font-weight: 800 !important;
        letter-spacing: -0.03em !important;
    }

    .element-container {
        margin-bottom: 0.5rem;
    }

    .row-widget.stRadio {
        flex-direction: row;
        gap: 8px;
    }

    footer {
        margin-top: 3rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(255,255,255,0.06);
        text-align: center;
        color: rgba(248,248,252,0.4);
        font-size: 0.75rem;
    }

    @media (max-width: 768px) {
        .main > .block-container {
            padding: 1rem;
        }
    }
</style>
"""


def inject_css():
    st.markdown(CSS, unsafe_allow_html=True)


def render_glass_card(label, value, help_text="", extra=""):
    st.markdown(
        f"""
        <div class="glass-card" style="min-height: 120px; display: flex; flex-direction: column; justify-content: center;">
            <div class="metric-label">{label}</div>
            <div class="metric-value">{value}</div>
            {f'<div style="font-size:0.75rem;color:rgba(248,248,252,0.5);margin-top:6px;font-weight:600;">{help_text}</div>' if help_text else ''}
            {extra}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_status_badge(status, label):
    cls = {
        "achieved": "status-achieved",
        "failed": "status-failed",
        "risk": "status-risk",
        "pending": "status-pending",
        "live": "status-live",
    }.get(status, "status-pending")
    st.markdown(
        f'<span class="status-badge {cls}">{label}</span>',
        unsafe_allow_html=True,
    )


def render_probability_bar(label, prob, detail=""):
    pct = max(0, min(100, prob * 100))
    st.markdown(
        f"""
        <div style="margin-bottom: 10px;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                <strong>{label}</strong>
                <span style="color:rgba(248,248,252,0.6);font-weight:700;">{prob*100:.2f}%</span>
            </div>
            <div class="prob-bar-bg">
                <div class="prob-bar-fill" style="width:{pct}%"></div>
            </div>
            {f'<div style="font-size:0.7rem;color:rgba(248,248,252,0.45);margin-top:3px;">{detail}</div>' if detail else ''}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_glass_card_raw(content):
    st.markdown(
        f'<div class="glass-card">{content}</div>',
        unsafe_allow_html=True,
    )


def render_footer():
    st.markdown(
        """
        <footer>
            <strong>O sonho ainda está vivo?</strong> — Painel para acompanhamento de aposta da Copa 2026<br>
            Modelo estatístico estimativo — não substitui conferência oficial da Betano.<br>
            <span style="opacity:0.5;">Dados via worldcup26.ir • Fallback local quando API offline</span>
        </footer>
        """,
        unsafe_allow_html=True,
    )
