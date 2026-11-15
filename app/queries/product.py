from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_product(
    shop_id: int,
    name: str,
    price: float,
    unit: str | None = None,
) -> int:
    result = execute_query(
        """
        INSERT INTO products (shop_id, name, price, unit)
        VALUES (%s, %s, %s, %s)
        """,
        (shop_id, name, price, unit),
    )
    return result["lastrowid"]

def get_product_by_id(product_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, shop_id, name, price, unit
        FROM products
        WHERE id = %s
        """,
        (product_id,),
    )

def get_products_by_shop(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
            p.id,
            p.shop_id,
            p.name,
            p.price,
            p.unit,
            COALESCE(i.quantity, 0.00) AS stock,
            COALESCE(i.quantity, 0.00) AS quantity,
            COALESCE(i.low_stock_limit, 5.00) AS low_stock_limit,
            ROUND(COALESCE(i.quantity, 0.00) * p.price, 2) AS total_value
        FROM products AS p
        LEFT JOIN inventory AS i ON i.product_id = p.id AND i.shop_id = p.shop_id
        WHERE p.shop_id = %s
        ORDER BY p.name, p.id
        """,
        (shop_id,),
    )

def search_products(shop_id: int, search_term: str) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, shop_id, name, price, unit
        FROM products
        WHERE shop_id = %s AND name LIKE %s
        ORDER BY name, id
        """,
        (shop_id, f"%{search_term}%"),
    )

def update_product(
    product_id: int,
    *,
    name: str | None = None,
    price: float | None = None,
    unit: str | None = None,
) -> bool:
    updates: list[str] = []
    params: list[Any] = []

    if name is not None:
        updates.append("name = %s")
        params.append(name)

    if price is not None:
        updates.append("price = %s")
        params.append(price)

    if unit is not None:
        updates.append("unit = %s")
        params.append(unit)

    if not updates:
        return False

    params.append(product_id)
    result = execute_query(
        f"UPDATE products SET {', '.join(updates)} WHERE id = %s",
        tuple(params),
    )
    return result["rowcount"] > 0

def delete_product(product_id: int) -> bool:
    result = execute_query(
        "DELETE FROM products WHERE id = %s",
        (product_id,),
    )
    return result["rowcount"] > 0
