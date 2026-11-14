import hashlib
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
import pymysql

from app.database import db_connection
from app.queries import customer as customer_queries
from app.queries import inventory as inventory_queries
from app.queries import inventory_logs as log_queries
from app.queries import product as product_queries
from app.queries import shops as shop_queries
from app.queries import transaction as transaction_queries
from app.services.validators import (
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
            raise EntityNotFoundError(f"Shop with ID {validated_shop_id} does not exist")
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
            raise EntityNotFoundError(f"No customer found matching '{query_str}' in shop {shop_id}")

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
        existing = customer_queries.get_customer_by_id(c_id)
        if not existing or existing["shop_id"] != shop_id:
            raise EntityNotFoundError(f"Customer ID {c_id} does not belong to shop {shop_id}")

        v_name = validate_string(name, "name", max_length=100, required=False) if name is not None else None
        v_phone = validate_string(phone, "phone", max_length=15, required=False) if phone is not None else None

        return customer_queries.update_customer(c_id, name=v_name, phone=v_phone)

    @staticmethod
    def delete_customer(shop_id: int, customer_id: int, confirmed: bool = False) -> bool:
        if not confirmed:
            raise BusinessLogicError("Customer deletion requires explicit user confirmation.")
        ShopVerificationService.verify_shop_exists(shop_id)
        c_id = validate_id(customer_id, "customer_id")
        existing = customer_queries.get_customer_by_id(c_id)
        if not existing or existing["shop_id"] != shop_id:
            raise EntityNotFoundError(f"Customer ID {c_id} does not belong to shop {shop_id}")

        return customer_queries.delete_customer(c_id)

class ProductService:
    @staticmethod
    def add_product(shop_id: int, name: str, price: Any, unit: Optional[str] = None) -> dict:
        ShopVerificationService.verify_shop_exists(shop_id)
        v_name = validate_string(name, "product_name", max_length=100, required=True)
        v_price = validate_decimal(price, "price", min_value=Decimal("0.00"), allow_zero=True)
        v_unit = validate_string(unit, "unit", max_length=20, required=False)

        conn = db_connection.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO products (shop_id, name, price, unit) VALUES (%s, %s, %s, %s)",
                    (shop_id, v_name, float(v_price), v_unit),
                )
                prod_id = cur.lastrowid
                cur.execute(
                    "INSERT INTO inventory (shop_id, product_id, quantity, low_stock_limit) VALUES (%s, %s, 0.00, 0.00)",
                    (shop_id, prod_id),
                )
            conn.commit()
            return {"id": prod_id, "shop_id": shop_id, "name": v_name, "price": str(v_price), "unit": v_unit}
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def resolve_product(shop_id: int, product_name: str) -> dict:
        ShopVerificationService.verify_shop_exists(shop_id)
        p_name = validate_string(product_name, "product_name", max_length=100, required=True)

        matches = product_queries.search_products(shop_id, p_name)
        if not matches:
            raise EntityNotFoundError(f"Product '{p_name}' not found in shop {shop_id}")

        exact_matches = [p for p in matches if p["name"].lower() == p_name.lower()]
        if len(exact_matches) == 1:
            return exact_matches[0]
        if len(matches) == 1:
            return matches[0]

        names = [f"{p['name']} (ID: {p['id']})" for p in matches[:5]]
        raise AmbiguousEntityError(
            f"Multiple products found matching '{p_name}': {', '.join(names)}. Please clarify which product."
        )

    @staticmethod
    def resolve_or_create_product(shop_id: int, product_name: str, price: Any = Decimal("0.00"), unit: Optional[str] = "unit", auto_create: bool = True) -> Tuple[dict, bool]:
        ShopVerificationService.verify_shop_exists(shop_id)
        p_name = validate_string(product_name, "product_name", max_length=100, required=True)
        try:
            resolved = ProductService.resolve_product(shop_id, p_name)
            return resolved, False
        except EntityNotFoundError:
            if not auto_create:
                raise
            created = ProductService.add_product(shop_id, name=p_name, price=price, unit=unit)
            return created, True

    @staticmethod
    def list_products(shop_id: int) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        return product_queries.get_products_by_shop(shop_id)

    @staticmethod
    def update_product_price(shop_id: int, product_id: int, price: Any) -> bool:
        ShopVerificationService.verify_shop_exists(shop_id)
        p_id = validate_id(product_id, "product_id")
        prod = product_queries.get_product_by_id(p_id)
        if not prod or prod["shop_id"] != shop_id:
            raise EntityNotFoundError(f"Product ID {p_id} does not belong to shop {shop_id}")

        v_price = validate_decimal(price, "price", min_value=Decimal("0.00"), allow_zero=True)
        return product_queries.update_product(p_id, price=float(v_price))

class TransactionService:
    @staticmethod
    def normalize_idempotency_key(request_id: Optional[str] = None) -> Optional[str]:
        if not request_id:
            return None
        cleaned = request_id.strip()
        if not cleaned:
            return None
        return hashlib.sha256(cleaned.encode('utf-8')).hexdigest()[:64]

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
        c_id = validate_id(customer_id, 'customer_id')
        cust = customer_queries.get_customer_by_id(c_id)
        if not cust or cust['shop_id'] != shop_id:
            raise EntityNotFoundError(f'Customer ID {c_id} does not belong to shop {shop_id}')

        t_type = validate_transaction_type(transaction_type)
        v_amount = validate_decimal(amount, 'amount', min_value=Decimal('0.01'), allow_zero=False)
        base_desc = validate_string(description, 'description', max_length=500, required=False) or ''
        idemp_key = TransactionService.normalize_idempotency_key(request_id)

        for attempt in range(max_retries):
            conn = db_connection.get_connection()
            try:
                conn.begin()
                with conn.cursor() as cur:
                    if idemp_key:
                        cur.execute(
                            'SELECT id, created_at, amount, type, description, idempotency_key FROM transactions WHERE shop_id = %s AND idempotency_key = %s FOR UPDATE',
                            (shop_id, idemp_key),
                        )
                        existing = cur.fetchone()
                        if existing:
                            conn.rollback()
                            return {
                                'id': existing['id'],
                                'shop_id': shop_id,
                                'customer_id': c_id,
                                'type': existing['type'],
                                'amount': str(existing['amount']),
                                'description': existing['description'],
                                'idempotency_key': existing['idempotency_key'],
                                'is_duplicate_replay': True,
                            }

                    try:
                        cur.execute(
                            'INSERT INTO transactions (shop_id, customer_id, type, amount, description, idempotency_key) VALUES (%s, %s, %s, %s, %s, %s)',
                            (shop_id, c_id, t_type, float(v_amount), base_desc if base_desc else None, idemp_key),
                        )
                        t_id = cur.lastrowid
                    except pymysql.err.IntegrityError as exc:
                        if exc.args[0] == 1062 and idemp_key:
                            cur.execute(
                                'SELECT id, created_at, amount, type, description, idempotency_key FROM transactions WHERE shop_id = %s AND idempotency_key = %s',
                                (shop_id, idemp_key),
                            )
                            existing = cur.fetchone()
                            if existing:
                                conn.rollback()
                                return {
                                    'id': existing['id'],
                                    'shop_id': shop_id,
                                    'customer_id': c_id,
                                    'type': existing['type'],
                                    'amount': str(existing['amount']),
                                    'description': existing['description'],
                                    'idempotency_key': existing['idempotency_key'],
                                    'is_duplicate_replay': True,
                                }
                        raise

                conn.commit()
                return {
                    'id': t_id,
                    'shop_id': shop_id,
                    'customer_id': c_id,
                    'type': t_type,
                    'amount': str(v_amount),
                    'description': base_desc,
                    'idempotency_key': idemp_key,
                    'is_duplicate_replay': False,
                }
            except pymysql.err.OperationalError as exc:
                conn.rollback()
                if exc.args[0] in (1213, 1205) and attempt < max_retries - 1:
                    time.sleep(0.05 * (2 ** attempt))
                    continue
                raise ConcurrencyConflictError(f'Database concurrency conflict or deadlock: {exc}') from exc
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

        raise ConcurrencyConflictError('Exceeded transaction retry limit due to high contention.')

    @staticmethod
    def get_shop_transactions(shop_id: int) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        return transaction_queries.get_transactions_by_shop(shop_id)

    @staticmethod
    def get_customer_transactions(shop_id: int, customer_id: int) -> list:
        ShopVerificationService.verify_shop_exists(shop_id)
        c_id = validate_id(customer_id, 'customer_id')
        return transaction_queries.get_transactions_by_customer(shop_id, c_id)

class InventoryService:
    @staticmethod
    def adjust_stock(
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
            raise EntityNotFoundError(f"Product ID {p_id} does not belong to shop {shop_id}")

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

        for attempt in range(max_retries):
            conn = db_connection.get_connection()
            try:
                conn.begin()
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, quantity, low_stock_limit FROM inventory WHERE shop_id = %s AND product_id = %s FOR UPDATE",
                        (shop_id, p_id),
                    )
                    inv_row = cur.fetchone()
                    if not inv_row:
                        try:
                            cur.execute(
                                'INSERT INTO inventory (shop_id, product_id, quantity, low_stock_limit) VALUES (%s, %s, 0.00, 0.00)',
                                (shop_id, p_id),
                            )
                            inv_id = cur.lastrowid
                            current_qty = Decimal('0.00')
                        except pymysql.err.IntegrityError as exc:
                            if exc.args[0] == 1062:
                                cur.execute(
                                    'SELECT id, quantity, low_stock_limit FROM inventory WHERE shop_id = %s AND product_id = %s FOR UPDATE',
                                    (shop_id, p_id),
                                )
                                inv_row = cur.fetchone()
                                inv_id = inv_row['id']
                                current_qty = Decimal(str(inv_row['quantity']))
                            else:
                                raise
                    else:
                        inv_id = inv_row['id']
                        current_qty = Decimal(str(inv_row['quantity']))

                    new_qty = current_qty + v_change
                    if new_qty < Decimal("0.00"):
                        raise InsufficientStockError(
                            f"Insufficient stock for product '{prod['name']}'. Current: {current_qty}, Requested change: {v_change}"
                        )

                    cur.execute(
                        "UPDATE inventory SET quantity = %s WHERE id = %s",
                        (float(new_qty), inv_id),
                    )

                    cur.execute(
                        "INSERT INTO inventory_logs (shop_id, product_id, quantity_change, reason) VALUES (%s, %s, %s, %s)",
                        (shop_id, p_id, float(v_change), v_reason),
                    )
                    log_id = cur.lastrowid

                conn.commit()
                return {
                    "inventory_id": inv_id,
                    "product_id": p_id,
                    "previous_quantity": str(current_qty),
                    "new_quantity": str(new_qty),
                    "quantity_change": str(v_change),
                    "log_id": log_id,
                }
            except pymysql.err.OperationalError as exc:
                conn.rollback()
                if exc.args[0] in (1213, 1205) and attempt < max_retries - 1:
                    time.sleep(0.05 * (2 ** attempt))
                    continue
                raise ConcurrencyConflictError(f"Database deadlock or lock wait timeout: {exc}") from exc
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

        raise ConcurrencyConflictError("Exceeded inventory retry limit due to high concurrency lock contention.")

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
