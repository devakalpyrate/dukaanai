from datetime import datetime, date
from decimal import Decimal
from typing import Any
from backend.database.supabase_client import get_supabase, get_next_id

def create_transaction(
    shop_id: int,
    customer_id: int,
    transaction_type: str,
    amount: float,
    description: str | None = None,
    idempotency_key: str | None = None,
) -> int:
    client = get_supabase()
    payload = {
        "id": get_next_id("transactions"),
        "shop_id": shop_id,
        "customer_id": customer_id,
        "type": transaction_type,
        "amount": amount,
        "description": description,
        "idempotency_key": idempotency_key
    }
    res = client.table("transactions").insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    return 0

def get_transaction_by_id(transaction_id: int, shop_id: int | None = None) -> dict[str, Any] | None:
    client = get_supabase()
    query = client.table("transactions").select("id, shop_id, customer_id, type, amount, description, idempotency_key, created_at").eq("id", transaction_id)
    if shop_id is not None:
        query = query.eq("shop_id", shop_id)
    res = query.limit(1).execute()
    return res.data[0] if res.data else None

def get_transaction_by_idempotency_key(shop_id: int, idempotency_key: str) -> dict[str, Any] | None:
    client = get_supabase()
    res = client.table("transactions").select("id, shop_id, customer_id, type, amount, description, idempotency_key, created_at").eq("shop_id", shop_id).eq("idempotency_key", idempotency_key).limit(1).execute()
    return res.data[0] if res.data else None

def get_transactions_by_shop(shop_id: int) -> list[dict[str, Any]]:
    client = get_supabase()
    t_res = client.table("transactions").select("id, shop_id, customer_id, type, amount, description, idempotency_key, created_at").eq("shop_id", shop_id).order("created_at", desc=True).order("id", desc=True).execute()
    txs = t_res.data or []
    if not txs:
        return []

    c_res = client.table("customers").select("id, name").eq("shop_id", shop_id).execute()
    c_map = {c["id"]: c["name"] for c in (c_res.data or [])}

    for t in txs:
        t["customer_name"] = c_map.get(t.get("customer_id"), "Unknown Customer")
    return txs

def get_transactions_by_customer(
    shop_id: int,
    customer_id: int,
) -> list[dict[str, Any]]:
    client = get_supabase()
    res = client.table("transactions").select("id, shop_id, customer_id, type, amount, description, idempotency_key, created_at").eq("shop_id", shop_id).eq("customer_id", customer_id).order("created_at", desc=True).order("id", desc=True).execute()
    return res.data or []

def get_shop_financial_summary_in_db(shop_id: int) -> dict[str, Any]:
    client = get_supabase()
    t_res = client.table("transactions").select("id, customer_id, type, amount, created_at").eq("shop_id", shop_id).execute()
    txs = t_res.data or []
    if not txs:
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

    active_customers = len(set(t["customer_id"] for t in txs if t.get("customer_id")))
    total_sales_credit = Decimal("0.00")
    total_payments_received = Decimal("0.00")
    today_credit_sales = Decimal("0.00")
    today_payments_received = Decimal("0.00")
    today_transactions_count = 0
    today_str = date.today().isoformat()

    for t in txs:
        amt = Decimal(str(t.get("amount") or "0.00"))
        t_type = t.get("type")
        c_at = str(t.get("created_at") or "")
        is_today = c_at.startswith(today_str)

        if t_type == "credit":
            total_sales_credit += amt
            if is_today:
                today_credit_sales += amt
        elif t_type == "payment":
            total_payments_received += amt
            if is_today:
                today_payments_received += amt

        if is_today:
            today_transactions_count += 1

    net_outstanding = round(total_sales_credit - total_payments_received, 2)
    recovery_rate = round((total_payments_received / total_sales_credit) * 100, 2) if total_sales_credit > 0 else Decimal("100.00")

    return {
        "total_transactions": len(txs),
        "active_customers": active_customers,
        "total_sales_credit": total_sales_credit,
        "total_payments_received": total_payments_received,
        "net_outstanding_credit": net_outstanding,
        "recovery_rate_percentage": recovery_rate,
        "today_credit_sales": today_credit_sales,
        "today_payments_received": today_payments_received,
        "today_transactions_count": today_transactions_count,
    }

def update_transaction(
    transaction_id: int,
    *,
    shop_id: int | None = None,
    transaction_type: str | None = None,
    amount: float | None = None,
    description: str | None = None,
    idempotency_key: str | None = None,
) -> bool:
    client = get_supabase()
    payload = {}
    if transaction_type is not None:
        payload["type"] = transaction_type
    if amount is not None:
        payload["amount"] = amount
    if description is not None:
        payload["description"] = description
    if idempotency_key is not None:
        payload["idempotency_key"] = idempotency_key
    if not payload:
        return False
    query = client.table("transactions").update(payload).eq("id", transaction_id)
    if shop_id is not None:
        query = query.eq("shop_id", shop_id)
    res = query.execute()
    return bool(res.data)

def delete_transaction(transaction_id: int, shop_id: int | None = None) -> bool:
    client = get_supabase()
    query = client.table("transactions").delete().eq("id", transaction_id)
    if shop_id is not None:
        query = query.eq("shop_id", shop_id)
    res = query.execute()
    return bool(res.data)
