"""
FastAPI backend for Key Journey
Run with: uvicorn main:app --reload --port 8000
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Union
import datetime
import httpx

from utils.supabase_client import get_client
from utils.data import (
    load_settings, save_settings, set_onboarded,
    load_viewings, save_viewing, get_viewing, patch_viewing, delete_viewing,
    load_upcoming, save_upcoming, delete_upcoming,
    get_blob, set_blob,
    load_target_areas, save_target_area, patch_target_area, delete_target_area,
    clear_all_data, cleanup_old_data,
)
from utils.savings import get_projection, get_target, get_loan_status

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Key Journey API", version="3.0.0")

_origins = ["http://localhost:5173", "http://localhost:3000"]
if os.environ.get("FRONTEND_URL"):
    _origins.append(os.environ["FRONTEND_URL"].rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth ──────────────────────────────────────────────────────────────────────
def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """Validate token via Supabase auth.get_user() and return user payload."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        from utils.supabase_client import get_client
        supa = get_client()
        response = supa.auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"sub": user.id, "email": user.email}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[auth error] {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Household: resolve user_id for shared access ─────────────────────────────
def resolve_user_id(user_id: str) -> str:
    """If this user is a partner in a household, return the owner's id instead."""
    try:
        supa = get_client()
        row = supa.table("households").select("owner_id").eq("partner_id", user_id).execute()
        if row.data:
            return row.data[0]["owner_id"]
    except Exception:
        pass
    return user_id


# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.get("/api/dashboard")
def get_dashboard(payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    settings = load_settings(user_id)
    viewings = load_viewings(user_id)
    upcoming_rows = load_upcoming(user_id)

    target = get_target(settings)
    current_savings = settings["p1_current"] + settings["p2_current"]
    savings_pct = (current_savings / target * 100) if target > 0 else 0
    loan_status = get_loan_status(settings)

    active_viewings = [v for v in viewings if "[archived]" not in (v.get("notes") or "")]
    total_viewings = len(active_viewings)
    bids_gone = sum(1 for v in active_viewings if v.get("outcome") == "Went to bidding")

    # Projection
    import pandas as pd
    proj = get_projection(settings)
    projection = proj.to_dict(orient="records")

    # Upcoming (top 3 future)
    upcoming_list = []
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        def _dt(s):
            try:
                return pd.to_datetime(s, utc=True).to_pydatetime()
            except Exception:
                return None
        future = sorted(
            [r for r in upcoming_rows if _dt(r.get("datetime", "")) and _dt(r["datetime"]) >= now],
            key=lambda r: _dt(r["datetime"])
        )[:3]
        upcoming_list = [
            {k: r.get(k, "") for k in ["id", "address", "datetime"]}
            for r in future
        ]
    except Exception:
        pass

    return {
        "settings": settings,
        "kpis": {
            "current_savings": current_savings,
            "target": target,
            "savings_pct": round(savings_pct, 1),
            "loan_status": loan_status,
            "total_viewings": total_viewings,
            "bids_gone": bids_gone,
        },
        "projection": projection,
        "upcoming": upcoming_list,
    }


# ── Settings ──────────────────────────────────────────────────────────────────
@app.get("/api/settings")
def get_settings(payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    return load_settings(user_id)


class SettingsBody(BaseModel):
    p1_name: str = ""
    p2_name: str = ""
    p1_current: int = 0
    p2_current: int = 0
    p1_monthly: int = 0
    p2_monthly: int = 0
    loan_amount: int = 0
    loan_expiry: str = ""
    loan_bank: str = ""
    apartment_price: int = 0
    down_pct: float = 10.0


@app.put("/api/settings")
def update_settings(body: SettingsBody, payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    save_settings(body.model_dump(), user_id)
    settings = load_settings(user_id)
    proj = get_projection(settings)
    return {
        "settings": settings,
        "projection": proj.to_dict(orient="records"),
    }


@app.get("/api/settings/projection")
def get_projection_data(payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    settings = load_settings(user_id)
    proj = get_projection(settings)
    return proj.to_dict(orient="records")


@app.post("/api/onboarding/complete")
def complete_onboarding(payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    set_onboarded(user_id)
    return {"ok": True}


# ── Viewings ──────────────────────────────────────────────────────────────────
@app.get("/api/viewings")
def get_viewings(payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    return load_viewings(user_id)


class ViewingBody(BaseModel):
    address: str
    date: str
    hemnet_url: str = ""
    outcome: str = "Viewed — no bid"
    num_bid_rounds: int = 0
    final_price: str = ""
    my_bid: str = ""
    notes: str = ""
    asking_price: str = ""


@app.post("/api/viewings")
def add_viewing(body: ViewingBody, payload: dict = Depends(require_auth)):
    import uuid
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    vid = str(uuid.uuid4())[:8]
    save_viewing({
        "id": vid,
        "address": body.address,
        "date": body.date,
        "outcome": body.outcome,
        "num_bid_rounds": body.num_bid_rounds,
        "final_price": body.final_price,
        "my_bid": body.my_bid,
        "notes": body.notes,
        "hemnet_url": body.hemnet_url,
        "asking_price": body.asking_price,
    }, user_id)
    return {"ok": True, "id": vid}


class ViewingUpdateBody(BaseModel):
    outcome: str
    num_bid_rounds: int = 0
    final_price: str = ""
    my_bid: str = ""
    notes: str = ""
    asking_price: str = ""
    date: Optional[str] = None
    hemnet_url: Optional[str] = None
    address: Optional[str] = None


@app.put("/api/viewings/{vid}")
def update_viewing(vid: str, body: ViewingUpdateBody, payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    existing = get_viewing(vid, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Viewing not found")
    archived_tag = " [archived]" if "[archived]" in (existing.get("notes") or "") else ""
    try:
        final = str(int(body.final_price)) if body.final_price else ""
    except (ValueError, TypeError):
        final = ""
    update = {
        "outcome": body.outcome,
        "num_bid_rounds": body.num_bid_rounds,
        "final_price": final,
        "my_bid": body.my_bid,
        "notes": body.notes + archived_tag,
        "asking_price": body.asking_price,
    }
    if body.date:
        update["date"] = body.date
    if body.hemnet_url is not None:
        update["hemnet_url"] = body.hemnet_url
    if body.address:
        update["address"] = body.address
    patch_viewing(vid, update, user_id)
    return {"ok": True}


@app.put("/api/viewings/{vid}/archive")
def archive_viewing(vid: str, payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    existing = get_viewing(vid, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Viewing not found")
    notes = existing.get("notes") or ""
    if "[archived]" not in notes:
        notes = (notes + " [archived]").strip()
    patch_viewing(vid, {
        "notes": notes,
    }, user_id)
    return {"ok": True}


@app.delete("/api/viewings/{vid}")
def remove_viewing(vid: str, payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    delete_viewing(vid, user_id)
    return {"ok": True}


@app.put("/api/viewings/{vid}/unarchive")
def unarchive_viewing(vid: str, payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    existing = get_viewing(vid, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Viewing not found")
    notes = (existing.get("notes") or "").replace("[archived]", "").strip()
    patch_viewing(vid, {"notes": notes}, user_id)
    return {"ok": True}


# ── Upcoming viewings ─────────────────────────────────────────────────────────
@app.get("/api/upcoming")
def get_upcoming(payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    return load_upcoming(user_id)


class UpcomingBody(BaseModel):
    address: str
    datetime: str


@app.post("/api/upcoming")
def add_upcoming(body: UpcomingBody, payload: dict = Depends(require_auth)):
    import uuid
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    uid = str(uuid.uuid4())[:8]
    save_upcoming({
        "id": uid,
        "address": body.address,
        "datetime": body.datetime,
    }, user_id)
    return {"ok": True, "id": uid}


@app.delete("/api/upcoming/{uid}")
def remove_upcoming(uid: str, payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    delete_upcoming(uid, user_id)
    return {"ok": True}


# ── User blobs ────────────────────────────────────────────────────────────────
_ALLOWED_BLOB_KEYS = {'checklist', 'comparison_items', 'saved_comparisons', 'calc_snapshots', 'brf_checks'}


class BlobBody(BaseModel):
    data: Optional[Union[list, str]] = None


@app.get("/api/blob/{key}")
def get_blob_endpoint(key: str, payload: dict = Depends(require_auth)):
    if key not in _ALLOWED_BLOB_KEYS:
        raise HTTPException(status_code=400, detail="Unknown blob key")
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    return get_blob(key, user_id)


@app.put("/api/blob/{key}")
def set_blob_endpoint(key: str, body: BlobBody, payload: dict = Depends(require_auth)):
    if key not in _ALLOWED_BLOB_KEYS:
        raise HTTPException(status_code=400, detail="Unknown blob key")
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    set_blob(key, body.data, user_id)
    return {"ok": True}


# ── Target areas ──────────────────────────────────────────────────────────────
@app.get("/api/target-areas")
def get_target_areas(payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    return load_target_areas(user_id)


class TargetAreaBody(BaseModel):
    name: str
    priority: str = "Medium"


@app.post("/api/target-areas")
def add_target_area(body: TargetAreaBody, payload: dict = Depends(require_auth)):
    import uuid
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    area_id = str(uuid.uuid4())[:8]
    save_target_area({
        "id": area_id,
        "name": body.name,
        "priority": body.priority,
    }, user_id)
    return {"ok": True, "id": area_id}


class TargetAreaUpdateBody(BaseModel):
    name: str
    priority: str = "Medium"


@app.put("/api/target-areas/{area_id}")
def update_target_area(area_id: str, body: TargetAreaUpdateBody, payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    patch_target_area(area_id, {
        "name": body.name,
        "priority": body.priority,
    }, user_id)
    return {"ok": True}


@app.delete("/api/target-areas/{area_id}")
def remove_target_area(area_id: str, payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    delete_target_area(area_id, user_id)
    return {"ok": True}


# ── Households ───────────────────────────────────────────────────────────────
import secrets, string as _string

def _gen_code() -> str:
    chars = _string.ascii_uppercase + _string.digits
    raw = ''.join(secrets.choice(chars) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"

@app.post("/api/household/create")
def create_household(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    supa = get_client()
    # Only one household per owner
    existing = supa.table("households").select("id").eq("owner_id", user_id).execute()
    if existing.data:
        hid = existing.data[0]["id"]
    else:
        import uuid as _uuid
        hid = str(_uuid.uuid4())[:8]
        code = _gen_code()
        expires = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=48)).isoformat()
        supa.table("households").insert({
            "id": hid, "owner_id": user_id,
            "invite_code": code, "invite_expires_at": expires,
        }).execute()
    row = supa.table("households").select("*").eq("id", hid).single().execute()
    return {"role": "owner", **row.data}

@app.get("/api/household/status")
def household_status(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    supa = get_client()
    rows = supa.table("households").select("*").or_(f"owner_id.eq.{user_id},partner_id.eq.{user_id}").execute()
    if rows.data:
        row = rows.data[0]
        role = "owner" if row.get("owner_id") == user_id else "partner"
        return {"role": role, **row}
    return {"role": "none"}

class JoinBody(BaseModel):
    code: str

@app.post("/api/household/join")
def join_household(body: JoinBody, payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    supa = get_client()
    existing = supa.table("households").select("id").or_(f"owner_id.eq.{user_id},partner_id.eq.{user_id}").execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="You are already in a household")
    code = body.code.upper().replace(" ", "")
    row = supa.table("households").select("*").eq("invite_code", code).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    h = row.data[0]
    if h["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="You are the owner of this household")
    if h["partner_id"]:
        raise HTTPException(status_code=400, detail="Household already has a partner")
    expires = datetime.datetime.fromisoformat(h["invite_expires_at"])
    if datetime.datetime.now(datetime.timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Invite code has expired")
    supa.table("households").update({
        "partner_id": user_id, "invite_code": None, "invite_expires_at": None,
    }).eq("id", h["id"]).execute()
    return {"ok": True}

@app.delete("/api/household")
def delete_household(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    supa = get_client()
    supa.table("households").delete().eq("owner_id", user_id).execute()
    return {"ok": True}

@app.post("/api/household/leave")
def leave_household(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    supa = get_client()
    supa.table("households").update({
        "partner_id": None,
    }).eq("partner_id", user_id).execute()
    return {"ok": True}

@app.post("/api/household/remove-partner")
def remove_partner(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    supa = get_client()
    supa.table("households").update({
        "partner_id": None,
    }).eq("owner_id", user_id).execute()
    return {"ok": True}

class HouseholdNameBody(BaseModel):
    name: str

@app.put("/api/household/name")
def update_household_name(body: HouseholdNameBody, payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    supa = get_client()
    supa.table("households").update({"name": body.name.strip() or None}).eq("owner_id", user_id).execute()
    row = supa.table("households").select("*").eq("owner_id", user_id).single().execute()
    return {"role": "owner", **row.data}

@app.post("/api/household/regenerate")
def regenerate_code(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    supa = get_client()
    code = _gen_code()
    expires = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=48)).isoformat()
    supa.table("households").update({
        "invite_code": code, "invite_expires_at": expires,
    }).eq("owner_id", user_id).execute()
    row = supa.table("households").select("*").eq("owner_id", user_id).single().execute()
    return {"role": "owner", **row.data}


# ── Data management ───────────────────────────────────────────────────────────
@app.delete("/api/data")
def clear_data(payload: dict = Depends(require_auth)):
    user_id = resolve_user_id(payload.get("sub", "dev-user"))
    clear_all_data(user_id)
    return {"ok": True}


# ── Data retention cleanup (called by Vercel cron) ───────────────────────────
_CRON_SECRET = os.environ.get("CRON_SECRET", "")

@app.post("/api/cleanup")
def run_cleanup(authorization: Optional[str] = Header(None)):
    if not _CRON_SECRET or authorization != f"Bearer {_CRON_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = cleanup_old_data()
    print(f"[cleanup] {result}", flush=True)
    return {"ok": True, **result}


# ── Riksbank rate proxy (avoids browser CORS restriction) ─────────────────────
@app.get("/api/riksbank-rate")
def riksbank_rate():
    # API requires explicit date range: /observations/{series}/{from}/{to}
    today = datetime.date.today()
    date_from = (today - datetime.timedelta(days=14)).isoformat()
    date_to = today.isoformat()
    url = f"https://api.riksbank.se/swea/v1/observations/SEMB5YCACOMB/{date_from}/{date_to}"
    try:
        r = httpx.get(url, headers={"Accept": "application/json"}, timeout=10)
        r.raise_for_status()
        data = r.json()
        if not data:
            raise ValueError("empty response")
        raw = data[-1]["value"]  # most recent entry
        value = round(float(raw) * 10) / 10
        return {"value": value}
    except Exception:
        raise HTTPException(status_code=502, detail="Could not fetch Riksbank rate")
