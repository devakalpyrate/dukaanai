from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_transaction(
    shop_id: int,
    customer_id: int,
    transaction_type: str,
    amount: float,
    description: str | None = None,
) -> int:
    result = execute_query(
        """
        INSERT INTO transactions
            (shop_id, customer_id, type, amount, description)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (shop_id, customer_id, transaction_type, amount, description),
    )
    return result["lastrowid"]

def get_transaction_by_id(transaction_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, shop_id, customer_id, type, amount, description, created_at
        FROM transactions
        WHERE id = %s
        """,
        (transaction_id,),
    )

def get_transactions_by_shop(shop_id: int) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, shop_id, customer_id, type, amount, description, created_at
        FROM transactions
        WHERE shop_id = %s
        ORDER BY created_at DESC, id DESC
        """,
        (shop_id,),
    )

def get_transactions_by_customer(
    shop_id: int,
    customer_id: int,
) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, shop_id, customer_id, type, amount, description, created_at
        FROM transactions
        WHERE shop_id = %s AND customer_id = %s
        ORDER BY created_at DESC, id DESC
        """,
        (shop_id, customer_id),
    )

def update_transaction(
    transaction_id: int,
    *,
    transaction_type: str | None = None,
    amount: float | None = None,
    description: str | None = None,
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

    if not updates:
        return False

    params.append(transaction_id)
    result = execute_query(
        f"UPDATE transactions SET {', '.join(updates)} WHERE id = %s",
        tuple(params),
    )
    return result["rowcount"] > 0

def delete_transaction(transaction_id: int) -> bool:
    result = execute_query(
        "DELETE FROM transactions WHERE id = %s",
        (transaction_id,),
    )
    return result["rowcount"] > 0
