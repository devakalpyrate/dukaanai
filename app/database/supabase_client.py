import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tsymnjjhuedkpzsnsouo.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_secret_eh1tOSlzQ5nQ-5qrS6lrXA_sQugZUQ9")

_client: Client | None = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client

def get_next_id(table_name: str, min_start: int = 1000) -> int:
    client = get_supabase()
    res = client.table(table_name).select("id").order("id", desc=True).limit(1).execute()
    if res.data and len(res.data) > 0:
        return max(res.data[0]["id"] + 1, min_start)
    return min_start
