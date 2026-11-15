from typing import Any, Optional
from app.database.supabase_client import get_supabase, get_next_id

def get_settings_by_shop(shop_id: int) -> Optional[dict[str, Any]]:
    client = get_supabase()
    res = client.table("settings").select(
        "id, shop_id, user_id, upi_id, upi_pin, phone, shop_name, shop_address, gstin, theme, language, low_stock_alert, updated_at"
    ).eq("shop_id", shop_id).limit(1).execute()
    return res.data[0] if res.data else None

def upsert_settings(
    shop_id: int,
    user_id: int,
    *,
    upi_id: str = "",
    upi_pin: str = "",
    phone: str = "",
    shop_name: str = "",
    shop_address: str = "",
    gstin: str = "",
    theme: str = "dark",
    language: str = "hi",
    low_stock_alert: int = 1,
) -> bool:
    client = get_supabase()
    payload = {
        "shop_id": shop_id,
        "user_id": user_id,
        "upi_id": upi_id,
        "upi_pin": upi_pin,
        "phone": phone,
        "shop_name": shop_name,
        "shop_address": shop_address,
        "gstin": gstin,
        "theme": theme,
        "language": language,
        "low_stock_alert": bool(low_stock_alert)
    }
    existing = get_settings_by_shop(shop_id)
    if existing:
        client.table("settings").update(payload).eq("shop_id", shop_id).execute()
    else:
        payload["id"] = get_next_id("settings")
        client.table("settings").insert(payload).execute()
    return True
