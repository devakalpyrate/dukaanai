from typing import Any
from app.database.query import execute_query, fetch_all, fetch_one

def create_notification(
    shop_id: int,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
) -> int:
    result = execute_query(
        """
        INSERT INTO notifications (shop_id, user_id, title, message, type)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (shop_id, user_id, title, message, notification_type),
    )
    return result["lastrowid"]

def get_notifications_by_shop(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, shop_id, user_id, title, message, type, is_read, created_at
        FROM notifications
        WHERE shop_id = %s
        ORDER BY created_at DESC, id DESC
        LIMIT 50
        """,
        (shop_id,),
    )

def delete_notification(shop_id: int, notification_id: int) -> bool:
    result = execute_query(
        """
        DELETE FROM notifications
        WHERE shop_id = %s AND id = %s
        """,
        (shop_id, notification_id),
    )
    return result["rowcount"] > 0

def clear_all_notifications(shop_id: int) -> bool:
    result = execute_query(
        """
        DELETE FROM notifications
        WHERE shop_id = %s
        """,
        (shop_id,),
    )
    return result["rowcount"] > 0

def mark_all_read(shop_id: int) -> bool:
    result = execute_query(
        """
        UPDATE notifications
        SET is_read = 1
        WHERE shop_id = %s
        """,
        (shop_id,),
    )
    return result["rowcount"] > 0
