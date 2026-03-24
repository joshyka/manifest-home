"""
Manifesting My Home 
==================================================
Run with:  streamlit run Manifesting_My_Home.py
Data:      data/tracker.xlsx
"""
import datetime
import streamlit as st
import plotly.graph_objects as go
import pandas as pd
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from utils.theme import inject_css, metric_card, alert
from utils.data  import load_settings, load_viewings, load_upcoming, EXCEL_PATH, DATA_DIR
from utils.savings import get_projection, get_target, get_loan_status
from utils.auth  import require_pin

st.set_page_config(
    page_title="Manifesting My Home",
    page_icon="🏡",
    layout="wide",
    initial_sidebar_state="expanded",
)
inject_css()
require_pin()

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="text-align:center;padding:24px 12px 12px">
        <div style="font-size:1.55rem;margin-bottom:6px">🏡</div>
        <div style="font-weight:800;font-size:1.05rem;color:#FFFFFF;letter-spacing:-0.01em;line-height:1.3">
            Manifesting My Home
        </div>
    </div>
    <hr style="border-color:rgba(255,255,255,0.12);margin:10px 0 16px">
    """, unsafe_allow_html=True)

    try:
        _s        = load_settings()
        p1        = _s.get("p1_name", "")
        p2        = _s.get("p2_name", "")
        apt_price = int(_s.get("apartment_price", 0))
        down_pct  = float(_s.get("down_pct", 10))
        _target   = int(apt_price * down_pct / 100)
        _current  = int(_s.get("p1_current", 0)) + int(_s.get("p2_current", 0))
        _pct      = min(100, int(_current / _target * 100)) if _target > 0 else 0
        st.markdown(f"""
        <div style="padding:14px 16px;background:rgba(255,255,255,0.07);border-radius:12px;
                    margin-bottom:8px;border:1px solid rgba(255,255,255,0.1)">
            <div style="font-size:0.68rem;color:#6EE7B7;font-weight:700;letter-spacing:0.07em;
                        text-transform:uppercase;margin-bottom:8px">Buyers</div>
            <div style="font-weight:600;font-size:0.92rem;color:#fff;margin-bottom:12px">
                {p1 or "—"} &amp; {p2 or "—"}
            </div>
            <div style="font-size:0.68rem;color:#6EE7B7;font-weight:700;letter-spacing:0.07em;
                        text-transform:uppercase;margin-bottom:6px">Down Payment Progress</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
                <span style="font-size:0.85rem;font-weight:700;color:#fff">{_current:,.0f} kr</span>
                <span style="font-size:0.72rem;color:#A7F3D0">{_pct}%</span>
            </div>
            <div style="background:rgba(255,255,255,0.12);border-radius:99px;height:5px;overflow:hidden">
                <div style="width:{_pct}%;height:100%;background:#4ADE80;border-radius:99px"></div>
            </div>
            <div style="font-size:0.71rem;color:#86EFAC;margin-top:5px">
                Target: {_target:,.0f} kr
            </div>
        </div>
        """, unsafe_allow_html=True)
    except Exception:
        pass

# ── Main area ──────────────────────────────────────────────────────────────────
st.markdown("""
<div style="background:linear-gradient(135deg,#2E7D5E 0%,#1B4D3E 100%);
            border-radius:16px;padding:28px 32px;margin-bottom:28px">
    <h1 style="font-size:1.8rem;font-weight:900;color:#FFFFFF;margin:0;letter-spacing:-0.02em">
        Manifesting My Home
    </h1>
</div>
""", unsafe_allow_html=True)

# ── Load data ──────────────────────────────────────────────────────────────────
settings        = load_settings()
viewings        = load_viewings()
upcoming        = load_upcoming()

target          = get_target(settings)
current_savings = settings["p1_current"] + settings["p2_current"]
savings_pct     = (current_savings / target * 100) if target > 0 else 0
loan_status     = get_loan_status(settings)
now             = datetime.date.today()
total_viewings  = len(viewings) if not viewings.empty else 0

# ── Alerts ─────────────────────────────────────────────────────────────────────
if loan_status["status"] == "expired":
    st.markdown(alert("Your lånelöfte has <strong>expired</strong>. Renew it immediately before making any bids.", "danger"), unsafe_allow_html=True)
elif loan_status["status"] == "expiring_soon":
    st.markdown(alert(f"Your lånelöfte expires in <strong>{loan_status['days']} days</strong>. Contact your bank to renew soon.", "warning"), unsafe_allow_html=True)

if savings_pct >= 100:
    st.markdown(alert("You have reached your down payment target. Time to get serious about bidding.", "success"), unsafe_allow_html=True)

# ── KPI cards — row 1: savings ─────────────────────────────────────────────────
c1, c2, c3 = st.columns(3)
with c1:
    st.markdown(metric_card(
        "Combined Savings",
        f"{current_savings:,.0f} kr",
        f"Target: {target:,.0f} kr",
        savings_pct
    ), unsafe_allow_html=True)
with c2:
    st.markdown(metric_card(
        "Down Payment Target",
        f"{target:,.0f} kr",
        f"{settings['down_pct']}% of {settings['apartment_price']/1e6:.1f}M SEK"
    ), unsafe_allow_html=True)
with c3:
    pct = (current_savings / target * 100) if target > 0 else 0
    st.markdown(metric_card(
        "Progress",
        f"{pct:.1f}%",
        "Target met!" if pct >= 100 else f"{target - current_savings:,.0f} kr to go",
        pct
    ), unsafe_allow_html=True)

st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)

# ── KPI cards — row 2: loan + activity ─────────────────────────────────────────
c4, c5, c6 = st.columns(3)
with c4:
    loan_val = f"{settings['loan_amount']:,.0f} kr" if settings['loan_amount'] else "Not entered"
    if loan_status["status"] == "ok":
        loan_sub = f"Valid — {loan_status['days']} days left"
    elif loan_status["status"] == "expiring_soon":
        loan_sub = f"Expiring soon — {loan_status['days']} days left"
    elif loan_status["status"] == "expired":
        loan_sub = "Expired — renew immediately"
    else:
        loan_sub = "Enter in Savings page"
    st.markdown(metric_card("Lånelöfte Amount", loan_val, loan_sub), unsafe_allow_html=True)
with c5:
    st.markdown(metric_card(
        "Total Viewings",
        str(total_viewings),
        "apartments viewed so far"
    ), unsafe_allow_html=True)
with c6:
    bids_gone = 0
    if not viewings.empty and "outcome" in viewings.columns:
        bids_gone = int((viewings["outcome"] == "Went to bidding").sum())
    st.markdown(metric_card(
        "Bidding Attempts",
        str(bids_gone),
        "apartments you've bid on"
    ), unsafe_allow_html=True)

st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)

# ── Savings chart + Upcoming viewings ──────────────────────────────────────────
col_left, col_right = st.columns([3, 2])

with col_left:
    st.markdown('<div class="section-card"><h3>Savings Projection 2026</h3>', unsafe_allow_html=True)
    proj = get_projection(settings)
    proj_display = proj[proj["month_num"] >= now.month]
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=proj_display["month"], y=proj_display["cumulative"],
        mode="lines",
        name="Projected Savings",
        line=dict(color="#2E7D5E", width=2.5),
        fill="tozeroy", fillcolor="rgba(46,125,94,0.07)",
    ))
    fig.add_trace(go.Scatter(
        x=proj_display["month"], y=proj_display["target"],
        mode="lines",
        name=f"Target ({target:,.0f} kr)",
        line=dict(color="#C0621C", width=1.5, dash="dot"),
    ))
    cur = proj_display[proj_display["is_current"]]
    if not cur.empty:
        fig.add_trace(go.Scatter(
            x=cur["month"], y=cur["cumulative"],
            mode="markers", name="Today",
            marker=dict(size=10, color="#2E7D5E",
                        line=dict(color="white", width=2)),
            showlegend=False
        ))
        cur_month = cur["month"].iloc[0]
        all_months = proj_display["month"].tolist()
        ticktext = ["" if m == cur_month else m for m in all_months]
        xaxis_kwargs = dict(
            showgrid=False, tickfont=dict(size=9.5, color="#9CA3AF"),
            tickangle=0, fixedrange=True,
            tickmode="array", tickvals=all_months, ticktext=ticktext,
        )
        cur_annotation = [dict(
            x=cur_month, y=0, yref="paper", yshift=-16,
            text=f"<b>{cur_month}</b>",
            showarrow=False,
            font=dict(color="black", size=9.5, family="Inter, system-ui, sans-serif"),
            xanchor="center",
        )]
    else:
        xaxis_kwargs = dict(showgrid=False, tickfont=dict(size=9.5),
                            tickangle=0, fixedrange=True)
        cur_annotation = []
    fig.update_layout(
        plot_bgcolor="white", paper_bgcolor="white",
        margin=dict(l=0, r=0, t=6, b=30),
        height=260,
        legend=dict(orientation="h", yanchor="bottom", y=1.02,
                    xanchor="right", x=1, font=dict(size=10, color="#374151"),
                    bgcolor="rgba(0,0,0,0)"),
        xaxis=dict(**xaxis_kwargs),
        yaxis=dict(showgrid=True, gridcolor="#F4F4F4",
                   tickformat=",.0f", tickfont=dict(size=9.5),
                   fixedrange=True),
        font=dict(family="Inter, system-ui, sans-serif"),
        hovermode="x unified",
        annotations=cur_annotation,
    )
    st.plotly_chart(fig, width="stretch", config={"displayModeBar": False})
    st.markdown('</div>', unsafe_allow_html=True)

with col_right:
    st.markdown('<div class="section-card"><h3>Upcoming Viewings</h3>', unsafe_allow_html=True)
    if upcoming.empty or len(upcoming) == 0:
        st.markdown('<p style="color:#6B7280;font-size:0.87rem">No upcoming viewings. Add them in the Viewings page.</p>', unsafe_allow_html=True)
    else:
        try:
            upcoming["_dt"] = pd.to_datetime(upcoming["datetime"], errors="coerce")
            future = upcoming[upcoming["_dt"] >= pd.Timestamp.now()].sort_values("_dt").head(3)
        except Exception:
            future = upcoming.head(3)
        if future.empty:
            st.markdown('<p style="color:#6B7280;font-size:0.87rem">No upcoming viewings scheduled.</p>', unsafe_allow_html=True)
        else:
            for _, row in future.iterrows():
                try:
                    dt_obj  = pd.to_datetime(row["datetime"])
                    dt_str  = dt_obj.strftime("%a %d %b, %H:%M")
                    days    = (dt_obj.date() - now).days
                    days_str = "Today" if days == 0 else ("Tomorrow" if days == 1 else f"{days} days away")
                except Exception:
                    dt_str, days_str = str(row.get("datetime", "")), ""
                st.markdown(f"""
                <div class="upcoming-card">
                    <div class="uc-title">{row.get('address','')}</div>
                    <div class="uc-meta">{dt_str}{f' &nbsp;&middot;&nbsp; <strong style="color:#2E7D5E">{days_str}</strong>' if days_str else ''}</div>
                </div>""", unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

# ── Data management ────────────────────────────────────────────────────────────
st.markdown("<div style='height:32px'></div>", unsafe_allow_html=True)
st.markdown("<hr style='border-color:#E2E8F0;margin-bottom:20px'>", unsafe_allow_html=True)

if not EXCEL_PATH.exists():
    st.markdown("""
    <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:12px;
                padding:16px 20px;margin-bottom:16px">
        <div style="font-weight:700;color:#92400E;margin-bottom:4px">No data file on server</div>
        <div style="color:#B45309;font-size:0.85rem">
            Import your <strong>tracker.xlsx</strong> to restore your data,
            or use the app as-is and a fresh file will be created automatically.
        </div>
    </div>
    """, unsafe_allow_html=True)

col_dl, col_imp, col_cl = st.columns(3)

with col_dl:
    if EXCEL_PATH.exists():
        with open(EXCEL_PATH, "rb") as f:
            st.download_button(
                label="Download",
                data=f,
                file_name="tracker.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                width="stretch",
            )
    else:
        st.button("Download", disabled=True, width="stretch")

with col_imp:
    if st.button("Import", width="stretch"):
        st.session_state.show_import = not st.session_state.get("show_import", False)
        st.session_state.confirm_clear = False

with col_cl:
    if st.button("Clear", width="stretch"):
        st.session_state.confirm_clear = not st.session_state.get("confirm_clear", False)
        st.session_state.show_import = False

if st.session_state.get("show_import"):
    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
    uploaded = st.file_uploader(
        "Choose your tracker.xlsx file",
        type=["xlsx"],
        label_visibility="collapsed",
    )
    if uploaded is not None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(EXCEL_PATH, "wb") as f:
            f.write(uploaded.getvalue())
        st.session_state.show_import = False
        st.success("Data imported. Navigate to any page to see your data.")
        st.rerun()

if st.session_state.get("confirm_clear"):
    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
    st.markdown("""
    <div style="background:#E6F4EF;border:1.5px solid #A7D9C5;border-radius:10px;
                padding:12px 16px;font-size:0.88rem;color:#111827;margin-bottom:12px">
        This will delete all data from the server. Make sure you have downloaded first.
    </div>""", unsafe_allow_html=True)
    col_yes, col_no = st.columns(2)
    with col_yes:
        if st.button("Yes, delete it", width="stretch"):
            if EXCEL_PATH.exists():
                EXCEL_PATH.unlink()
            st.session_state.confirm_clear = False
            st.rerun()
    with col_no:
        if st.button("Cancel", width="stretch"):
            st.session_state.confirm_clear = False
            st.rerun()
