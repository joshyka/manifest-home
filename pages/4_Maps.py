import streamlit as st
import sys
from pathlib import Path
from urllib.parse import quote
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.theme import inject_css, page_header
from utils.auth import require_pin

st.set_page_config(page_title="Maps", layout="wide")
inject_css()
require_pin()

st.markdown(page_header("Maps", "Get directions between two addresses"), unsafe_allow_html=True)

if "_val_a"     not in st.session_state or not isinstance(st.session_state._val_a, str): st.session_state._val_a     = ""
if "_val_b"     not in st.session_state or not isinstance(st.session_state._val_b, str): st.session_state._val_b     = ""
if "_swap_gen"  not in st.session_state: st.session_state._swap_gen  = 0
if "_amenity_q" not in st.session_state: st.session_state._amenity_q = None

gen   = st.session_state._swap_gen
key_a = f"input_a_{gen}"
key_b = f"input_b_{gen}"

def _sync_a(): st.session_state._val_a = st.session_state[key_a]
def _sync_b(): st.session_state._val_b = st.session_state[key_b]

addr_a = st.text_input("From", placeholder="e.g. Folkungagatan 45, Stockholm",
                        value=st.session_state._val_a, key=key_a, on_change=_sync_a)

_, col_swap, _ = st.columns([5, 1, 5])
with col_swap:
    if st.button("⇅", help="Swap From and To"):
        if key_a in st.session_state: st.session_state._val_a = st.session_state[key_a]
        if key_b in st.session_state: st.session_state._val_b = st.session_state[key_b]
        st.session_state._val_a, st.session_state._val_b = (
            st.session_state._val_b, st.session_state._val_a
        )
        st.session_state._swap_gen += 1
        st.rerun()

addr_b = st.text_input("To", placeholder="e.g. Kungsgatan 10, Stockholm",
                        value=st.session_state._val_b, key=key_b, on_change=_sync_b)

st.markdown("""
<style>
div[data-testid="stRadio"] p,
label[data-testid="stWidgetLabel"] p { color: black !important; }
</style>
""", unsafe_allow_html=True)

travel_mode = st.radio(
    "Travel mode",
    ["Driving", "Transit", "Walking", "Cycling"],
    horizontal=True,
    label_visibility="collapsed",
)

dirflg_map = {"Driving": "d", "Transit": "r", "Walking": "w", "Cycling": "b"}
mode_map   = {"Driving": "driving", "Transit": "transit", "Walking": "walking", "Cycling": "bicycling"}

AMENITIES = [
    ("Preschool",   "förskola",               "🏫"),
    ("Gym",         "gym fitness",            "🏋️"),
    ("Grocery",     "grocery store ICA Coop", "🛒"),
    ("Pendeltåg",   "pendeltåg station",      "🚆"),
    ("Metro",       "tunnelbana station",     "🚇"),
    ("Bus stop",    "busshållplats",          "🚌"),
    ("Vårdcentral", "vårdcentral",            "🏥"),
    ("Apotek",      "apotek",                 "💊"),
]

addr_a = addr_a if isinstance(addr_a, str) else ""
addr_b = addr_b if isinstance(addr_b, str) else ""

both = addr_a.strip() and addr_b.strip()

# Reset amenity selection if destination changes
if addr_b.strip() == "":
    st.session_state._amenity_q = None

amenity_q  = st.session_state._amenity_q
dest_raw   = addr_b.strip()

if amenity_q and dest_raw:
    q = quote(f"{amenity_q} within 5km near {dest_raw}")
    embed_url = f"https://maps.google.com/maps?q={q}&output=embed&z=14"
    open_url  = f"https://www.google.com/maps/search/{q}"
elif both:
    dirflg      = dirflg_map[travel_mode]
    mode        = mode_map[travel_mode]
    origin      = quote(addr_a.strip())
    destination = quote(dest_raw)
    embed_url = f"https://maps.google.com/maps?saddr={origin}&daddr={destination}&dirflg={dirflg}&output=embed"
    open_url  = f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&travelmode={mode}"
else:
    embed_url = "https://maps.google.com/maps?q=Stockholm&output=embed"
    open_url  = "https://www.google.com/maps"

# ── Nearby amenity pills ───────────────────────────────────────────────────────
# Base style: secondary = grey, primary = green
st.markdown("""
<style>
div[data-testid="stButton"] button[kind="secondary"] {
    background: #ffffff !important;
    color: #374151 !important;
    border: 1.5px solid #D1D5DB !important;
    box-shadow: none !important;
}
div[data-testid="stButton"] button[kind="secondary"]:hover {
    background: #F3F4F6 !important;
    border-color: #9CA3AF !important;
    color: #111827 !important;
}
div[data-testid="stButton"] button[kind="primary"] {
    background: #2E7D5E !important;
    color: #ffffff !important;
    border: 1.5px solid #2E7D5E !important;
    font-weight: 700 !important;
}
</style>
""", unsafe_allow_html=True)

def _render_amenity_btn(label, query, icon):
    is_active = (amenity_q == query)
    btn_type  = "primary" if is_active else "secondary"
    if st.button(f"{icon} {label}", key=f"am_{label}", use_container_width=True, type=btn_type):
        st.session_state._amenity_q = None if is_active else query
        st.rerun()

def _render_amenity_row(row_items):
    cols = st.columns(len(row_items))
    for col, (label, query, icon) in zip(cols, row_items):
        with col:
            _render_amenity_btn(label, query, icon)

st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)
row1 = AMENITIES[:6]
row2 = AMENITIES[6:]
_render_amenity_row(row1)
pad = (len(row1) - len(row2)) // 2
centre_cols = st.columns(len(row1))
for i, (label, query, icon) in enumerate(row2):
    with centre_cols[pad + i]:
        _render_amenity_btn(label, query, icon)

if amenity_q and not dest_raw:
    st.caption("Enter a To address to search nearby.")
elif amenity_q:
    st.caption("Tap the highlighted filter again to go back to directions.")

st.markdown(
    f'<a href="{open_url}" target="_blank" style="display:block;text-align:center;'
    f'font-size:0.85rem;color:#2E7D5E;font-weight:600;text-decoration:none;'
    f'margin:4px 0 6px">Open in Google Maps ↗</a>',
    unsafe_allow_html=True,
)
st.components.v1.iframe(embed_url, height=500, scrolling=False)
