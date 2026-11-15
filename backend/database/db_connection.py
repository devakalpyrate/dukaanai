from backend.database.supabase_client import get_supabase

def get_connection():
    return get_supabase()

if __name__ == "__main__":
    client = get_connection()
    res = client.table("global_market_prices").select("count", count="exact").execute()
    print("Supabase Connected! Total items in global_market_prices:", res.count)
