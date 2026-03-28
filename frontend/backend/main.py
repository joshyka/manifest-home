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
from typing import Optional
import datetime
import re
import requests as http_requests

from utils.data import (
    load_settings, save_settings,
    load_viewings, save_viewing, get_viewing, patch_viewing,
    load_upcoming, save_upcoming, delete_upcoming,
    clear_all_data,
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
_ALLOWED_EMAILS = [e.strip() for e in os.environ.get("ALLOWED_EMAILS", "").split(",") if e.strip()]


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
        if _ALLOWED_EMAILS and user.email not in _ALLOWED_EMAILS:
            raise HTTPException(status_code=403, detail="Email not authorised")
        return {"sub": user.id, "email": user.email}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[auth error] {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=401, detail=f"Auth error: {type(e).__name__}: {e}")


# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.get("/api/dashboard")
def get_dashboard(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    settings = load_settings(user_id)
    viewings = load_viewings(user_id)
    upcoming_rows = load_upcoming(user_id)

    target = get_target(settings)
    current_savings = settings["p1_current"] + settings["p2_current"]
    savings_pct = (current_savings / target * 100) if target > 0 else 0
    loan_status = get_loan_status(settings)

    total_viewings = len(viewings)
    bids_gone = sum(1 for v in viewings if v.get("outcome") == "Went to bidding")

    # Projection
    import pandas as pd
    proj = get_projection(settings)
    now_month = datetime.date.today().month
    proj_display = proj[proj["month_num"] >= now_month]
    projection = proj_display.to_dict(orient="records")

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
            {k: r.get(k, "") for k in ["id", "address", "datetime", "area", "asking_price", "notes"]}
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
    user_id = payload.get("sub", "dev-user")
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
    user_id = payload.get("sub", "dev-user")
    save_settings(body.model_dump(), user_id)
    settings = load_settings(user_id)
    proj = get_projection(settings)
    return {
        "settings": settings,
        "projection": proj.to_dict(orient="records"),
    }


@app.get("/api/settings/projection")
def get_projection_data(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    settings = load_settings(user_id)
    proj = get_projection(settings)
    return proj.to_dict(orient="records")


# ── Viewings ──────────────────────────────────────────────────────────────────
@app.get("/api/viewings")
def get_viewings(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
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


@app.post("/api/viewings")
def add_viewing(body: ViewingBody, payload: dict = Depends(require_auth)):
    import uuid
    user_id = payload.get("sub", "dev-user")
    vid = str(uuid.uuid4())[:8]
    save_viewing({
        "id": vid,
        "address": body.address,
        "date": body.date,
        "area": "",
        "listed_price": "",
        "size_sqm": "",
        "avgift": "",
        "outcome": body.outcome,
        "num_bid_rounds": body.num_bid_rounds,
        "final_price": body.final_price,
        "my_bid": body.my_bid,
        "rating": "",
        "notes": body.notes,
        "hemnet_url": body.hemnet_url,
        "booli_url": "",
    }, user_id)
    return {"ok": True, "id": vid}


class ViewingUpdateBody(BaseModel):
    outcome: str
    num_bid_rounds: int = 0
    final_price: str = ""
    my_bid: str = ""
    notes: str = ""


@app.put("/api/viewings/{vid}")
def update_viewing(vid: str, body: ViewingUpdateBody, payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    existing = get_viewing(vid, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Viewing not found")
    archived_tag = " [archived]" if "[archived]" in (existing.get("notes") or "") else ""
    try:
        final = str(int(body.final_price)) if body.final_price else ""
    except (ValueError, TypeError):
        final = ""
    patch_viewing(vid, {
        "outcome": body.outcome,
        "num_bid_rounds": body.num_bid_rounds,
        "final_price": final,
        "my_bid": body.my_bid,
        "notes": body.notes + archived_tag,
    }, user_id)
    return {"ok": True}


@app.put("/api/viewings/{vid}/archive")
def archive_viewing(vid: str, payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    existing = get_viewing(vid, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Viewing not found")
    notes = existing.get("notes") or ""
    if "[archived]" not in notes:
        notes = (notes + " [archived]").strip()
    patch_viewing(vid, {
        "hemnet_url": "",
        "booli_url": "",
        "notes": notes,
    }, user_id)
    return {"ok": True}


# ── Upcoming viewings ─────────────────────────────────────────────────────────
@app.get("/api/upcoming")
def get_upcoming(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    return load_upcoming(user_id)


class UpcomingBody(BaseModel):
    address: str
    datetime: str
    area: str = ""
    asking_price: str = ""
    notes: str = ""


@app.post("/api/upcoming")
def add_upcoming(body: UpcomingBody, payload: dict = Depends(require_auth)):
    import uuid
    user_id = payload.get("sub", "dev-user")
    uid = str(uuid.uuid4())[:8]
    save_upcoming({
        "id": uid,
        "address": body.address,
        "datetime": body.datetime,
        "area": body.area,
        "asking_price": body.asking_price,
        "notes": body.notes,
    }, user_id)
    return {"ok": True, "id": uid}


@app.delete("/api/upcoming/{uid}")
def remove_upcoming(uid: str, payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    delete_upcoming(uid, user_id)
    return {"ok": True}


# ── Listing URL fetcher ───────────────────────────────────────────────────────
class FetchListingBody(BaseModel):
    url: str


def _meta(html: str, prop: str) -> str:
    for attr in ['property', 'name']:
        m = re.search(rf'<meta[^>]+{attr}="{re.escape(prop)}"[^>]+content="([^"]*)"', html, re.I)
        if m: return m.group(1).strip()
        m = re.search(rf'<meta[^>]+content="([^"]*)"[^>]+{attr}="{re.escape(prop)}"', html, re.I)
        if m: return m.group(1).strip()
    return ""


def _extract_price(text: str) -> Optional[int]:
    m = re.search(r'([\d\s]{6,12})\s*kr', text.replace('\xa0', ' '))
    if m:
        try: return int(re.sub(r'\s', '', m.group(1)))
        except: pass
    return None


def _extract_sqm(text: str) -> Optional[float]:
    m = re.search(r'(\d+[\.,]?\d*)\s*m[²2]', text)
    if m:
        try: return float(m.group(1).replace(',', '.'))
        except: pass
    return None


def _extract_rooms(text: str) -> Optional[int]:
    m = re.search(r'(\d+)\s*r(?:um|oom)', text, re.I)
    if m:
        try: return int(m.group(1))
        except: pass
    return None


def _parse_hemnet_slug(url: str) -> dict:
    m = re.search(r'/bostad/([^/?#]+)', url)
    if not m:
        return {}
    slug = m.group(1)
    parts = slug.split('-')
    rooms = None
    for p in parts:
        rm = re.match(r'^(\d+)rum$', p)
        if rm:
            rooms = int(rm.group(1))
            break
    skip = {'stockholms', 'kommun', 'stad', 'lagenhet', 'villa', 'radhus', 'tomt', 'fritidshus'}
    filtered = [
        p for p in parts
        if not re.match(r'^\d+rum$', p)
        and not re.match(r'^\d{6,}$', p)
        and p.lower() not in skip
    ]
    name = ' '.join(p.capitalize() for p in filtered)
    area = ''
    for i, p in enumerate(parts):
        if re.match(r'^\d+rum$', p):
            if i + 1 < len(parts):
                area = parts[i + 1].capitalize()
            break
    return {"name": name, "rooms": rooms, "area": area}


_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Mode": "navigate",
}


@app.post("/api/fetch-listing")
def fetch_listing(body: FetchListingBody, payload: dict = Depends(require_auth)):
    url = body.url.strip()
    slug_data = {}
    if "hemnet.se" in url:
        slug_data = _parse_hemnet_slug(url)

    html = ""
    fetch_ok = False
    try:
        resp = http_requests.get(url, headers=_BROWSER_HEADERS, timeout=10, allow_redirects=True)
        if resp.status_code == 200:
            html = resp.text
            fetch_ok = True
    except Exception:
        pass

    title       = _meta(html, "og:title") or _meta(html, "title") or ""
    description = _meta(html, "og:description") or ""
    image       = _meta(html, "og:image") or ""
    site_name   = _meta(html, "og:site_name") or ""

    json_ld_text = ""
    jld = re.search(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S | re.I)
    if jld:
        json_ld_text = jld.group(1)

    combined = f"{title} {description} {json_ld_text}"
    price = _extract_price(combined)
    sqm   = _extract_sqm(combined)
    rooms = _extract_rooms(combined) or slug_data.get("rooms")

    if title:
        name = title.split("|")[0].split(" - ")[0].strip()
        name = re.sub(r'\s+(till salu|uthyres|för sale).*', '', name, flags=re.I).strip()
    else:
        name = slug_data.get("name", "")

    if not site_name:
        if "hemnet.se" in url:    site_name = "Hemnet"
        elif "booli.se" in url:   site_name = "Booli"
        elif "blocket.se" in url: site_name = "Blocket"

    return {
        "name":        name,
        "price":       price,
        "sqm":         sqm,
        "rooms":       rooms,
        "image":       image,
        "site":        site_name,
        "description": description[:200] if description else "",
        "partial":     not fetch_ok,
    }


# ── Data management ───────────────────────────────────────────────────────────
@app.delete("/api/data")
def clear_data(payload: dict = Depends(require_auth)):
    user_id = payload.get("sub", "dev-user")
    clear_all_data(user_id)
    return {"ok": True}
