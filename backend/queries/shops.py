import time
from typing import Any
from backend.database.supabase_client import get_supabase, get_next_id

_shop_cache: dict[int, tuple[float, dict[str, Any] | None]] = {}

def create_shop(owner_id: int, shop_name: str, address: str | None = None) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("shops"),
        "owner_id": owner_id,
        "shop_name": shop_name,
        "address": address
    }
    res = client.table("shops").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_shop_by_id(shop_id: int) -> dict[str, Any] | None:
    now = time.time()
    if shop_id in _shop_cache:
        cached_time, val = _shop_cache[shop_id]
        if now - cached_time < 60:
            return val

    client = get_supabase()
    for attempt in range(2):
        try:
            res = client.table("shops").select("id, owner_id, shop_name, address").eq("id", shop_id).limit(1).execute()
            data = res.data[0] if res.data else None
            _shop_cache[shop_id] = (now, data)
            return data
        except Exception:
            if attempt == 0:
                time.sleep(0.2)
                continue
            if shop_id in _shop_cache:
                return _shop_cache[shop_id][1]
            return None
    return None

def get_shops_by_owner(owner_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    res = client.table("shops").select("id, owner_id, shop_name, address").eq("owner_id", owner_id).order("id").execute()
    return res.data or []

def update_shop(
    shop_id: int,
    *,
    shop_name: str | None = None,
    address: str | None = None,
) -> bool:
    client = get_supabase()
    payload = {}
    if shop_name is not None:
        payload["shop_name"] = shop_name
    if address is not None:
        payload["address"] = address
    if not payload:
        return False
    res = client.table("shops").update(payload).eq("id", shop_id).execute()
    return bool(res.data)

def delete_shop(shop_id: int) -> bool:
    client = get_supabase()
    res = client.table("shops").delete().eq("id", shop_id).execute()
    return bool(res.data)
