from decimal import Decimal
from typing import Any
from backend.database.supabase_client import get_supabase, get_next_id
from backend.security.sql_guard import sanitize_search_term

def create_customer(
    shop_id: int,
    name: str,
    phone: str | None = None,
) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("customers"),
        "shop_id": shop_id,
        "name": name,
        "phone": phone
    }
    res = client.table("customers").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_customer_by_id(customer_id: int, shop_id: int | None = None) -> dict[str, Any] | None:
    client = get_supabase()
    query = client.table("customers").select("id, shop_id, name, phone").eq("id", customer_id)
    if shop_id is not None:
        query = query.eq("shop_id", shop_id)
    res = query.limit(1).execute()
    return res.data[0] if res.data else None

def get_customers_by_shop(shop_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    res = client.table("customers").select("id, shop_id, name, phone").eq("shop_id", shop_id).order("name").order("id").execute()
    return res.data or []

def search_customers(
    shop_id: int,
    search_term: str,
) -> list[dict[str, Any]]:
    client = get_supabase()
    term = sanitize_search_term(search_term)
    if not term:
        return []
    res = client.table("customers").select("id, shop_id, name, phone").eq("shop_id", shop_id).or_(f"name.ilike.%{term}%,phone.ilike.%{term}%").order("name").order("id").execute()
    return res.data or []

def get_customers_with_balances_by_shop(shop_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    c_res = client.table("customers").select("id, shop_id, name, phone").eq("shop_id", shop_id).execute()
    customers = c_res.data or []
    if not customers:
        return []

    t_res = client.table("transactions").select("id, customer_id, type, amount, created_at").eq("shop_id", shop_id).execute()
    txs = t_res.data or []

    tx_by_cust: dict[int, list[dict[str, Any]]] = {}
    for t in txs:
        cid = t.get("customer_id")
        if cid not in tx_by_cust:
            tx_by_cust[cid] = []
        tx_by_cust[cid].append(t)

    results = []
    for c in customers:
        cid = c["id"]
        c_txs = tx_by_cust.get(cid, [])
        total_credit = Decimal("0.00")
        total_paid = Decimal("0.00")
        last_tx = None
        for t in c_txs:
            amt = Decimal(str(t.get("amount") or "0.00"))
            if t.get("type") == "credit":
                total_credit += amt
            elif t.get("type") == "payment":
                total_paid += amt
            t_created = t.get("created_at")
            if t_created and (last_tx is None or t_created > last_tx):
                last_tx = t_created

        balance = round(total_credit - total_paid, 2)
        recovery = round((total_paid / total_credit) * 100, 2) if total_credit > 0 else Decimal("100.00")
        results.append({
            "id": c["id"],
            "shop_id": c["shop_id"],
            "name": c["name"],
            "phone": c.get("phone") or "",
            "total_credit": total_credit,
            "total_paid": total_paid,
            "balance": balance,
            "transaction_count": len(c_txs),
            "last_transaction": last_tx,
            "recovery_percentage": recovery,
        })

    results.sort(key=lambda x: (-x["balance"], x["name"]))
    return results

def get_customer_balance_in_db(shop_id: int, customer_id: int) -> dict[str, Any] | None:
    cust = get_customer_by_id(customer_id, shop_id)
    if not cust:
        return None
    client = get_supabase()
    t_res = client.table("transactions").select("id, customer_id, type, amount, created_at").eq("shop_id", shop_id).eq("customer_id", customer_id).execute()
    c_txs = t_res.data or []
    total_credit = Decimal("0.00")
    total_paid = Decimal("0.00")
    last_tx = None
    for t in c_txs:
        amt = Decimal(str(t.get("amount") or "0.00"))
        if t.get("type") == "credit":
            total_credit += amt
        elif t.get("type") == "payment":
            total_paid += amt
        t_created = t.get("created_at")
        if t_created and (last_tx is None or t_created > last_tx):
            last_tx = t_created

    balance = round(total_credit - total_paid, 2)
    recovery = round((total_paid / total_credit) * 100, 2) if total_credit > 0 else Decimal("100.00")
    return {
        "id": cust["id"],
        "shop_id": cust["shop_id"],
        "name": cust["name"],
        "phone": cust.get("phone") or "",
        "total_credit": total_credit,
        "total_paid": total_paid,
        "balance": balance,
        "transaction_count": len(c_txs),
        "last_transaction": last_tx,
        "recovery_percentage": recovery,
    }

def update_customer(
    customer_id: int,
    *,
    shop_id: int | None = None,
    name: str | None = None,
    phone: str | None = None,
) -> bool:
    client = get_supabase()
    payload = {}
    if name is not None:
        payload["name"] = name
    if phone is not None:
        payload["phone"] = phone
    if not payload:
        return False
    query = client.table("customers").update(payload).eq("id", customer_id)
    if shop_id is not None:
        query = query.eq("shop_id", shop_id)
    res = query.execute()
    return bool(res.data)

def delete_customer(customer_id: int, shop_id: int | None = None) -> bool:
    client = get_supabase()
    query = client.table("customers").delete().eq("id", customer_id)
    if shop_id is not None:
        query = query.eq("shop_id", shop_id)
    res = query.execute()
    return bool(res.data)
