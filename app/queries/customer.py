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

def get_customer_by_id(customer_id: int, shop_id: int | None = None) -> dict[str, Any] | None:
    if shop_id is not None:
        return fetch_one(
            """
            SELECT id, shop_id, name, phone
            FROM customers
            WHERE id = %s AND shop_id = %s
            """,
            (customer_id, shop_id),
        )
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

def get_customers_with_balances_by_shop(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT 
            c.id,
            c.shop_id,
            c.name,
            COALESCE(c.phone, '') AS phone,
            COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) AS total_credit,
            COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00) AS total_paid,
            ROUND(
                COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) -
                COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00),
                2
            ) AS balance,
            COUNT(t.id) AS transaction_count,
            MAX(t.created_at) AS last_transaction,
            CASE 
                WHEN COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) > 0
                THEN ROUND(
                    (COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00) / 
                     SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END)) * 100, 
                    2
                )
                ELSE 100.00
            END AS recovery_percentage
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customer_id AND t.shop_id = c.shop_id
        WHERE c.shop_id = %s
        GROUP BY c.id, c.shop_id, c.name, c.phone
        ORDER BY balance DESC, c.name ASC
        """,
        (shop_id,),
    )

def get_customer_balance_in_db(shop_id: int, customer_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT 
            c.id,
            c.shop_id,
            c.name,
            COALESCE(c.phone, '') AS phone,
            COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) AS total_credit,
            COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00) AS total_paid,
            ROUND(
                COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) -
                COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00),
                2
            ) AS balance,
            COUNT(t.id) AS transaction_count,
            MAX(t.created_at) AS last_transaction,
            CASE 
                WHEN COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) > 0
                THEN ROUND(
                    (COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00) / 
                     SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END)) * 100, 
                    2
                )
                ELSE 100.00
            END AS recovery_percentage
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customer_id AND t.shop_id = c.shop_id
        WHERE c.id = %s AND c.shop_id = %s
        GROUP BY c.id, c.shop_id, c.name, c.phone
        """,
        (customer_id, shop_id),
    )

def update_customer(
    customer_id: int,
    *,
    shop_id: int | None = None,
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
    where_clause = "WHERE id = %s"
    if shop_id is not None:
        where_clause += " AND shop_id = %s"
        params.append(shop_id)

    result = execute_query(
        f"UPDATE customers SET {', '.join(updates)} {where_clause}",
        tuple(params),
    )
    return result["rowcount"] > 0

def delete_customer(customer_id: int, shop_id: int | None = None) -> bool:
    if shop_id is not None:
        result = execute_query(
            "DELETE FROM customers WHERE id = %s AND shop_id = %s",
            (customer_id, shop_id),
        )
    else:
        result = execute_query(
            "DELETE FROM customers WHERE id = %s",
            (customer_id,),
        )
    return result["rowcount"] > 0
