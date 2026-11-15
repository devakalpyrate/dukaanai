from typing import Any
from backend.database.supabase_client import get_supabase, get_next_id

def create_inventory_log(
    shop_id: int,
    product_id: int,
    quantity_change: float,
    reason: str | None = None,
) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("inventory_logs"),
        "shop_id": shop_id,
        "product_id": product_id,
        "quantity_change": quantity_change,
        "reason": reason
    }
    res = client.table("inventory_logs").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_inventory_log_by_id(log_id: int) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("inventory_logs").select("id, shop_id, product_id, quantity_change, reason, created_at").eq("id", log_id).limit(1).execute()
    return res.data[0] if res.data else None

def get_inventory_logs_by_shop(shop_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    res = client.table("inventory_logs").select("id, shop_id, product_id, quantity_change, reason, created_at").eq("shop_id", shop_id).order("created_at", desc=True).order("id", desc=True).execute()
    return res.data or []

def get_inventory_logs_by_product(
    shop_id: int,
    product_id: int,
) -> list[dict[str, Any]]:
    client = get_supabase()
    res = client.table("inventory_logs").select("id, shop_id, product_id, quantity_change, reason, created_at").eq("shop_id", shop_id).eq("product_id", product_id).order("created_at", desc=True).order("id", desc=True).execute()
    return res.data or []

def get_inventory_logs_by_reason(
    shop_id: int,
    reason: str,
) -> list[dict[str, Any]]:
    client = get_supabase()
    res = client.table("inventory_logs").select("id, shop_id, product_id, quantity_change, reason, created_at").eq("shop_id", shop_id).eq("reason", reason).order("created_at", desc=True).order("id", desc=True).execute()
    return res.data or []

def delete_inventory_log(log_id: int) -> bool:
    client = get_supabase()
    res = client.table("inventory_logs").delete().eq("id", log_id).execute()
    return bool(res.data)
