import hashlib
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from backend.database.supabase_client import get_supabase, get_next_id
from backend.queries import customer as customer_queries
from backend.queries import inventory as inventory_queries
from backend.queries import inventory_logs as log_queries
from backend.queries import product as product_queries
from backend.queries import shops as shop_queries
from backend.queries import transaction as transaction_queries
from backend.services.validators import (
    ValidationError,
    validate_decimal,
    validate_id,
    validate_string,
    validate_transaction_type,
)

class BusinessLogicError(Exception):
    pass

class AmbiguousEntityError(BusinessLogicError):
    pass

class EntityNotFoundError(BusinessLogicError):
    pass

class InsufficientStockError(BusinessLogicError):
    pass

class DuplicateTransactionError(BusinessLogicError):
    pass

class ConcurrencyConflictError(BusinessLogicError):
    pass

class ShopVerificationService:
    @staticmethod
    def verify_shop_exists(shop_id: int) -> dict:
        validated_shop_id = validate_id(shop_id, "shop_id")
        shop = shop_queries.get_shop_by_id(validated_shop_id)
        if not shop:
            raise EntityNotFoundError("Dukaan database me darj nahi hai")
        return shop

class CustomerService:
    @staticmethod
    def add_customer(shop_id: int, name: str, phone: Optional[str] = None) -> dict:
        ShopVerificationService.verify_shop_exists(shop_id)
        valid_name = validate_string(name, "customer_name", max_length=100, required=True)
        valid_phone = validate_string(phone, "phone", max_length=15, required=False)

        cust_id = customer_queries.create_customer(shop_id, valid_name, valid_phone)
        return {"id": cust_id, "shop_id": shop_id, "name": valid_name, "phone": valid_phone}

    @staticmethod
    def resolve_customer(shop_id: int, name_or_phone: str) -> dict:
        ShopVerificationService.verify_shop_exists(shop_id)
        query_str = validate_string(name_or_phone, "search_term", max_length=100, required=True)

        matches = customer_queries.search_customers(shop_id, query_str)
        if not matches:
            raise EntityNotFoundError(f"Grahak '{query_str}' aapke dukaan par darj nahi hai")

        exact_matches = [
            c for c in matches
            if c["name"].lower() == query_str.lower() or (c.get("phone") and c["phone"] == query_str)
        ]

        if len(exact_matches) == 1:
            return exact_matches[0]
        if len(matches) == 1:
            return matches[0]

        names = [f"{c['name']} (ID: {c['id']}, Phone: {c.get('phone') or 'N/A'})" for c in matches[:5]]
        raise AmbiguousEntityError(
            f"Multiple customers found matching '{query_str}': {', '.join(names)}. Please clarify which customer."
        )

    @staticmethod
    def resolve_or_create_customer(shop_id: int, name_or_phone: str, phone: Optional[str] = None, auto_create: bool = True) -> Tuple[dict, bool]:
        ShopVerificationService.verify_shop_exists(shop_id)
        query_str = validate_string(name_or_phone, "customer_name", max_length=100, required=True)
        try:
            resolved = CustomerService.resolve_customer(shop_id, query_str)
            return resolved, False
        except EntityNotFoundError:
            if not auto_create:
                raise
            created = CustomerService.add_customer(shop_id, name=query_str, phone=phone)
            return created, True

    @staticmethod
    def list_customers(shop_id: int) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        return customer_queries.get_customers_by_shop(shop_id)

    @staticmethod
    def update_customer(shop_id: int, customer_id: int, name: Optional[str] = None, phone: Optional[str] = None) -> bool:
        ShopVerificationService.verify_shop_exists(shop_id)
        c_id = validate_id(customer_id, "customer_id")
        existing = customer_queries.get_customer_by_id(c_id, shop_id=shop_id)
        if not existing:
            raise EntityNotFoundError("Grahak aapke dukaan par darj nahi hai")

        v_name = validate_string(name, "name", max_length=100, required=False) if name is not None else None
        v_phone = validate_string(phone, "phone", max_length=15, required=False) if phone is not None else None

        return customer_queries.update_customer(c_id, shop_id=shop_id, name=v_name, phone=v_phone)

    @staticmethod
    def delete_customer(shop_id: int, customer_id: int, confirmed: bool = False) -> bool:
        if not confirmed:
            raise BusinessLogicError("Customer deletion requires explicit user confirmation.")
        ShopVerificationService.verify_shop_exists(shop_id)
        c_id = validate_id(customer_id, "customer_id")
        existing = customer_queries.get_customer_by_id(c_id, shop_id=shop_id)
        if not existing:
            raise EntityNotFoundError("Grahak aapke dukaan par darj nahi hai")

        return customer_queries.delete_customer(c_id, shop_id=shop_id)

class ProductService:
    @staticmethod
    def add_product(
        shop_id: int,
        name: str,
        price: Any,
        unit: Optional[str] = None,
        quantity: Any = 0,
        low_stock_limit: Any = 5,
    ) -> dict:
        ShopVerificationService.verify_shop_exists(shop_id)
        v_name = validate_string(name, "product_name", max_length=100, required=True)
        v_price = validate_decimal(price, "price", min_value=Decimal("0.00"), allow_zero=True)
        v_unit = validate_string(unit, "unit", max_length=20, required=False)

        if v_unit:
            clean_unit = v_unit.strip()
            if any(char.isdigit() for char in clean_unit):
                raise ValidationError("Unit must contain only characters/letters (e.g. kg, liter, packet), numbers are not allowed.")

        v_quantity = validate_decimal(quantity, "quantity", min_value=Decimal("0.00"), allow_zero=True) if quantity is not None else Decimal("0.00")
        v_limit = validate_decimal(low_stock_limit, "low_stock_limit", min_value=Decimal("0.00"), allow_zero=True) if low_stock_limit is not None else Decimal("5.00")

        client = get_supabase()
        prod_id = get_next_id("products")
        prod_res = client.table("products").insert({
            "id": prod_id,
            "shop_id": shop_id,
            "name": v_name,
            "price": float(v_price),
            "unit": v_unit or "unit"
        }).execute()

        inv_id = get_next_id("inventory")
        client.table("inventory").insert({
            "id": inv_id,
            "shop_id": shop_id,
            "product_id": prod_id,
            "quantity": float(v_quantity),
            "low_stock_limit": float(v_limit)
        }).execute()

        return {
            "id": prod_id,
            "shop_id": shop_id,
            "name": v_name,
            "price": str(v_price),
            "unit": v_unit,
            "quantity": float(v_quantity),
            "stock": float(v_quantity),
            "total_value": float(round(v_quantity * v_price, 2)),
        }

    @staticmethod
    def resolve_product(shop_id: int, product_name: str) -> dict:
        ShopVerificationService.verify_shop_exists(shop_id)
        q_name = validate_string(product_name, "product_name", max_length=100, required=True)

        matches = product_queries.search_products(shop_id, q_name)
        if not matches:
            raise EntityNotFoundError(f"Product '{q_name}' aapke dukaan par nahi hai")

        exact_matches = [p for p in matches if p["name"].lower() == q_name.lower()]
        if len(exact_matches) == 1:
            return exact_matches[0]
        if len(matches) == 1:
            return matches[0]

        names = [f"{p['name']} (ID: {p['id']})" for p in matches[:5]]
        raise AmbiguousEntityError(
            f"Multiple products found matching '{q_name}': {', '.join(names)}. Please clarify which product."
        )

    @staticmethod
    def list_products(shop_id: int) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        return product_queries.get_products_by_shop(shop_id)

    @staticmethod
    def update_product(
        shop_id: int,
        product_id: int,
        name: Optional[str] = None,
        price: Optional[Any] = None,
        unit: Optional[str] = None,
    ) -> bool:
        ShopVerificationService.verify_shop_exists(shop_id)
        p_id = validate_id(product_id, "product_id")
        existing = product_queries.get_product_by_id(p_id)
        if not existing or existing["shop_id"] != shop_id:
            raise EntityNotFoundError("Product aapke dukaan par nahi hai")

        v_name = validate_string(name, "name", max_length=100, required=False) if name is not None else None
        v_price = validate_decimal(price, "price", min_value=Decimal("0.00"), allow_zero=True) if price is not None else None
        v_unit = validate_string(unit, "unit", max_length=20, required=False) if unit is not None else None

        return product_queries.update_product(
            p_id,
            name=v_name,
            price=float(v_price) if v_price is not None else None,
            unit=v_unit,
        )

    @staticmethod
    def resolve_or_create_product(
        shop_id: int,
        name: str | None = None,
        product_name: str | None = None,
        price: Optional[Any] = None,
        unit: Optional[str] = None,
        auto_create: bool = True
    ) -> Tuple[dict, bool]:
        target_name = name or product_name or ""
        ShopVerificationService.verify_shop_exists(shop_id)
        q_name = validate_string(target_name, "product_name", max_length=100, required=True)
        try:
            resolved = ProductService.resolve_product(shop_id, q_name)
            return resolved, False
        except EntityNotFoundError:
            if not auto_create:
                raise
            created = ProductService.add_product(
                shop_id,
                name=q_name,
                price=price if price is not None else Decimal("0.00"),
                unit=unit,
                quantity=Decimal("0.00")
            )
            return created, True

    @staticmethod
    def update_product_price(shop_id: int, product_id: int, price: float) -> bool:
        return ProductService.update_product(shop_id, product_id, price=price)

    @staticmethod
    def delete_product(shop_id: int, product_id: int, confirmed: bool = False) -> bool:
        if not confirmed:
            raise BusinessLogicError("Product deletion requires explicit user confirmation.")
        ShopVerificationService.verify_shop_exists(shop_id)
        p_id = validate_id(product_id, "product_id")
        existing = product_queries.get_product_by_id(p_id)
        if not existing or existing["shop_id"] != shop_id:
            raise EntityNotFoundError("Product aapke dukaan par nahi hai")

        return product_queries.delete_product(p_id)

class TransactionService:
    @staticmethod
    def normalize_idempotency_key(key: Optional[str]) -> Optional[str]:
        if not key:
            return None
        clean = key.strip()
        if not clean:
            return None
        if len(clean) > 64:
            return hashlib.sha256(clean.encode("utf-8")).hexdigest()
        return clean

    @staticmethod
    def record_transaction(
        shop_id: int,
        customer_id: int,
        transaction_type: str,
        amount: Any,
        description: Optional[str] = None,
        request_id: Optional[str] = None,
        max_retries: int = 3,
    ) -> dict:
        ShopVerificationService.verify_shop_exists(shop_id)
        c_id = validate_id(customer_id, "customer_id")
        cust = customer_queries.get_customer_by_id(c_id, shop_id=shop_id)
        if not cust:
            raise EntityNotFoundError("Grahak aapke dukaan par darj nahi hai")

        t_type = validate_transaction_type(transaction_type)
        v_amount = validate_decimal(amount, "amount", min_value=Decimal("0.01"), allow_zero=False)
        base_desc = validate_string(description, "description", max_length=500, required=False) or ""
        idemp_key = TransactionService.normalize_idempotency_key(request_id)

        client = get_supabase()
        if idemp_key:
            existing_res = client.table("transactions").select(
                "id, created_at, amount, type, description, idempotency_key"
            ).eq("shop_id", shop_id).eq("idempotency_key", idemp_key).limit(1).execute()
            if existing_res.data:
                existing = existing_res.data[0]
                return {
                    "id": existing["id"],
                    "shop_id": shop_id,
                    "customer_id": c_id,
                    "type": existing["type"],
                    "amount": str(existing["amount"]),
                    "description": existing.get("description"),
                    "idempotency_key": existing.get("idempotency_key"),
                    "is_duplicate_replay": True,
                }

        t_id = get_next_id("transactions")
        payload = {
            "id": t_id,
            "shop_id": shop_id,
            "customer_id": c_id,
            "type": t_type,
            "amount": float(v_amount),
            "description": base_desc if base_desc else None,
            "idempotency_key": idemp_key
        }
        res = client.table("transactions").insert(payload).execute()

        return {
            "id": t_id,
            "shop_id": shop_id,
            "customer_id": c_id,
            "type": t_type,
            "amount": str(v_amount),
            "description": base_desc,
            "idempotency_key": idemp_key,
            "is_duplicate_replay": False,
        }

    @staticmethod
    def get_shop_transactions(shop_id: int) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        return transaction_queries.get_transactions_by_shop(shop_id)

    @staticmethod
    def get_customer_transactions(shop_id: int, customer_id: int) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        c_id = validate_id(customer_id, "customer_id")
        return transaction_queries.get_transactions_by_customer(shop_id, c_id)

class InventoryService:
    @staticmethod
    def update_stock(
        shop_id: int,
        product_id: int,
        quantity_change: Any,
        reason: Optional[str] = None,
        max_retries: int = 3,
    ) -> dict:
        ShopVerificationService.verify_shop_exists(shop_id)
        p_id = validate_id(product_id, "product_id")
        prod = product_queries.get_product_by_id(p_id)
        if not prod or prod["shop_id"] != shop_id:
            raise EntityNotFoundError("Product aapke dukaan par nahi hai")

        v_change = validate_decimal(
            quantity_change,
            "quantity_change",
            min_value=-Decimal("99999999.99"),
            allow_zero=False,
            disallow_negative_explicitly=False,
        )
        if v_change == Decimal("0.00"):
            raise ValidationError("quantity_change cannot be zero")

        v_reason = validate_string(reason, "reason", max_length=100, required=False)

        client = get_supabase()
        inv_res = client.table("inventory").select("id, quantity, low_stock_limit").eq("shop_id", shop_id).eq("product_id", p_id).limit(1).execute()
        if not inv_res.data:
            inv_id = get_next_id("inventory")
            ins_res = client.table("inventory").insert({
                "id": inv_id,
                "shop_id": shop_id,
                "product_id": p_id,
                "quantity": 0.00,
                "low_stock_limit": 0.00
            }).execute()
            current_qty = Decimal("0.00")
        else:
            inv_row = inv_res.data[0]
            inv_id = inv_row["id"]
            current_qty = Decimal(str(inv_row.get("quantity") or "0.00"))

        new_qty = current_qty + v_change
        if new_qty < Decimal("0.00"):
            raise InsufficientStockError(
                f"Insufficient stock for product '{prod['name']}'. Current: {current_qty}, Requested change: {v_change}"
            )

        client.table("inventory").update({"quantity": float(new_qty)}).eq("id", inv_id).execute()
        log_id = get_next_id("inventory_logs")
        log_res = client.table("inventory_logs").insert({
            "id": log_id,
            "shop_id": shop_id,
            "product_id": p_id,
            "quantity_change": float(v_change),
            "reason": v_reason
        }).execute()

        return {
            "inventory_id": inv_id,
            "product_id": p_id,
            "previous_quantity": str(current_qty),
            "new_quantity": str(new_qty),
            "quantity_change": str(v_change),
            "log_id": log_id,
        }

    adjust_stock = update_stock

    @staticmethod
    def get_stock(shop_id: int, product_id: Optional[int] = None) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        if product_id:
            p_id = validate_id(product_id, "product_id")
            rec = inventory_queries.get_inventory_by_product(shop_id, p_id)
            return [rec] if rec else []
        return inventory_queries.get_inventory_by_shop(shop_id)

    @staticmethod
    def get_low_stock(shop_id: int) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        return inventory_queries.get_low_stock_items(shop_id)

    @staticmethod
    def get_stock_logs(shop_id: int, product_id: Optional[int] = None) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        if product_id:
            p_id = validate_id(product_id, "product_id")
            return log_queries.get_inventory_logs_by_product(shop_id, p_id)
        return log_queries.get_inventory_logs_by_shop(shop_id)
