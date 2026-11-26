from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.database.supabase_client import get_supabase
from backend.security.sql_guard import sanitize_search_term

def get_global_price(item_key: str) -> Optional[Dict[str, Any]]:
    client = get_supabase()
    cleaned = sanitize_search_term(item_key).lower()
    if not cleaned:
        return None
    res = client.table("global_market_prices").select("id, item_key, display_name, price, unit, source, updated_at").eq("item_key", cleaned).limit(1).execute()
    if res.data:
        return res.data[0]

    res_like = client.table("global_market_prices").select("id, item_key, display_name, price, unit, source, updated_at").or_(f"item_key.ilike.%{cleaned}%,display_name.ilike.%{cleaned}%").order("id").limit(1).execute()
    return res_like.data[0] if res_like.data else None

def save_global_price(
    item_key: str,
    display_name: str,
    price: float,
    unit: str = "unit",
    source: str = "serpapi",
) -> bool:
    client = get_supabase()
    cleaned = item_key.strip().lower()
    payload = {
        "item_key": cleaned,
        "display_name": display_name,
        "price": price,
        "unit": unit,
        "source": source,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    client.table("global_market_prices").upsert(payload, on_conflict="item_key").execute()
    return True

def get_all_global_prices(limit: int = 100) -> List[Dict[str, Any]]:
    client = get_supabase()
    res = client.table("global_market_prices").select("id, item_key, display_name, price, unit, source, updated_at").order("item_key").limit(limit).execute()
    return res.data or []
