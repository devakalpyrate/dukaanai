from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_user(
    name: str,
    email: str,
    password_hash: str,
) -> int:
    result = execute_query(
        """
        INSERT INTO users (name, email, password)
        VALUES (%s, %s, %s)
        """,
        (name, email, password_hash),
    )
    return result["lastrowid"]

def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, name, email
        FROM users
        WHERE id = %s
        """,
        (user_id,),
    )

def get_user_by_email(email: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, name, email
        FROM users
        WHERE email = %s
        """,
        (email,),
    )

def get_user_credentials_by_email(email: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, name, email, password
        FROM users
        WHERE email = %s
        """,
        (email,),
    )

def get_all_users() -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, name, email
        FROM users
        ORDER BY id
        """
    )

def update_user(
    user_id: int,
    *,
    name: str | None = None,
    email: str | None = None,
    password_hash: str | None = None,
) -> bool:
    updates: list[str] = []
    params: list[Any] = []

    if name is not None:
        updates.append("name = %s")
        params.append(name)

    if email is not None:
        updates.append("email = %s")
        params.append(email)

    if password_hash is not None:
        updates.append("password = %s")
        params.append(password_hash)

    if not updates:
        return False

    params.append(user_id)
    result = execute_query(
        f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
        tuple(params),
    )
    return result["rowcount"] > 0

def delete_user(user_id: int) -> bool:
    result = execute_query(
        "DELETE FROM users WHERE id = %s",
        (user_id,),
    )
    return result["rowcount"] > 0
