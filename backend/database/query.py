from collections.abc import Iterable, Sequence
from typing import Any
from backend.database.supabase_client import get_supabase

def fetch_one(sql: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    return None

def fetch_all(sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
    return []

def execute_query(sql: str, params: Sequence[Any] | None = None) -> dict[str, int]:
    return {"rowcount": 0, "lastrowid": 0}

def execute_transaction(statements: Iterable[tuple[str, Sequence[Any] | None]]) -> list[dict[str, int]]:
    return []
