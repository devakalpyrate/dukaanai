from typing import Any
from backend.database.supabase_client import get_supabase, get_next_id

def create_user(
    name: str,
    email: str,
    password_hash: str,
    phone: str | None = None,
) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("users"),
        "name": name,
        "email": email,
        "password": password_hash,
        "phone": phone
    }
    res = client.table("users").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("users").select("id, name, email, phone").eq("id", user_id).limit(1).execute()
    return res.data[0] if res.data else None

def get_user_by_email(email: str) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("users").select("id, name, email, phone").eq("email", email).limit(1).execute()
    return res.data[0] if res.data else None

def get_user_by_phone(phone: str) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("users").select("id, name, email, phone").eq("phone", phone).limit(1).execute()
    return res.data[0] if res.data else None

def get_user_credentials_by_email(email: str) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("users").select("id, name, email, password, phone").eq("email", email).limit(1).execute()
    return res.data[0] if res.data else None

def get_user_credentials_by_email_or_phone(identifier: str) -> dict[str, Any] | None:
    raw = (identifier or "").strip()
    client = get_supabase()
    res = client.table("users").select("id, name, email, password, phone").eq("email", raw).limit(1).execute()
    if res.data:
        return res.data[0]
    res_phone = client.table("users").select("id, name, email, password, phone").eq("phone", raw).limit(1).execute()
    if res_phone.data:
        return res_phone.data[0]
    digits = "".join(c for c in raw if c.isdigit())
    if len(digits) >= 10:
        last10 = digits[-10:]
        res_like = client.table("users").select("id, name, email, password, phone").ilike("phone", f"%{last10}").limit(1).execute()
        if res_like.data:
            return res_like.data[0]
    return None

def get_all_users() -> list[dict[str, Any]]:
    client = get_supabase()
    res = client.table("users").select("id, name, email, phone").order("id").execute()
    return res.data or []

def update_user(
    user_id: int,
    *,
    name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    password_hash: str | None = None,
) -> bool:
    client = get_supabase()
    payload = {}
    if name is not None:
        payload["name"] = name
    if email is not None:
        payload["email"] = email
    if phone is not None:
        payload["phone"] = phone
    if password_hash is not None:
        payload["password"] = password_hash
    if not payload:
        return False
    res = client.table("users").update(payload).eq("id", user_id).execute()
    return bool(res.data)

def delete_user(user_id: int) -> bool:
    client = get_supabase()
    res = client.table("users").delete().eq("id", user_id).execute()
    return bool(res.data)

def record_user_login(user_id: int) -> None:
    client = get_supabase()
    try:
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()
        client.table("users").update({"last_login_at": now_iso}).eq("id", user_id).execute()
    except Exception:
        pass

def soft_delete_user(user_id: int) -> bool:
    client = get_supabase()
    try:
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()
        res = client.table("users").update({"deleted_at": now_iso}).eq("id", user_id).execute()
        return bool(res.data)
    except Exception:
        return False
