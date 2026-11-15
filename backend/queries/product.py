from decimal import Decimal
from typing import Any
from backend.database.supabase_client import get_supabase, get_next_id

def create_product(
    shop_id: int,
    name: str,
    price: float,
    unit: str | None = None,
) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("products"),
        "shop_id": shop_id,
        "name": name,
        "price": price,
        "unit": unit or "unit"
    }
    res = client.table("products").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_product_by_id(product_id: int) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("products").select("id, shop_id, name, price, unit").eq("id", product_id).limit(1).execute()
    return res.data[0] if res.data else None

def get_products_by_shop(shop_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    p_res = client.table("products").select("id, shop_id, name, price, unit").eq("shop_id", shop_id).order("name").order("id").execute()
    products = p_res.data or []
    if not products:
        return []

    inv_res = client.table("inventory").select("product_id, quantity, low_stock_limit").eq("shop_id", shop_id).execute()
    inv_map = {item["product_id"]: item for item in (inv_res.data or [])}

    results = []
    for p in products:
        pid = p["id"]
        inv = inv_map.get(pid, {})
        qty = Decimal(str(inv.get("quantity") or "0.00"))
        limit = Decimal(str(inv.get("low_stock_limit") or "5.00"))
        price = Decimal(str(p.get("price") or "0.00"))
        total_val = round(qty * price, 2)
        results.append({
            "id": p["id"],
            "shop_id": p["shop_id"],
            "name": p["name"],
            "price": price,
            "unit": p.get("unit") or "unit",
            "stock": qty,
            "quantity": qty,
            "low_stock_limit": limit,
            "total_value": total_val,
        })
    return results

def search_products(shop_id: int, search_term: str) -> list[dict[str, Any]]:
    client = get_supabase()
    term = search_term.strip()
    res = client.table("products").select("id, shop_id, name, price, unit").eq("shop_id", shop_id).ilike("name", f"%{term}%").order("name").order("id").execute()
    return res.data or []

def update_product(
    product_id: int,
    *,
    name: str | None = None,
    price: float | None = None,
    unit: str | None = None,
) -> bool:
    client = get_supabase()
    payload = {}
    if name is not None:
        payload["name"] = name
    if price is not None:
        payload["price"] = price
    if unit is not None:
        payload["unit"] = unit
    if not payload:
        return False
    res = client.table("products").update(payload).eq("id", product_id).execute()
    return bool(res.data)

def delete_product(product_id: int) -> bool:
    client = get_supabase()
    res = client.table("products").delete().eq("id", product_id).execute()
    return bool(res.data)
