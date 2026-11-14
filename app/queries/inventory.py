from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_inventory_record(
    shop_id: int,
    product_id: int,
    quantity: float = 0,
    low_stock_limit: float = 0,
) -> int:
    result = execute_query(
        """
        INSERT INTO inventory (shop_id, product_id, quantity, low_stock_limit)
        VALUES (%s, %s, %s, %s)
        """,
        (shop_id, product_id, quantity, low_stock_limit),
    )
    return result["lastrowid"]

def get_inventory_by_id(inventory_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, shop_id, product_id, quantity, low_stock_limit
        FROM inventory
        WHERE id = %s
        """,
        (inventory_id,),
    )

def get_inventory_by_product(
    shop_id: int,
    product_id: int,
) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, shop_id, product_id, quantity, low_stock_limit
        FROM inventory
        WHERE shop_id = %s AND product_id = %s
        ORDER BY id
        LIMIT 1
        """,
        (shop_id, product_id),
    )

def get_inventory_by_shop(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
            i.id,
            i.shop_id,
            i.product_id,
            p.name AS product_name,
            p.unit,
            i.quantity,
            i.low_stock_limit
        FROM inventory AS i
        JOIN products AS p ON p.id = i.product_id
        WHERE i.shop_id = %s
        ORDER BY p.name, i.id
        """,
        (shop_id,),
    )

def update_stock_quantity(inventory_id: int, quantity: float) -> bool:
    result = execute_query(
        """
        UPDATE inventory
        SET quantity = %s
        WHERE id = %s
        """,
        (quantity, inventory_id),
    )
    return result["rowcount"] > 0

def change_stock_quantity(
    shop_id: int,
    product_id: int,
    quantity_change: float,
) -> bool:
    from app.database.db_connection import get_connection

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE inventory
                SET quantity = quantity + %s
                WHERE shop_id = %s
                  AND product_id = %s
                  AND quantity + %s >= 0
                """,
                (quantity_change, shop_id, product_id, quantity_change),
            )
            affected = cursor.rowcount
        connection.commit()
        return affected > 0
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def update_low_stock_limit(
    shop_id: int,
    product_id: int,
    low_stock_limit: float,
) -> bool:
    result = execute_query(
        """
        UPDATE inventory
        SET low_stock_limit = %s
        WHERE shop_id = %s AND product_id = %s
        """,
        (low_stock_limit, shop_id, product_id),
    )
    return result["rowcount"] > 0

def get_low_stock_items(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
            i.id,
            i.shop_id,
            i.product_id,
            p.name AS product_name,
            p.unit,
            i.quantity,
            i.low_stock_limit
        FROM inventory AS i
        JOIN products AS p ON p.id = i.product_id
        WHERE i.shop_id = %s
          AND i.quantity <= i.low_stock_limit
        ORDER BY p.name, i.id
        """,
        (shop_id,),
    )

def delete_inventory_record(inventory_id: int) -> bool:
    result = execute_query(
        "DELETE FROM inventory WHERE id = %s",
        (inventory_id,),
    )
    return result["rowcount"] > 0
