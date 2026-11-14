from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_shop(owner_id: int, shop_name: str, address: str | None = None) -> int:
    result = execute_query(
        """
        INSERT INTO shops (owner_id, shop_name, address)
        VALUES (%s, %s, %s)
        """,
        (owner_id, shop_name, address),
    )
    return result["lastrowid"]

def get_shop_by_id(shop_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, owner_id, shop_name, address
        FROM shops
        WHERE id = %s
        """,
        (shop_id,),
    )

def get_shops_by_owner(owner_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, owner_id, shop_name, address
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
    address: str | None = None,
) -> bool:
    updates: list[str] = []
    params: list[Any] = []

    if shop_name is not None:
        updates.append("shop_name = %s")
        params.append(shop_name)

    if address is not None:
        updates.append("address = %s")
        params.append(address)

    if not updates:
        return False

    params.append(shop_id)
    result = execute_query(
        f"UPDATE shops SET {', '.join(updates)} WHERE id = %s",
        tuple(params),
    )
    return result["rowcount"] > 0

def delete_shop(shop_id: int) -> bool:
    result = execute_query(
        "DELETE FROM shops WHERE id = %s",
        (shop_id,),
    )
    return result["rowcount"] > 0
