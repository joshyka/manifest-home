"""theme.py — Premium forest green & warm white design tokens + CSS injection."""

PRIMARY       = "#2E7D5E"
PRIMARY_DARK  = "#1B4D3E"
PRIMARY_LIGHT = "#E6F4EF"
ACCENT        = "#C0621C"
ACCENT_LIGHT  = "#FDF0E6"
BG            = "#FAFAF7"
CARD_BG       = "#FFFFFF"
BORDER        = "#E2E8F0"
TEXT_MAIN     = "#1A2E1F"
TEXT_MUTED    = "#6B7280"
SUCCESS       = "#2E7D5E"
WARNING       = "#C0621C"
DANGER        = "#B03A2E"
CHART_COLORS  = ["#2E7D5E", "#C0621C", "#1A6FB5", "#7C3AED", "#0E7490"]

CSS = f"""
<style>
/* ── Base ──────────────────────────────────────────────────────────────── */
html, body, [data-testid="stAppViewContainer"] {{
    background-color: {BG} !important;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}}
/* Tighten default Streamlit top padding */
[data-testid="stAppViewContainer"] > .main > div {{
    padding-top: 1.5rem !important;
}}
[data-testid="stSidebar"] {{
    background: {PRIMARY_DARK} !important;
    border-right: none !important;
}}
[data-testid="stSidebar"] * {{
    color: #F0FDF4 !important;
}}
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h1,
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h2,
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3 {{
    color: #FFFFFF !important;
}}
[data-testid="stSidebar"] hr {{
    border-color: rgba(255,255,255,0.12) !important;
}}

/* ── Tabs — always visible, correct colours ─────────────────────────────── */
[data-testid="stTabs"] [role="tablist"] {{
    overflow: visible !important;
    flex-wrap: nowrap !important;
    border-bottom: 2px solid #E2E8F0 !important;
}}
[data-testid="stTabs"] button[role="tab"] {{
    flex-shrink: 0 !important;
    white-space: nowrap !important;
    color: #6B7280 !important;
    font-weight: 500 !important;
    font-size: 0.92rem !important;
    background: transparent !important;
    border: none !important;
    padding: 10px 18px !important;
    cursor: pointer !important;
    opacity: 1 !important;
    visibility: visible !important;
}}
[data-testid="stTabs"] button[role="tab"] p,
[data-testid="stTabs"] button[role="tab"] span,
[data-testid="stTabs"] button[role="tab"] div {{
    color: #6B7280 !important;
    opacity: 1 !important;
    visibility: visible !important;
}}
[data-testid="stTabs"] button[role="tab"][aria-selected="true"] {{
    color: {PRIMARY} !important;
    font-weight: 700 !important;
    border-bottom: 2px solid {PRIMARY} !important;
}}
[data-testid="stTabs"] button[role="tab"][aria-selected="true"] p,
[data-testid="stTabs"] button[role="tab"][aria-selected="true"] span,
[data-testid="stTabs"] button[role="tab"][aria-selected="true"] div {{
    color: {PRIMARY} !important;
}}
[data-testid="stTabs"] button[role="tab"]:hover {{
    color: {PRIMARY} !important;
    background: #F0F9F5 !important;
}}
[data-testid="stTabs"] button[role="tab"]:hover p,
[data-testid="stTabs"] button[role="tab"]:hover span,
[data-testid="stTabs"] button[role="tab"]:hover div {{
    color: {PRIMARY} !important;
}}

/* ── Sidebar nav links ──────────────────────────────────────────────────── */
[data-testid="stSidebarNavLink"] {{
    border-radius: 8px !important;
    margin-bottom: 2px !important;
    padding: 8px 12px !important;
    font-size: 0.9rem !important;
    font-weight: 500 !important;
    color: #D1FAE5 !important;
    transition: background 0.15s !important;
}}
[data-testid="stSidebarNavLink"]:hover {{
    background: rgba(255,255,255,0.1) !important;
}}
[data-testid="stSidebarNavLink"][aria-current="page"] {{
    background: rgba(255,255,255,0.15) !important;
    font-weight: 700 !important;
}}
[data-testid="stSidebar"] [role="radiogroup"] label {{
    padding: 9px 12px !important;
    border-radius: 8px !important;
    margin-bottom: 2px !important;
    transition: background 0.15s !important;
    color: #D1FAE5 !important;
    font-size: 0.9rem !important;
    font-weight: 500 !important;
}}
[data-testid="stSidebar"] [role="radiogroup"] label:hover {{
    background: rgba(255,255,255,0.1) !important;
}}

/* ── Main content header ────────────────────────────────────────────────── */
.page-header {{
    background: linear-gradient(135deg, {PRIMARY} 0%, {PRIMARY_DARK} 100%);
    padding: 28px 32px;
    border-radius: 16px;
    margin-bottom: 28px;
    color: white;
}}
.page-header h1 {{
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.02em;
    color: white !important;
}}
.page-header p {{
    font-size: 0.9rem;
    opacity: 0.8;
    margin: 6px 0 0;
    color: white !important;
}}

/* ── Metric cards ───────────────────────────────────────────────────────── */
.metric-card {{
    background: {CARD_BG};
    border: 1px solid {BORDER};
    border-radius: 16px;
    padding: 22px 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 8px rgba(0,0,0,0.04);
    height: 100%;
}}
.metric-card .label {{
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: {TEXT_MUTED};
    margin-bottom: 8px;
}}
.metric-card .value {{
    font-size: 1.85rem;
    font-weight: 800;
    color: {TEXT_MAIN};
    line-height: 1.1;
    letter-spacing: -0.02em;
}}
.metric-card .sub {{
    font-size: 0.76rem;
    color: {TEXT_MUTED};
    margin-top: 6px;
}}
.metric-card .progress-outer {{
    background: #E5E7EB;
    border-radius: 99px;
    height: 6px;
    margin-top: 12px;
    overflow: hidden;
}}
.metric-card .progress-inner {{
    height: 100%;
    border-radius: 99px;
    background: {PRIMARY};
    transition: width 0.5s ease;
}}

/* ── Alert banners ──────────────────────────────────────────────────────── */
.alert {{
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 0.88rem;
    margin-bottom: 10px;
    border-left: 4px solid;
}}
.alert-warning {{
    background: {ACCENT_LIGHT};
    border-color: {ACCENT};
    color: {ACCENT};
}}
.alert-success {{
    background: {PRIMARY_LIGHT};
    border-color: {PRIMARY};
    color: {PRIMARY};
}}
.alert-danger {{
    background: #FDECEA;
    border-color: {DANGER};
    color: {DANGER};
}}
.alert-info {{
    background: #EFF6FF;
    border-color: #1A6FB5;
    color: #1A6FB5;
}}

/* ── Section cards ──────────────────────────────────────────────────────── */
.section-card {{
    background: {CARD_BG};
    border: 1px solid {BORDER};
    border-radius: 16px;
    padding: 24px 26px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}}
.section-card h3 {{
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: {TEXT_MUTED};
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid {BORDER};
}}

/* ── Viewing cards ──────────────────────────────────────────────────────── */
.viewing-card {{
    border: 1.5px solid {BORDER};
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 12px;
    background: {CARD_BG};
    transition: box-shadow 0.15s;
}}
.viewing-card:hover {{
    box-shadow: 0 4px 14px rgba(46,125,94,0.1);
    border-color: {PRIMARY};
}}
.viewing-card .vc-address {{
    font-weight: 700;
    font-size: 0.98rem;
    color: {TEXT_MAIN};
}}
.viewing-card .vc-meta {{
    font-size: 0.8rem;
    color: {TEXT_MUTED};
    margin-top: 3px;
}}

/* ── Upcoming reminder cards ────────────────────────────────────────────── */
.upcoming-card {{
    border: 1.5px solid {PRIMARY};
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 10px;
    background: {PRIMARY_LIGHT};
}}
.upcoming-card .uc-title {{
    font-weight: 700;
    color: {PRIMARY_DARK};
    font-size: 0.95rem;
}}
.upcoming-card .uc-meta {{
    font-size: 0.8rem;
    color: {TEXT_MUTED};
    margin-top: 4px;
}}

/* ── Badge chips ────────────────────────────────────────────────────────── */
.badge {{
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.03em;
}}
.badge-green {{ background:{PRIMARY_LIGHT}; color:{PRIMARY}; }}
.badge-orange {{ background:{ACCENT_LIGHT}; color:{ACCENT}; }}
.badge-red {{ background:#FDECEA; color:{DANGER}; }}
.badge-blue {{ background:#EFF6FF; color:#1A6FB5; }}
.badge-gray {{ background:#F3F4F6; color:{TEXT_MUTED}; }}

/* ── Checklist items ────────────────────────────────────────────────────── */
.chk-phase {{
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: {PRIMARY};
    margin: 18px 0 8px;
    padding-bottom: 4px;
    border-bottom: 2px solid {PRIMARY_LIGHT};
}}
.chk-item {{
    padding: 9px 12px;
    border-radius: 8px;
    margin-bottom: 4px;
    font-size: 0.88rem;
    border: 1px solid {BORDER};
    background: {CARD_BG};
}}
.chk-item.done {{
    background: {PRIMARY_LIGHT};
    border-color: {PRIMARY};
    text-decoration: line-through;
    color: {TEXT_MUTED};
}}

/* ── Area rating stars ──────────────────────────────────────────────────── */
.star-filled {{ color: #F59E0B; font-size: 1.1rem; }}
.star-empty  {{ color: #D1D5DB; font-size: 1.1rem; }}

/* ── Streamlit overrides ────────────────────────────────────────────────── */
[data-testid="stMetric"] {{
    background: {CARD_BG};
    border: 1px solid {BORDER};
    border-radius: 16px;
    padding: 20px 22px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}}
div[data-testid="stMetricValue"] > div {{
    font-size: 1.65rem !important;
    font-weight: 800 !important;
    color: {TEXT_MAIN} !important;
    letter-spacing: -0.02em !important;
}}
div[data-testid="stMetricLabel"] > div {{
    font-size: 0.72rem !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.07em !important;
    color: {TEXT_MUTED} !important;
}}
div[data-testid="stMetricDelta"] > div {{
    font-size: 0.76rem !important;
}}
.stButton > button,
[data-testid="stDownloadButton"] > button {{
    background: {PRIMARY} !important;
    color: white !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    font-size: 0.88rem !important;
    padding: 7px 18px !important;
    transition: background 0.15s, box-shadow 0.15s !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
}}
.stButton > button:hover,
[data-testid="stDownloadButton"] > button:hover {{
    background: {PRIMARY_DARK} !important;
    box-shadow: 0 3px 10px rgba(46,125,94,0.25) !important;
}}
/* ── Form submit (Save) buttons — always green ──────────────────────────── */
[data-testid="stFormSubmitButton"] > button {{
    background: {PRIMARY} !important;
    color: white !important;
    border: none !important;
    border-radius: 9px !important;
    font-weight: 700 !important;
    padding: 9px 28px !important;
    font-size: 0.95rem !important;
    letter-spacing: 0.01em !important;
    transition: background 0.15s, box-shadow 0.15s !important;
    box-shadow: 0 2px 8px rgba(46,125,94,0.25) !important;
}}
[data-testid="stFormSubmitButton"] > button:hover {{
    background: {PRIMARY_DARK} !important;
    box-shadow: 0 4px 14px rgba(46,125,94,0.35) !important;
}}
.stTextInput > div > div > input,
.stNumberInput > div > div > input,
.stSelectbox > div > div,
.stDateInput > div > div > input,
.stTextArea > div > div > textarea {{
    border-radius: 8px !important;
    border: 1.5px solid {BORDER} !important;
    font-size: 0.9rem !important;
}}
.stTextInput > div > div > input:focus,
.stNumberInput > div > div > input:focus {{
    border-color: {PRIMARY} !important;
    box-shadow: 0 0 0 2px rgba(46,125,94,0.15) !important;
}}
h1, h2, h3 {{ color: {TEXT_MAIN} !important; }}
/* Protect white headings inside green gradient hero/header blocks */
[style*="background:linear-gradient"] h1,
[style*="background: linear-gradient"] h1,
.page-header h1 {{ color: #FFFFFF !important; }}
[data-testid="stDataFrame"] {{ border-radius: 10px; overflow: hidden; }}
.stProgress > div > div > div {{ background: {PRIMARY} !important; }}
footer {{ visibility: hidden; }}
#MainMenu {{ visibility: hidden; }}
</style>
"""

def inject_css():
    import streamlit as st
    st.markdown(CSS, unsafe_allow_html=True)

def metric_card(label: str, value: str, sub: str = "", progress_pct: float = None):
    prog_html = ""
    if progress_pct is not None:
        pct = min(100, max(0, progress_pct))
        color = "#2E7D5E" if pct >= 100 else ("#C0621C" if pct < 50 else "#2E7D5E")
        prog_html = f"""<div class="progress-outer"><div class="progress-inner" style="width:{pct}%;background:{color}"></div></div>"""
    return f"""
    <div class="metric-card">
        <div class="label">{label}</div>
        <div class="value">{value}</div>
        {f'<div class="sub">{sub}</div>' if sub else ''}
        {prog_html}
    </div>"""

def page_header(title: str, subtitle: str = ""):
    return f"""
    <div class="page-header">
        <h1>{title}</h1>
        {f'<p>{subtitle}</p>' if subtitle else ''}
    </div>"""

def alert(text: str, kind: str = "info"):
    return f'<div class="alert alert-{kind}">{text}</div>'

def badge(text: str, kind: str = "green"):
    return f'<span class="badge badge-{kind}">{text}</span>'
