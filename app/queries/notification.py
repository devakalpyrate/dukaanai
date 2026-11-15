from typing import Any
from app.database.supabase_client import get_supabase, get_next_id

def create_notification(
    shop_id: int,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("notifications"),
        "shop_id": shop_id,
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type
    }
    res = client.table("notifications").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_notifications_by_shop(shop_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    res = client.table("notifications").select("id, shop_id, user_id, title, message, type, is_read, created_at").eq("shop_id", shop_id).order("created_at", desc=True).order("id", desc=True).limit(50).execute()
    return res.data or []

def delete_notification(shop_id: int, notification_id: int) -> bool:
    client = get_supabase()
    res = client.table("notifications").delete().eq("shop_id", shop_id).eq("id", notification_id).execute()
    return bool(res.data)

def clear_all_notifications(shop_id: int) -> bool:
    client = get_supabase()
    res = client.table("notifications").delete().eq("shop_id", shop_id).execute()
    return bool(res.data)

def mark_notification_read(shop_id: int, notification_id: int) -> bool:
    client = get_supabase()
    res = client.table("notifications").update({"is_read": True}).eq("shop_id", shop_id).eq("id", notification_id).execute()
    return bool(res.data)

def batch_mark_read(shop_id: int, notification_ids: list[int]) -> int:
    if not notification_ids:
        return 0
    client = get_supabase()
    res = client.table("notifications").update({"is_read": True}).eq("shop_id", shop_id).in_("id", notification_ids).execute()
    return len(res.data or [])

def batch_delete_notifications(shop_id: int, notification_ids: list[int]) -> int:
    if not notification_ids:
        return 0
    client = get_supabase()
    res = client.table("notifications").delete().eq("shop_id", shop_id).in_("id", notification_ids).execute()
    return len(res.data or [])

def mark_all_read(shop_id: int) -> bool:
    client = get_supabase()
    res = client.table("notifications").update({"is_read": True}).eq("shop_id", shop_id).execute()
    return bool(res.data)
