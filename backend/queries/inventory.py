from decimal import Decimal
from typing import Any
from backend.database.supabase_client import get_supabase, get_next_id

def create_inventory_record(
    shop_id: int,
    product_id: int,
    quantity: float = 0,
    low_stock_limit: float = 0,
) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("inventory"),
        "shop_id": shop_id,
        "product_id": product_id,
        "quantity": quantity,
        "low_stock_limit": low_stock_limit
    }
    res = client.table("inventory").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_inventory_by_id(inventory_id: int) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("inventory").select("id, shop_id, product_id, quantity, low_stock_limit").eq("id", inventory_id).limit(1).execute()
    return res.data[0] if res.data else None

def get_inventory_by_product(
    shop_id: int,
    product_id: int,
) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("inventory").select("id, shop_id, product_id, quantity, low_stock_limit").eq("shop_id", shop_id).eq("product_id", product_id).limit(1).execute()
    return res.data[0] if res.data else None

def get_inventory_by_shop(shop_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    inv_res = client.table("inventory").select("id, shop_id, product_id, quantity, low_stock_limit").eq("shop_id", shop_id).execute()
    inv_items = inv_res.data or []
    if not inv_items:
        return []

    prod_res = client.table("products").select("id, name, unit, price").eq("shop_id", shop_id).execute()
    prod_map = {p["id"]: p for p in (prod_res.data or [])}

    results = []
    for item in inv_items:
        p = prod_map.get(item["product_id"])
        if not p:
            continue
        qty = Decimal(str(item.get("quantity") or "0.00"))
        limit = Decimal(str(item.get("low_stock_limit") or "0.00"))
        price = Decimal(str(p.get("price") or "0.00"))
        total_val = round(qty * price, 2)
        results.append({
            "id": item["id"],
            "shop_id": item["shop_id"],
            "product_id": item["product_id"],
            "product_name": p["name"],
            "unit": p.get("unit") or "unit",
            "price_per_unit": price,
            "quantity": qty,
            "low_stock_limit": limit,
            "total_value": total_val,
        })
    results.sort(key=lambda x: (x["product_name"], x["id"]))
    return results

def update_stock_quantity(inventory_id: int, quantity: float) -> bool:
    client = get_supabase()
    res = client.table("inventory").update({"quantity": quantity}).eq("id", inventory_id).execute()
    return bool(res.data)

def change_stock_quantity(
    shop_id: int,
    product_id: int,
    quantity_change: float,
) -> bool:
    client = get_supabase()
    existing = get_inventory_by_product(shop_id, product_id)
    if not existing:
        return False
    curr_qty = float(existing.get("quantity") or 0.0)
    new_qty = curr_qty + float(quantity_change)
    if new_qty < 0:
        return False
    res = client.table("inventory").update({"quantity": new_qty}).eq("id", existing["id"]).execute()
    return bool(res.data)

def update_low_stock_limit(
    shop_id: int,
    product_id: int,
    low_stock_limit: float,
) -> bool:
    client = get_supabase()
    res = client.table("inventory").update({"low_stock_limit": low_stock_limit}).eq("shop_id", shop_id).eq("product_id", product_id).execute()
    return bool(res.data)

def get_low_stock_items(shop_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    inv_res = client.table("inventory").select("id, shop_id, product_id, quantity, low_stock_limit").eq("shop_id", shop_id).execute()
    inv_items = inv_res.data or []
    if not inv_items:
        return []

    prod_res = client.table("products").select("id, name, unit").eq("shop_id", shop_id).execute()
    prod_map = {p["id"]: p for p in (prod_res.data or [])}

    results = []
    for item in inv_items:
        qty = Decimal(str(item.get("quantity") or "0.00"))
        limit = Decimal(str(item.get("low_stock_limit") or "0.00"))
        if qty <= limit:
            p = prod_map.get(item["product_id"])
            if p:
                results.append({
                    "id": item["id"],
                    "shop_id": item["shop_id"],
                    "product_id": item["product_id"],
                    "product_name": p["name"],
                    "unit": p.get("unit") or "unit",
                    "quantity": qty,
                    "low_stock_limit": limit,
                })
    results.sort(key=lambda x: (x["product_name"], x["id"]))
    return results

def delete_inventory_record(inventory_id: int) -> bool:
    client = get_supabase()
    res = client.table("inventory").delete().eq("id", inventory_id).execute()
    return bool(res.data)
