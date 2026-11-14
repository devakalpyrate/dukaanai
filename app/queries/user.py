from typing import Any

from app.database.query import execute_query, fetch_all, fetch_one

def create_user(
    name: str,
    email: str,
    password_hash: str,
    phone: str | None = None,
) -> int:
    result = execute_query(
        """
        INSERT INTO users (name, email, password, phone)
        VALUES (%s, %s, %s, %s)
        """,
        (name, email, password_hash, phone),
    )
    return result["lastrowid"]

def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, name, email, phone
        FROM users
        WHERE id = %s
        """,
        (user_id,),
    )

def get_user_by_email(email: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, name, email, phone
        FROM users
        WHERE email = %s
        """,
        (email,),
    )

def get_user_by_phone(phone: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, name, email, phone
        FROM users
        WHERE phone = %s
        """,
        (phone,),
    )

def get_user_credentials_by_email(email: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, name, email, password, phone
        FROM users
        WHERE email = %s
        """,
        (email,),
    )

def get_user_credentials_by_email_or_phone(identifier: str) -> dict[str, Any] | None:
    raw = (identifier or "").strip()
    digits = "".join(c for c in raw if c.isdigit())
    if len(digits) >= 10:
        last10 = digits[-10:]
        return fetch_one(
            """
            SELECT id, name, email, password, phone
            FROM users
            WHERE email = %s OR phone = %s OR phone LIKE %s
            ORDER BY id ASC
            LIMIT 1
            """,
            (raw, raw, f"%{last10}"),
        )
    return fetch_one(
        """
        SELECT id, name, email, password, phone
        FROM users
        WHERE email = %s OR phone = %s
        ORDER BY id ASC
        LIMIT 1
        """,
        (raw, raw),
    )

def get_all_users() -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, name, email, phone
        FROM users
        ORDER BY id
        """
    )

def update_user(
    user_id: int,
    *,
    name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
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

    if phone is not None:
        updates.append("phone = %s")
        params.append(phone)

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
