from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_customer(
    shop_id: int,
    name: str,
    phone: str | None = None,
) -> int:
    result = execute_query(
        """
        INSERT INTO customers (shop_id, name, phone)
        VALUES (%s, %s, %s)
        """,
        (shop_id, name, phone),
    )
    return result["lastrowid"]

def get_customer_by_id(customer_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, shop_id, name, phone
        FROM customers
        WHERE id = %s
        """,
        (customer_id,),
    )

def get_customers_by_shop(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, shop_id, name, phone
        FROM customers
        WHERE shop_id = %s
        ORDER BY name, id
        """,
        (shop_id,),
    )

def search_customers(
    shop_id: int,
    search_term: str,
) -> list[dict[str, Any]]:
    pattern = f"%{search_term}%"
    return fetch_all(
        """
        SELECT id, shop_id, name, phone
        FROM customers
        WHERE shop_id = %s
          AND (name LIKE %s OR phone LIKE %s)
        ORDER BY name, id
        """,
        (shop_id, pattern, pattern),
    )

def update_customer(
    customer_id: int,
    *,
    name: str | None = None,
    phone: str | None = None,
) -> bool:
    updates: list[str] = []
    params: list[Any] = []

    if name is not None:
        updates.append("name = %s")
        params.append(name)

    if phone is not None:
        updates.append("phone = %s")
        params.append(phone)

    if not updates:
        return False

    params.append(customer_id)
    result = execute_query(
        f"UPDATE customers SET {', '.join(updates)} WHERE id = %s",
        tuple(params),
    )
    return result["rowcount"] > 0

def delete_customer(customer_id: int) -> bool:
    result = execute_query(
        "DELETE FROM customers WHERE id = %s",
        (customer_id,),
    )
    return result["rowcount"] > 0
