from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_inventory_log(
    shop_id: int,
    product_id: int,
    quantity_change: float,
    reason: str | None = None,
) -> int:
    result = execute_query(
        """
        INSERT INTO inventory_logs
            (shop_id, product_id, quantity_change, reason)
        VALUES (%s, %s, %s, %s)
        """,
        (shop_id, product_id, quantity_change, reason),
    )
    return result["lastrowid"]

def get_inventory_log_by_id(log_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT
            id, shop_id, product_id, quantity_change, reason, created_at
        FROM inventory_logs
        WHERE id = %s
        """,
        (log_id,),
    )

def get_inventory_logs_by_shop(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
            id, shop_id, product_id, quantity_change, reason, created_at
        FROM inventory_logs
        WHERE shop_id = %s
        ORDER BY created_at DESC, id DESC
        """,
        (shop_id,),
    )

def get_inventory_logs_by_product(
    shop_id: int,
    product_id: int,
) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
            id, shop_id, product_id, quantity_change, reason, created_at
        FROM inventory_logs
        WHERE shop_id = %s AND product_id = %s
        ORDER BY created_at DESC, id DESC
        """,
        (shop_id, product_id),
    )

def get_inventory_logs_by_reason(
    shop_id: int,
    reason: str,
) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
            id, shop_id, product_id, quantity_change, reason, created_at
        FROM inventory_logs
        WHERE shop_id = %s AND reason = %s
        ORDER BY created_at DESC, id DESC
        """,
        (shop_id, reason),
    )

def delete_inventory_log(log_id: int) -> bool:
    result = execute_query(
        "DELETE FROM inventory_logs WHERE id = %s",
        (log_id,),
    )
    return result["rowcount"] > 0
