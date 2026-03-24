import streamlit as st

def _get_pin() -> str:
    try:
        return st.secrets["PIN"]
    except Exception:
        return None

def require_pin():
    if st.session_state.get("authenticated"):
        return

    st.markdown("""
    <div style="max-width:340px;margin:80px auto 0;text-align:center">
        <div style="font-size:2rem;margin-bottom:12px">🏡</div>
        <div style="font-weight:800;font-size:1.2rem;color:#1A2E1F;margin-bottom:4px">
            Manifesting My Home
        </div>
        <div style="color:#6B7280;font-size:0.85rem;margin-bottom:28px">
            Enter your PIN to continue
        </div>
    </div>
    """, unsafe_allow_html=True)

    col_l, col_c, col_r = st.columns([1, 2, 1])
    with col_c:
        with st.form("pin_form"):
            pin_input = st.text_input(
                "PIN",
                type="password",
                max_chars=6,
                placeholder="6-digit PIN",
                label_visibility="collapsed",
            )
            if st.form_submit_button("Unlock", width="stretch"):
                pin = _get_pin()
                if pin is None:
                    st.error("No PIN configured. Add PIN to .streamlit/secrets.toml")
                elif pin_input == pin:
                    st.session_state.authenticated = True
                    st.rerun()
                else:
                    st.error("Incorrect PIN. Try again.")

    st.stop()
