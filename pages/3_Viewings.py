import streamlit as st
import pandas as pd
import datetime
import uuid
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.data import (load_viewings, save_viewing,
                        load_upcoming, save_upcoming, delete_upcoming)
from utils.theme import inject_css, page_header
from utils.auth import require_pin

st.set_page_config(page_title="Viewings", layout="wide")
inject_css()
require_pin()

st.markdown(page_header("Viewings", "Log every apartment you visit and track bidding history"), unsafe_allow_html=True)

tab1, tab2 = st.tabs(["Listings", "Upcoming"])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — Viewing Log
# ═══════════════════════════════════════════════════════════════════════════════
with tab1:

    # Edit mode toggle for the add-viewing form
    if "viewing_form_open" not in st.session_state:
        st.session_state.viewing_form_open = False

    col_hdr, col_btn = st.columns([5, 1])
    with col_hdr:
        st.markdown("#### Add a Listing")
    with col_btn:
        if not st.session_state.viewing_form_open:
            if st.button("Add Listing", width="content"):
                st.session_state.viewing_form_open = True
                st.rerun()
        else:
            if st.button("Cancel", width="content"):
                st.session_state.viewing_form_open = False
                st.rerun()

    if st.session_state.viewing_form_open:
        st.markdown("""
        <div style="background:#E6F4EF;border-left:4px solid #2E7D5E;border-radius:0 8px 8px 0;
                    padding:10px 14px;margin-bottom:16px">
            <strong style="color:#1B4D3E">Add a listing</strong>
            <div style="color:#4B7C6A;font-size:0.83rem;margin-top:2px">
                Paste any listing URL and give it a short label so you can identify it later.
            </div>
        </div>""", unsafe_allow_html=True)

        # ── Bidding checkbox lives OUTSIDE the form so it reruns immediately ──
        if "went_bidding" not in st.session_state:
            st.session_state.went_bidding = False

        cb_col, _ = st.columns([3, 3])
        with cb_col:
            st.session_state.went_bidding = st.checkbox(
                "Bid",
                value=st.session_state.went_bidding
            )

        if st.session_state.went_bidding:
            st.markdown("""
            <div style="background:#FDF0E6;border-left:4px solid #C0621C;border-radius:0 8px 8px 0;
                        padding:10px 14px;margin:8px 0 14px">
                <strong style="color:#92400E">Bid Rounds</strong>
                <div style="color:#92400E;font-size:0.83rem;margin-top:2px">
                    Enter each bid amount separated by commas — e.g. <code>3200000, 3350000, 3500000</code>
                </div>
            </div>""", unsafe_allow_html=True)

        with st.form("viewing_form", clear_on_submit=True):
            label = st.text_input("Label", placeholder="e.g. Folkungagatan 45 — 3 rooms, Södermalm",
                                  help="A short name to identify this listing in your log.")
            listing_url = st.text_input("Listing URL", placeholder="https://www.hemnet.se/bostad/...",
                                        help="Paste any listing URL (Hemnet, Booli, or other).")

            view_date = st.date_input("Date Added", value=datetime.date.today())

            bid_rounds_str = ""
            if st.session_state.went_bidding:
                bid_rounds_str = st.text_input(
                    "Bid amounts (SEK, comma-separated)",
                    placeholder="e.g. 3200000, 3350000, 3500000",
                    help="Enter each round's bid amount separated by commas. Most recent / highest last."
                )

            submitted = st.form_submit_button("Save", width="content")
            if submitted:
                url_clean  = listing_url.strip()
                hemnet_url = url_clean
                booli_url  = ""

                if not label.strip() and not url_clean:
                    st.error("Please enter at least a label or a URL.")
                else:
                    # Parse bid rounds
                    bid_rounds = []
                    if st.session_state.went_bidding and bid_rounds_str.strip():
                        for part in bid_rounds_str.split(","):
                            part = part.strip().replace(" ", "")
                            try:
                                bid_rounds.append(int(float(part)))
                            except ValueError:
                                pass
                    highest_bid = max(bid_rounds) if bid_rounds else ""

                    vid = str(uuid.uuid4())[:8]
                    save_viewing({
                        "id": vid,
                        "address": label.strip() or url_clean,
                        "date": view_date.isoformat(),
                        "area": "",
                        "listed_price": "",
                        "size_sqm": "",
                        "avgift": "",
                        "outcome": "Went to bidding" if st.session_state.went_bidding else "Viewed — no bid",
                        "num_bid_rounds": len(bid_rounds),
                        "final_price": highest_bid,
                        "rating": "",
                        "notes": ", ".join(str(b) for b in bid_rounds) if bid_rounds else "",
                        "hemnet_url": hemnet_url,
                        "booli_url": booli_url,
                    })
                    st.session_state.viewing_form_open = False
                    st.session_state.went_bidding = False
                    st.success("Listing saved.")
                    st.rerun()

    # Listing log
    viewings = load_viewings()

    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

    if viewings.empty:
        st.markdown('<p style="color:#6B7280;margin-top:16px">No listings saved yet. Click Add Listing above to get started.</p>', unsafe_allow_html=True)
    else:
        # Split active vs archived
        is_archived = viewings["notes"].astype(str).str.contains(r"\[archived\]", regex=True)
        active_viewings   = viewings[~is_archived]
        archived_viewings = viewings[is_archived]

        if active_viewings.empty:
            st.markdown('<p style="color:#6B7280;margin-top:16px">No active listings. Add one above.</p>', unsafe_allow_html=True)
        else:
            st.markdown(f"**{len(active_viewings)} active listing{'s' if len(active_viewings) != 1 else ''}**")
        for _, row in active_viewings.iloc[::-1].iterrows():
            hemnet_str  = str(row.get("hemnet_url", "")).strip()
            booli_str   = str(row.get("booli_url",  "")).strip()
            outcome_str = str(row.get("outcome", "")).strip()
            bid_val     = str(row.get("final_price", "")).strip()

            listing_link = hemnet_str if hemnet_str not in ("", "nan") else (booli_str if booli_str not in ("", "nan") else "")
            if listing_link:
                links_html = f'<a href="{listing_link}" target="_blank" style="color:#2E7D5E;font-size:0.82rem;font-weight:600;text-decoration:none">View listing ↗</a>'
            else:
                links_html = '<span style="color:#9CA3AF;font-size:0.8rem">No link saved</span>'

            # Bid badge + rounds
            notes_str = str(row.get("notes", "")).strip()
            bid_html = ""
            bid_rounds_html = ""
            if outcome_str == "Went to bidding":
                # Show highest bid as badge
                if bid_val not in ("", "nan", "0"):
                    try:
                        bid_html = (f'<span style="background:#FDF0E6;color:#C0621C;font-size:0.78rem;'
                                    f'font-weight:700;padding:3px 10px;border-radius:20px;margin-left:10px">'
                                    f'Highest bid: {int(float(bid_val)):,.0f} kr</span>')
                    except Exception:
                        pass
                else:
                    bid_html = (f'<span style="background:#FDF0E6;color:#C0621C;font-size:0.78rem;'
                                f'font-weight:700;padding:3px 10px;border-radius:20px;margin-left:10px">'
                                f'Went to bidding</span>')
                # Show individual rounds if stored in notes as comma list
                if notes_str and notes_str not in ("nan",):
                    rounds = [r.strip() for r in notes_str.split(",") if r.strip()]
                    if len(rounds) > 1:
                        rounds_formatted = " → ".join(
                            f"{int(float(r)):,.0f}" for r in rounds if r.replace(".","").isdigit()
                        )
                        if rounds_formatted:
                            bid_rounds_html = (
                                f'<div style="margin-top:5px;font-size:0.78rem;color:#92400E">'
                                f'Rounds: {rounds_formatted} kr</div>'
                            )

            st.markdown(f"""
            <div style="padding:8px 0;border-bottom:1px solid #E2E8F0">
                <div style="display:flex;justify-content:space-between;align-items:baseline">
                    <span style="font-weight:600;font-size:0.92rem;color:#1A2E1F">{row['address']}</span>
                    {links_html}
                </div>
                <div style="font-size:0.78rem;color:#9CA3AF;margin-top:2px">Added {row.get('date','')}{(' &nbsp;·&nbsp; ' + bid_html) if bid_html else ''}</div>
                {bid_rounds_html}
            </div>""", unsafe_allow_html=True)

            col_del, col_note = st.columns([1, 5])
            with col_del:
                if st.button("Remove", key=f"del_{row['id']}"):
                    # Clear URLs but keep bid/address history — never lose bidding data
                    from utils.data import load_viewings as _lv
                    df_all = _lv()
                    idx = df_all.index[df_all["id"] == row["id"]]
                    if len(idx) > 0:
                        df_all.loc[idx, "hemnet_url"] = ""
                        df_all.loc[idx, "booli_url"]  = ""
                        # Mark as archived so we can show it in a collapsed history section
                        existing_notes = str(df_all.loc[idx[0], "notes"])
                        if "[archived]" not in existing_notes:
                            df_all.loc[idx, "notes"] = (existing_notes + " [archived]").strip()
                        from utils.data import _write_df_to_sheet
                        _write_df_to_sheet(df_all, "Viewings")
                    st.rerun()
            with col_note:
                st.markdown('<span style="color:#9CA3AF;font-size:0.75rem">Removing clears the listing link — address, date, and bid history are always kept.</span>', unsafe_allow_html=True)

            st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)

        # ── Archived bid history (collapsed) ──────────────────────────────────
        if not archived_viewings.empty:
            with st.expander(f"Bid history — archived listings ({len(archived_viewings)})"):
                st.markdown('<p style="color:#6B7280;font-size:0.83rem;margin-bottom:10px">These listings\' links have been removed, but bid amounts and notes are preserved here.</p>', unsafe_allow_html=True)
                for _, row in archived_viewings.iloc[::-1].iterrows():
                    bid_val     = str(row.get("final_price", "")).strip()
                    notes_clean = str(row.get("notes", "")).replace("[archived]", "").strip()
                    bid_badge = ""
                    rounds_html = ""
                    if str(row.get("outcome","")) == "Went to bidding":
                        if bid_val not in ("", "nan", "0"):
                            try:
                                bid_badge = f'<span style="background:#FDF0E6;color:#C0621C;font-size:0.78rem;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:8px">Highest bid: {int(float(bid_val)):,.0f} kr</span>'
                            except Exception:
                                pass
                        if notes_clean and notes_clean not in ("nan",):
                            rounds = [r.strip() for r in notes_clean.split(",") if r.strip()]
                            if rounds:
                                fmt = " → ".join(f"{int(float(r)):,.0f}" for r in rounds if r.replace(".","").isdigit())
                                if fmt:
                                    rounds_html = f'<div style="font-size:0.78rem;color:#92400E;margin-top:3px">Rounds: {fmt} kr</div>'
                    st.markdown(f"""
                    <div style="background:#FDF8F5;border:1px solid #F0D9C8;border-radius:10px;padding:12px 16px;margin-bottom:8px">
                        <div style="font-weight:600;color:#1A2E1F;font-size:0.9rem">{row.get('address','')} {bid_badge}</div>
                        <div style="color:#9CA3AF;font-size:0.78rem;margin-top:2px">Added {row.get('date','')} &nbsp;·&nbsp; Listing link removed</div>
                        {rounds_html}
                    </div>""", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — Upcoming Reminders
# ═══════════════════════════════════════════════════════════════════════════════
with tab2:

    if "upcoming_form_open" not in st.session_state:
        st.session_state.upcoming_form_open = False

    col_hdr2, col_btn2 = st.columns([5, 1])
    with col_hdr2:
        st.markdown("#### Upcoming Viewing Reminders")
    with col_btn2:
        if not st.session_state.upcoming_form_open:
            if st.button("Add Reminder", width="content"):
                st.session_state.upcoming_form_open = True
                st.rerun()
        else:
            if st.button("Cancel", width="content"):
                st.session_state.upcoming_form_open = False
                st.rerun()

    if st.session_state.upcoming_form_open:
        st.markdown("""
        <div style="background:#E6F4EF;border-left:4px solid #2E7D5E;border-radius:0 8px 8px 0;
                    padding:10px 14px;margin-bottom:14px">
            <strong style="color:#1B4D3E">Add a reminder</strong>
            <div style="color:#4B7C6A;font-size:0.83rem;margin-top:2px">
                Pick the date and time, then enter a short address or description to identify the viewing.
            </div>
        </div>""", unsafe_allow_html=True)

        with st.form("upcoming_form", clear_on_submit=True):
            rc1, rc2, rc3 = st.columns([2, 1, 1])
            with rc1:
                uv_address = st.text_input("Address / Description", placeholder="e.g. Folkungagatan 45, Södermalm")
            with rc2:
                uv_date = st.date_input("Date", value=datetime.date.today())
            with rc3:
                uv_time = st.time_input("Time", value=(datetime.datetime.now() + datetime.timedelta(hours=1)).replace(minute=0, second=0, microsecond=0).time())

            submitted_uv = st.form_submit_button("Save", width="content")
            if submitted_uv:
                if not uv_address.strip():
                    st.error("Please enter an address or description.")
                else:
                    dt_combined = datetime.datetime.combine(uv_date, uv_time)
                    save_upcoming({
                        "id": str(uuid.uuid4())[:8],
                        "address": uv_address.strip(),
                        "datetime": dt_combined.isoformat(),
                        "area": "",
                        "asking_price": "",
                        "notes": "",
                    })
                    st.session_state.upcoming_form_open = False
                    st.success(f"Reminder saved for {uv_address.strip()}")
                    st.rerun()

    upcoming = load_upcoming()
    if upcoming.empty:
        st.markdown('<p style="color:#6B7280;margin-top:16px">No upcoming viewings. Click Add Reminder above.</p>', unsafe_allow_html=True)
    else:
        try:
            upcoming["_dt"] = pd.to_datetime(upcoming["datetime"], errors="coerce")
            upcoming = upcoming.sort_values("_dt")
        except Exception:
            pass

        today_start = pd.Timestamp(datetime.date.today())
        future = upcoming[upcoming["_dt"] >= today_start] if "_dt" in upcoming.columns else upcoming
        past   = upcoming[upcoming["_dt"] < today_start]  if "_dt" in upcoming.columns else pd.DataFrame()

        if not future.empty:
            for _, row in future.iterrows():
                try:
                    dt_obj   = pd.to_datetime(row["datetime"])
                    dt_str   = dt_obj.strftime("%A, %d %B — %H:%M")
                    days     = (dt_obj.date() - datetime.date.today()).days
                    if days == 0:
                        days_str = "Today"
                    elif days == 1:
                        days_str = "Tomorrow"
                    else:
                        days_str = f"{days} days away"
                except Exception:
                    dt_str, days_str = str(row.get("datetime", "")), ""

                st.markdown(f"""
                <div class="upcoming-card">
                    <div class="uc-title">{row.get('address','')}</div>
                    <div class="uc-meta">
                        {dt_str}
                        {f'&nbsp;&middot;&nbsp; <strong style="color:#2E7D5E">{days_str}</strong>' if days_str else ''}
                    </div>
                </div>""", unsafe_allow_html=True)

                if st.button("Remove", key=f"rm_uv_{row['id']}"):
                    delete_upcoming(row["id"])
                    st.rerun()

                st.markdown("<div style='height:2px'></div>", unsafe_allow_html=True)

        if not past.empty:
            with st.expander(f"Past reminders ({len(past)})"):
                for _, row in past.iterrows():
                    try:
                        dt_str = pd.to_datetime(row["datetime"]).strftime("%d %b %Y, %H:%M")
                    except Exception:
                        dt_str = str(row.get("datetime",""))[:16]
                    st.markdown(f"**{row.get('address','')}** — {dt_str}")
                    if st.button("Remove", key=f"rm_past_{row['id']}"):
                        delete_upcoming(row["id"])
                        st.rerun()
