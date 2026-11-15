import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

_client: Client | None = None
_cached_key: str | None = None

def get_supabase() -> Client:
    global _client, _cached_key
    load_dotenv(dotenv_path=env_path, override=True)
    current_url = os.getenv("SUPABASE_URL", "")
    current_key = os.getenv("SUPABASE_KEY", "")
    if _client is None or _cached_key != current_key:
        _client = create_client(current_url, current_key)
        _cached_key = current_key
    return _client

def get_next_id(table_name: str, min_start: int = 1000) -> int:
    client = get_supabase()
    res = client.table(table_name).select("id").order("id", desc=True).limit(1).execute()
    if res.data and len(res.data) > 0:
        return max(res.data[0]["id"] + 1, min_start)
    return min_start
