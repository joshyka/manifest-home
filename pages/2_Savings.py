import streamlit as st
import pandas as pd
from datetime import date
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.data import load_settings, save_settings
from utils.savings import get_projection, get_target, get_loan_status
from utils.theme import inject_css, page_header, alert
from utils.auth import require_pin

st.set_page_config(page_title="Savings", layout="wide")
inject_css()
require_pin()

st.markdown(page_header("Savings", "Track your down payment progress and loan promise"), unsafe_allow_html=True)

settings = load_settings()

# ── Edit mode toggle ──────────────────────────────────────────────────────────
if "savings_edit" not in st.session_state:
    st.session_state.savings_edit = False

col_hdr, col_spacer, col_btn = st.columns([5, 2, 1])
with col_btn:
    if not st.session_state.savings_edit:
        if st.button("Edit", width="stretch"):
            st.session_state.savings_edit = True
            st.rerun()
    else:
        if st.button("Cancel", width="stretch"):
            st.session_state.savings_edit = False
            st.rerun()

# ── VIEW mode — read-only summary cards ──────────────────────────────────────
if not st.session_state.savings_edit:
    target      = get_target(settings)
    combined    = settings["p1_current"] + settings["p2_current"]
    pct         = (combined / target * 100) if target > 0 else 0
    loan_st     = get_loan_status(settings)

    if loan_st["status"] == "expired":
        st.markdown(alert("Lanelöfte has <strong>expired</strong>. Renew immediately before making any bids.", "danger"), unsafe_allow_html=True)
    elif loan_st["status"] == "expiring_soon":
        st.markdown(alert(f"Lanelöfte expires in <strong>{loan_st['days']} days</strong>. Contact {settings['loan_bank'] or 'your bank'} to renew.", "warning"), unsafe_allow_html=True)
    elif loan_st["status"] == "ok":
        bank_str = f" via {settings['loan_bank']}" if settings["loan_bank"] and str(settings["loan_bank"]) != "nan" else ""
        st.markdown(alert(f"Lanelöfte valid for <strong>{loan_st['days']} more days</strong>{bank_str}. Amount: {settings['loan_amount']:,.0f} kr.", "success"), unsafe_allow_html=True)

    # Settings summary table
    st.markdown("#### Current Settings")
    rows = [
        ("Apartment Target Price", f"{settings['apartment_price']:,.0f} kr"),
        ("Down Payment %",         f"{settings['down_pct']}%  —  target {target:,.0f} kr"),
        (settings["p1_name"] + " — Current Savings",  f"{settings['p1_current']:,.0f} kr"),
        (settings["p1_name"] + " — Monthly Savings",  f"{settings['p1_monthly']:,.0f} kr"),
        (settings["p2_name"] + " — Current Savings",  f"{settings['p2_current']:,.0f} kr"),
        (settings["p2_name"] + " — Monthly Savings",  f"{settings['p2_monthly']:,.0f} kr"),
        ("Lanelöfte Amount",       f"{settings['loan_amount']:,.0f} kr" if settings['loan_amount'] else "Not entered"),
        ("Lanelöfte Expiry",       str(settings['loan_expiry']) if settings['loan_expiry'] and str(settings['loan_expiry']) not in ("","nan") else "Not entered"),
        ("Lender / Bank",          str(settings['loan_bank']) if settings['loan_bank'] and str(settings['loan_bank']) not in ("","nan") else "Not entered"),
    ]
    for label, value in rows:
        st.markdown(f"""
        <div style="display:flex;justify-content:space-between;padding:9px 0;
                    border-bottom:1px solid #E2E8F0;font-size:0.88rem">
            <span style="color:#6B7280;font-weight:500">{label}</span>
            <span style="font-weight:700;color:#1A2E1F">{value}</span>
        </div>""", unsafe_allow_html=True)

# ── EDIT mode — all inputs visible, Save/Cancel at top ───────────────────────
else:
    st.markdown("""
    <div style="background:#FFFBEB;border:1.5px solid #C0621C;border-radius:10px;
                padding:12px 16px;font-size:0.88rem;color:#92400E;margin-bottom:16px">
        You are in edit mode. Make your changes below and click Save to write to tracker.xlsx, or Cancel to discard.
    </div>""", unsafe_allow_html=True)

    with st.form("savings_form"):

        # ── Section 1: Apartment target ───────────────────────────────────────
        st.markdown("""
        <div style="background:#E6F4EF;border-left:4px solid #2E7D5E;border-radius:0 8px 8px 0;
                    padding:10px 14px;margin-bottom:14px">
            <strong style="color:#1B4D3E">Target Apartment</strong>
            <div style="color:#4B7C6A;font-size:0.83rem;margin-top:2px">
                The apartment price sets your down payment target. Sweden requires a minimum 10% down payment.
            </div>
        </div>""", unsafe_allow_html=True)
        col1, col2 = st.columns(2)
        with col1:
            apt_price = st.number_input(
                "Apartment Price (SEK)",
                value=int(settings["apartment_price"]),
                step=50000, min_value=0,
                help="The asking or target price of the apartment you want to buy.")
        with col2:
            down_pct = st.number_input(
                "Down Payment %",
                value=float(settings["down_pct"]),
                min_value=10.0, max_value=50.0, step=0.5,
                help="Swedish law requires minimum 10%. Enter 10 unless you plan to put in more.")

        # ── Section 2: Savings per person ─────────────────────────────────────
        st.markdown("""
        <div style="background:#E6F4EF;border-left:4px solid #2E7D5E;border-radius:0 8px 8px 0;
                    padding:10px 14px;margin:18px 0 14px">
            <strong style="color:#1B4D3E">Your Savings</strong>
            <div style="color:#4B7C6A;font-size:0.83rem;margin-top:2px">
                Enter each person's current total savings and how much they add each month.
                The projection chart uses these numbers to forecast when you'll hit the target.
            </div>
        </div>""", unsafe_allow_html=True)
        col3, col4, col5 = st.columns(3)
        with col3:
            p1_name = st.text_input("Name (Person 1)", value=settings["p1_name"],
                                    help="Display name used in charts and summaries.")
        with col4:
            p1_current = st.number_input(
                f"{settings['p1_name'] or 'Person 1'} — Current Savings (SEK)",
                value=int(settings["p1_current"]), step=10000, min_value=0,
                key="p1_current",
                help="Total savings available today, in SEK.")
        with col5:
            p1_monthly = st.number_input(
                f"{settings['p1_name'] or 'Person 1'} — Monthly Savings (SEK)",
                value=int(settings["p1_monthly"]), step=1000, min_value=0,
                key="p1_monthly",
                help="How much this person adds to savings each month.")

        col6, col7, col8 = st.columns(3)
        with col6:
            p2_name = st.text_input("Name (Person 2)", value=settings["p2_name"],
                                    help="Display name used in charts and summaries.")
        with col7:
            p2_current = st.number_input(
                f"{settings['p2_name'] or 'Person 2'} — Current Savings (SEK)",
                value=int(settings["p2_current"]), step=10000, min_value=0,
                key="p2_current",
                help="Total savings available today, in SEK.")
        with col8:
            p2_monthly = st.number_input(
                f"{settings['p2_name'] or 'Person 2'} — Monthly Savings (SEK)",
                value=int(settings["p2_monthly"]), step=1000, min_value=0,
                key="p2_monthly",
                help="How much this person adds to savings each month.")

        # ── Section 3: Lånelöfte ──────────────────────────────────────────────
        st.markdown("""
        <div style="background:#E6F4EF;border-left:4px solid #2E7D5E;border-radius:0 8px 8px 0;
                    padding:10px 14px;margin:18px 0 14px">
            <strong style="color:#1B4D3E">Lånelöfte (Loan Promise)</strong>
            <div style="color:#4B7C6A;font-size:0.83rem;margin-top:2px">
                Your lånelöfte is issued by your bank and is valid for 3–6 months.
                You need it before you can bid. Renew it before it expires or you won't be able to participate in budgivning.
            </div>
        </div>""", unsafe_allow_html=True)
        col9, col10, col11 = st.columns(3)
        with col9:
            loan_amount = st.number_input(
                "Loan Promise Amount (SEK)",
                value=int(settings["loan_amount"]), step=100000, min_value=0,
                help="The maximum mortgage amount your bank has approved. Found in your lånelöfte document.")
        with col10:
            expiry_val = None
            try:
                if settings["loan_expiry"] and str(settings["loan_expiry"]) not in ("", "nan", "None"):
                    expiry_val = pd.to_datetime(settings["loan_expiry"]).date()
            except Exception:
                pass
            loan_expiry = st.date_input("Expiry Date", value=expiry_val,
                                        help="The date your lånelöfte expires. The dashboard will warn you 30 days before.")
        with col11:
            loan_bank = st.text_input(
                "Lender / Bank",
                value=settings["loan_bank"] if str(settings["loan_bank"]) != "nan" else "",
                help="e.g. SEB, Swedbank, Handelsbanken, SBAB, Nordea")

        submitted = st.form_submit_button("Save", width="content")
        if submitted:
            new_settings = {
                "p1_name": p1_name, "p2_name": p2_name,
                "p1_current": p1_current, "p2_current": p2_current,
                "p1_monthly": p1_monthly, "p2_monthly": p2_monthly,
                "loan_amount": loan_amount,
                "loan_expiry": loan_expiry.isoformat() if loan_expiry else "",
                "loan_bank": loan_bank,
                "apartment_price": apt_price, "down_pct": down_pct,
                "move_in_date": settings.get("move_in_date", ""),
            }
            save_settings(new_settings)
            st.session_state.savings_edit = False
            st.success("Saved to tracker.xlsx")
            st.rerun()

# ── Projection table (always visible) ────────────────────────────────────────
settings = load_settings()
target   = get_target(settings)
proj     = get_projection(settings)

st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

st.markdown("#### Monthly Breakdown")
current_month_num = date.today().month
display_df = proj[proj["month_num"] >= current_month_num][["month", "cumulative", "target", "gap"]].copy()
display_df.columns = ["Month", "Cumulative (kr)", "Target (kr)", "Gap (kr)"]
display_df["Cumulative (kr)"] = display_df["Cumulative (kr)"].apply(lambda x: f"{x:,.0f}")
display_df["Target (kr)"]     = display_df["Target (kr)"].apply(lambda x: f"{x:,.0f}")
display_df["Gap (kr)"]        = display_df["Gap (kr)"].apply(lambda x: "Met" if x <= 0 else f"{x:,.0f}")
st.dataframe(display_df, width="stretch", hide_index=True)
