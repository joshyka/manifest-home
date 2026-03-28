"""
data.py — All read/write operations via Supabase PostgreSQL
"""
from utils.supabase_client import get_client

DEFAULT_SETTINGS = {
    "p1_name": "",
    "p2_name": "",
    "p1_current": 0,
    "p2_current": 0,
    "p1_monthly": 0,
    "p2_monthly": 0,
    "loan_amount": 0,
    "loan_expiry": "",
    "loan_bank": "",
    "apartment_price": 0,
    "down_pct": 10.0,
}


# ── Settings ──────────────────────────────────────────────────────────────────
def load_settings(user_id: str) -> dict:
    supa = get_client()
    result = supa.table("settings").select("*").eq("user_id", user_id).execute()
    if not result.data:
        supa.table("settings").insert({"user_id": user_id, **DEFAULT_SETTINGS}).execute()
        return dict(DEFAULT_SETTINGS)
    row = result.data[0]
    settings = dict(DEFAULT_SETTINGS)
    for k in DEFAULT_SETTINGS:
        if k in row and row[k] is not None:
            settings[k] = row[k]
    for int_key in ["p1_current", "p2_current", "p1_monthly", "p2_monthly", "loan_amount", "apartment_price"]:
        try:
            settings[int_key] = int(float(settings[int_key]))
        except (ValueError, TypeError):
            settings[int_key] = 0
    try:
        settings["down_pct"] = float(settings["down_pct"])
    except (ValueError, TypeError):
        settings["down_pct"] = 15.0
    return settings


def save_settings(data: dict, user_id: str):
    supa = get_client()
    payload = {"user_id": user_id}
    for k in DEFAULT_SETTINGS:
        if k in data:
            payload[k] = data[k]
    supa.table("settings").upsert(payload).execute()


# ── Viewings ──────────────────────────────────────────────────────────────────
def load_viewings(user_id: str) -> list[dict]:
    supa = get_client()
    result = supa.table("viewings").select("*").eq("user_id", user_id).order("created_at").execute()
    return result.data or []


def save_viewing(row: dict, user_id: str):
    supa = get_client()
    supa.table("viewings").insert({**row, "user_id": user_id}).execute()


def get_viewing(vid: str, user_id: str) -> dict | None:
    supa = get_client()
    result = supa.table("viewings").select("*").eq("id", vid).eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def patch_viewing(vid: str, updates: dict, user_id: str):
    supa = get_client()
    supa.table("viewings").update(updates).eq("id", vid).eq("user_id", user_id).execute()


# ── Upcoming Viewings ─────────────────────────────────────────────────────────
def load_upcoming(user_id: str) -> list[dict]:
    supa = get_client()
    result = supa.table("upcoming_viewings").select("*").eq("user_id", user_id).order("created_at").execute()
    return result.data or []


def save_upcoming(row: dict, user_id: str):
    supa = get_client()
    supa.table("upcoming_viewings").insert({**row, "user_id": user_id}).execute()


def delete_upcoming(uv_id: str, user_id: str):
    supa = get_client()
    supa.table("upcoming_viewings").delete().eq("id", uv_id).eq("user_id", user_id).execute()


# ── User blobs (checklist, comparison, calc snapshots) ────────────────────────
def get_blob(key: str, user_id: str):
    supa = get_client()
    result = supa.table("user_blobs").select("data").eq("user_id", user_id).eq("key", key).execute()
    if result.data:
        return result.data[0]["data"]
    return None  # null = never saved (use client-side defaults)


def set_blob(key: str, data, user_id: str):
    supa = get_client()
    supa.table("user_blobs").upsert({"user_id": user_id, "key": key, "data": data}).execute()


# ── Target areas ──────────────────────────────────────────────────────────────
def load_target_areas(user_id: str) -> list[dict]:
    supa = get_client()
    result = supa.table("target_areas").select("*").eq("user_id", user_id).order("created_at").execute()
    return result.data or []


def save_target_area(row: dict, user_id: str):
    supa = get_client()
    supa.table("target_areas").insert({**row, "user_id": user_id}).execute()


def patch_target_area(area_id: str, updates: dict, user_id: str):
    supa = get_client()
    supa.table("target_areas").update(updates).eq("id", area_id).eq("user_id", user_id).execute()


def delete_target_area(area_id: str, user_id: str):
    supa = get_client()
    supa.table("target_areas").delete().eq("id", area_id).eq("user_id", user_id).execute()


# ── Data management ───────────────────────────────────────────────────────────
def clear_all_data(user_id: str):
    supa = get_client()
    supa.table("viewings").delete().eq("user_id", user_id).execute()
    supa.table("upcoming_viewings").delete().eq("user_id", user_id).execute()
    supa.table("target_areas").delete().eq("user_id", user_id).execute()
    supa.table("user_blobs").delete().eq("user_id", user_id).execute()
    supa.table("settings").update({k: v for k, v in DEFAULT_SETTINGS.items()}).eq("user_id", user_id).execute()
