from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_transaction(
    shop_id: int,
    customer_id: int,
    transaction_type: str,
    amount: float,
    description: str | None = None,
    idempotency_key: str | None = None,
) -> int:
    result = execute_query(
        """
        INSERT INTO transactions
            (shop_id, customer_id, type, amount, description, idempotency_key)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (shop_id, customer_id, transaction_type, amount, description, idempotency_key),
    )
    return result["lastrowid"]

def get_transaction_by_id(transaction_id: int, shop_id: int | None = None) -> dict[str, Any] | None:
    if shop_id is not None:
        return fetch_one(
            """
            SELECT id, shop_id, customer_id, type, amount, description, idempotency_key, created_at
            FROM transactions
            WHERE id = %s AND shop_id = %s
            """,
            (transaction_id, shop_id),
        )
    return fetch_one(
        """
        SELECT id, shop_id, customer_id, type, amount, description, idempotency_key, created_at
        FROM transactions
        WHERE id = %s
        """,
        (transaction_id,),
    )

def get_transaction_by_idempotency_key(shop_id: int, idempotency_key: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, shop_id, customer_id, type, amount, description, idempotency_key, created_at
        FROM transactions
        WHERE shop_id = %s AND idempotency_key = %s
        """,
        (shop_id, idempotency_key),
    )

def get_transactions_by_shop(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT t.id, t.shop_id, t.customer_id, c.name AS customer_name, t.type, t.amount, t.description, t.idempotency_key, t.created_at
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.shop_id = %s
        ORDER BY t.created_at DESC, t.id DESC
        """,
        (shop_id,),
    )

def get_transactions_by_customer(
    shop_id: int,
    customer_id: int,
) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, shop_id, customer_id, type, amount, description, idempotency_key, created_at
        FROM transactions
        WHERE shop_id = %s AND customer_id = %s
        ORDER BY created_at DESC, id DESC
        """,
        (shop_id, customer_id),
    )

def get_shop_financial_summary_in_db(shop_id: int) -> dict[str, Any]:
    row = fetch_one(
        """
        SELECT 
            COUNT(t.id) AS total_transactions,
            COUNT(DISTINCT t.customer_id) AS active_customers,
            COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) AS total_sales_credit,
            COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00) AS total_payments_received,
            ROUND(
                COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) -
                COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00),
                2
            ) AS net_outstanding_credit,
            CASE 
                WHEN COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) > 0
                THEN ROUND(
                    (COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00) / 
                     SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0.00 END)) * 100,
                    2
                )
                ELSE 100.00
            END AS recovery_rate_percentage,
            COALESCE(SUM(CASE WHEN DATE(t.created_at) = CURRENT_DATE AND t.type = 'credit' THEN t.amount ELSE 0.00 END), 0.00) AS today_credit_sales,
            COALESCE(SUM(CASE WHEN DATE(t.created_at) = CURRENT_DATE AND t.type = 'payment' THEN t.amount ELSE 0.00 END), 0.00) AS today_payments_received,
            COUNT(CASE WHEN DATE(t.created_at) = CURRENT_DATE THEN t.id ELSE NULL END) AS today_transactions_count
        FROM transactions t
        WHERE t.shop_id = %s
        """,
        (shop_id,),
    )
    if not row:
        return {
            "total_transactions": 0,
            "active_customers": 0,
            "total_sales_credit": 0.0,
            "total_payments_received": 0.0,
            "net_outstanding_credit": 0.0,
            "recovery_rate_percentage": 100.0,
            "today_credit_sales": 0.0,
            "today_payments_received": 0.0,
            "today_transactions_count": 0,
        }
    return row

def update_transaction(
    transaction_id: int,
    *,
    shop_id: int | None = None,
    transaction_type: str | None = None,
    amount: float | None = None,
    description: str | None = None,
    idempotency_key: str | None = None,
) -> bool:
    updates: list[str] = []
    params: list[Any] = []

    if transaction_type is not None:
        updates.append("type = %s")
        params.append(transaction_type)

    if amount is not None:
        updates.append("amount = %s")
        params.append(amount)

    if description is not None:
        updates.append("description = %s")
        params.append(description)

    if idempotency_key is not None:
        updates.append("idempotency_key = %s")
        params.append(idempotency_key)

    if not updates:
        return False

    params.append(transaction_id)
    where_clause = "WHERE id = %s"
    if shop_id is not None:
        where_clause += " AND shop_id = %s"
        params.append(shop_id)

    result = execute_query(
        f"UPDATE transactions SET {', '.join(updates)} {where_clause}",
        tuple(params),
    )
    return result["rowcount"] > 0

def delete_transaction(transaction_id: int, shop_id: int | None = None) -> bool:
    if shop_id is not None:
        result = execute_query(
            "DELETE FROM transactions WHERE id = %s AND shop_id = %s",
            (transaction_id, shop_id),
        )
    else:
        result = execute_query(
            "DELETE FROM transactions WHERE id = %s",
            (transaction_id,),
        )
    return result["rowcount"] > 0
