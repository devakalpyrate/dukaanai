from typing import Any, List, Optional
from backend.database.supabase_client import get_supabase, get_next_id

def create_supplier(
    shop_id: int,
    name: str,
    category: str = "general",
    phone: Optional[str] = None,
) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("suppliers"),
        "shop_id": shop_id,
        "name": name,
        "category": category,
        "phone": phone
    }
    res = client.table("suppliers").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_suppliers_by_shop(shop_id: int) -> List[dict[str, Any]]:
    client = get_supabase()
    res = client.table("suppliers").select("id, shop_id, name, category, phone, created_at").eq("shop_id", shop_id).order("name").execute()
    return res.data or []

def get_supplier_by_id(supplier_id: int, shop_id: int) -> Optional[dict[str, Any]]:
    client = get_supabase()
    res = client.table("suppliers").select("id, shop_id, name, category, phone, created_at").eq("id", supplier_id).eq("shop_id", shop_id).limit(1).execute()
    return res.data[0] if res.data else None

def find_supplier_by_category_or_name(shop_id: int, term: str) -> Optional[dict[str, Any]]:
    client = get_supabase()
    clean_term = term.strip().lower()
    res = client.table("suppliers").select("id, shop_id, name, category, phone, created_at").eq("shop_id", shop_id).or_(f"category.ilike.%{clean_term}%,name.ilike.%{clean_term}%").limit(1).execute()
    if res.data:
        return res.data[0]
    first_res = client.table("suppliers").select("id, shop_id, name, category, phone, created_at").eq("shop_id", shop_id).order("id").limit(1).execute()
    return first_res.data[0] if first_res.data else None

def delete_supplier(supplier_id: int, shop_id: int) -> bool:
    client = get_supabase()
    res = client.table("suppliers").delete().eq("id", supplier_id).eq("shop_id", shop_id).execute()
    return bool(res.data)
