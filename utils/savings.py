"""savings.py — Savings projection calculations."""
import datetime
import pandas as pd

MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

def get_target(settings: dict) -> int:
    return int(settings["apartment_price"] * settings["down_pct"] / 100)

def get_projection(settings: dict) -> pd.DataFrame:
    current_month = datetime.date.today().month  # 1-indexed
    p1_monthly = settings["p1_monthly"]
    p2_monthly = settings["p2_monthly"]
    combined_monthly = p1_monthly + p2_monthly
    starting = settings["p1_current"] + settings["p2_current"]
    target = get_target(settings)

    rows = []
    cumulative = starting
    for i, month in enumerate(MONTHS):
        m_num = i + 1
        if m_num > current_month:
            cumulative += combined_monthly
        rows.append({
            "month": f"{month} 2026",
            "month_num": m_num,
            "cumulative": int(cumulative),
            "target": target,
            "gap": max(0, target - int(cumulative)),
            "is_current": m_num == current_month,
        })
    return pd.DataFrame(rows)

def get_loan_status(settings: dict) -> dict:
    expiry_str = str(settings.get("loan_expiry", "")).strip()
    if not expiry_str or expiry_str in ("", "nan", "None"):
        return {"status": "none", "days": None}
    try:
        expiry = pd.to_datetime(expiry_str).date()
        days = (expiry - datetime.date.today()).days
        if days <= 0:
            return {"status": "expired", "days": days}
        elif days <= 30:
            return {"status": "expiring_soon", "days": days}
        else:
            return {"status": "ok", "days": days}
    except Exception:
        return {"status": "none", "days": None}
