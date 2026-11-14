from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_shop(owner_id: int, shop_name: str) -> int:
    result = execute_query(
        """
        INSERT INTO shops (owner_id, shop_name)
        VALUES (%s, %s)
        """,
        (owner_id, shop_name),
    )
    return result["lastrowid"]

def get_shop_by_id(shop_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, owner_id, shop_name
        FROM shops
        WHERE id = %s
        """,
        (shop_id,),
    )

def get_shops_by_owner(owner_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, owner_id, shop_name
        FROM shops
        WHERE owner_id = %s
        ORDER BY id
        """,
        (owner_id,),
    )

def update_shop(
    shop_id: int,
    *,
    shop_name: str | None = None,
) -> bool:
    if shop_name is None:
        return False

    result = execute_query(
        """
        UPDATE shops
        SET shop_name = %s
        WHERE id = %s
        """,
        (shop_name, shop_id),
    )
    return result["rowcount"] > 0

def delete_shop(shop_id: int) -> bool:
    result = execute_query(
        "DELETE FROM shops WHERE id = %s",
        (shop_id,),
    )
    return result["rowcount"] > 0
