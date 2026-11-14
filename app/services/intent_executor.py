from decimal import Decimal
from typing import Any, Dict, Optional
from app.services.business_logic import (
    AmbiguousEntityError,
    BusinessLogicError,
    CustomerService,
    DuplicateTransactionError,
    EntityNotFoundError,
    InsufficientStockError,
    InventoryService,
    ProductService,
    ShopVerificationService,
    TransactionService,
)
from app.services.validators import NegativeContradictionError, ValidationError

class ExecutionResult:
    def __init__(
        self,
        success: bool,
        action: str,
        result: Optional[Any] = None,
        message: str = "",
        clarification_needed: bool = False,
        clarification_question: Optional[str] = None,
        requires_confirmation: bool = False,
        original_text: str = "",
        normalized_text: str = "",
        normalization_notes: Optional[Dict[str, Any]] = None,
    ):
        self.success = success
        self.action = action
        self.result = result
        self.message = message
        self.clarification_needed = clarification_needed
        self.clarification_question = clarification_question
        self.requires_confirmation = requires_confirmation
        self.original_text = original_text
        self.normalized_text = normalized_text
        self.normalization_notes = normalization_notes or {}

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "action": self.action,
            "result": self.result,
            "message": self.message,
            "clarification_needed": self.clarification_needed,
            "clarification_question": self.clarification_question,
            "requires_confirmation": self.requires_confirmation,
            "original_text": self.original_text,
            "normalized_text": self.normalized_text,
            "normalization_notes": self.normalization_notes,
        }

class IntentExecutor:
    @staticmethod
    def execute(intent_data: Dict[str, Any], confirmed: bool = False, request_id: Optional[str] = None) -> ExecutionResult:
        intent = intent_data.get("intent", "unknown")
        action = intent_data.get("action", "none")
        params = intent_data.get("parameters", {}) or {}
        entities = intent_data.get("entities", {}) or {}
        orig_text = intent_data.get("original_text", "")
        norm_text = intent_data.get("normalized_text", "")
        norm_meta = intent_data.get("normalization", {}) or {}

        if intent_data.get("clarification_needed"):
            return ExecutionResult(
                success=True,
                action=action,
                clarification_needed=True,
                clarification_question=intent_data.get("clarification_question") or "Kripya spasht karein.",
                message="Clarification requested by AI normalization.",
                original_text=orig_text,
                normalized_text=norm_text,
                normalization_notes=norm_meta,
            )

        if intent_data.get("requires_confirmation") and not confirmed:
            return ExecutionResult(
                success=True,
                action=action,
                requires_confirmation=True,
                message=f"Action '{action}' requires explicit confirmation.",
                original_text=orig_text,
                normalized_text=norm_text,
                normalization_notes=norm_meta,
            )

        shop_id = params.get("shop_id") or intent_data.get("shop_id") or 1
        try:
            ShopVerificationService.verify_shop_exists(shop_id)
        except (EntityNotFoundError, ValidationError) as exc:
            return ExecutionResult(success=False, action=action, message=str(exc), original_text=orig_text)

        try:
            if intent == "credit_transaction":
                if action in ("record_credit", "record_payment"):
                    cust_name = params.get("customer_name") or entities.get("customer")
                    if not cust_name:
                        return ExecutionResult(
                            success=True,
                            action=action,
                            clarification_needed=True,
                            clarification_question="Kripya grahak ka naam batayein.",
                            original_text=orig_text,
                        )
                    resolved_cust, was_created = CustomerService.resolve_or_create_customer(
                        shop_id=shop_id,
                        name_or_phone=cust_name,
                        phone=params.get("customer_phone") or entities.get("phone"),
                        auto_create=True,
                    )
                    cust_id = resolved_cust["id"]

                    amount_val = params.get("amount")
                    if amount_val is None:
                        if was_created:
                            CustomerService.delete_customer(shop_id, cust_id, confirmed=True)
                        return ExecutionResult(
                            success=True,
                            action=action,
                            clarification_needed=True,
                            clarification_question="Kripya rashi (amount) batayein.",
                            original_text=orig_text,
                        )

                    t_type = "credit" if action == "record_credit" else "payment"
                    try:
                        tx = TransactionService.record_transaction(
                            shop_id=shop_id,
                            customer_id=cust_id,
                            transaction_type=t_type,
                            amount=amount_val,
                            description=params.get("description"),
                            request_id=request_id,
                        )
                    except Exception:
                        if was_created:
                            CustomerService.delete_customer(shop_id, cust_id, confirmed=True)
                        raise

                    status_note = "replayed existing" if tx.get("is_duplicate_replay") else "recorded"
                    created_prefix = f"New customer '{resolved_cust['name']}' created. " if was_created else ""
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=tx,
                        message=f"{created_prefix}{t_type.capitalize()} of Rs {tx['amount']} {status_note} for {resolved_cust['name']}.",
                        original_text=orig_text,
                        normalized_text=norm_text,
                        normalization_notes=norm_meta,
                    )

            elif intent == "customer_management":
                if action == "add_customer":
                    c_name = params.get("customer_name") or entities.get("customer")
                    if not c_name:
                        return ExecutionResult(
                            success=True,
                            action=action,
                            clarification_needed=True,
                            clarification_question="Kripya grahak ka naam batayein.",
                            original_text=orig_text,
                        )
                    new_c = CustomerService.add_customer(
                        shop_id=shop_id,
                        name=c_name,
                        phone=params.get("customer_phone") or entities.get("phone"),
                    )
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=new_c,
                        message=f"Customer '{new_c['name']}' added successfully.",
                        original_text=orig_text,
                    )
                elif action == "find_customer":
                    c_name = params.get("customer_name") or entities.get("customer")
                    if not c_name:
                        return ExecutionResult(
                            success=True,
                            action=action,
                            clarification_needed=True,
                            clarification_question="Kripya khojne ke liye grahak ka naam batayein.",
                            original_text=orig_text,
                        )
                    found = CustomerService.resolve_customer(shop_id, c_name)
                    return ExecutionResult(success=True, action=action, result=found, message="Customer found.", original_text=orig_text)

            elif intent == "product_management":
                if action == "add_product":
                    p_name = params.get("product_name") or entities.get("product")
                    price = params.get("price")
                    if not p_name or price is None:
                        return ExecutionResult(
                            success=True,
                            action=action,
                            clarification_needed=True,
                            clarification_question="Kripya product ka naam aur price batayein.",
                            original_text=orig_text,
                        )
                    prod = ProductService.add_product(
                        shop_id=shop_id,
                        name=p_name,
                        price=price,
                        unit=params.get("unit"),
                    )
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=prod,
                        message=f"Product '{prod['name']}' added at Rs {prod['price']}.",
                        original_text=orig_text,
                    )
                elif action == "update_product_price":
                    p_name = params.get("product_name") or entities.get("product")
                    price = params.get("price")
                    if not p_name or price is None:
                        return ExecutionResult(
                            success=True,
                            action=action,
                            clarification_needed=True,
                            clarification_question="Kripya product ka naam aur naya price batayein.",
                            original_text=orig_text,
                        )
                    res_prod = ProductService.resolve_product(shop_id, p_name)
                    ProductService.update_product_price(shop_id, res_prod["id"], price)
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result={"id": res_prod["id"], "name": res_prod["name"], "new_price": str(price)},
                        message=f"Price for '{res_prod['name']}' updated to Rs {price}.",
                        original_text=orig_text,
                    )

            elif intent == "inventory_update":
                p_name = params.get("product_name") or entities.get("product")
                if not p_name:
                    return ExecutionResult(
                        success=True,
                        action=action,
                        clarification_needed=True,
                        clarification_question="Kripya product ka naam batayein.",
                        original_text=orig_text,
                    )
                qty_change = params.get("quantity_change") or params.get("quantity")
                if qty_change is None:
                    return ExecutionResult(
                        success=True,
                        action=action,
                        clarification_needed=True,
                        clarification_question="Kripya quantity batayein.",
                        original_text=orig_text,
                    )

                auto_create_prod = action in ("add_stock", "adjust_stock")
                res_prod, was_prod_created = ProductService.resolve_or_create_product(
                    shop_id=shop_id,
                    product_name=p_name,
                    price=params.get("price") or Decimal("0.00"),
                    unit=params.get("unit") or "unit",
                    auto_create=auto_create_prod,
                )

                if action == "reduce_stock" and Decimal(str(qty_change)) > Decimal("0.00"):
                    qty_change = -Decimal(str(qty_change))

                adj = InventoryService.adjust_stock(
                    shop_id=shop_id,
                    product_id=res_prod["id"],
                    quantity_change=qty_change,
                    reason=params.get("reason") or action,
                )
                prod_created_prefix = f"New product '{res_prod['name']}' initialized. " if was_prod_created else ""
                return ExecutionResult(
                    success=True,
                    action=action,
                    result=adj,
                    message=f"{prod_created_prefix}Stock for '{res_prod['name']}' adjusted by {qty_change}. New quantity: {adj['new_quantity']}.",
                    original_text=orig_text,
                    normalized_text=norm_text,
                    normalization_notes=norm_meta,
                )

            elif intent == "stock_query":
                if action == "check_stock":
                    p_name = params.get("product_name") or entities.get("product")
                    p_id = None
                    if p_name:
                        res_prod = ProductService.resolve_product(shop_id, p_name)
                        p_id = res_prod["id"]
                    stock_list = InventoryService.get_stock(shop_id, product_id=p_id)
                    return ExecutionResult(success=True, action=action, result=stock_list, message="Stock retrieved.", original_text=orig_text)
                elif action == "check_low_stock":
                    low_stock = InventoryService.get_low_stock(shop_id)
                    return ExecutionResult(success=True, action=action, result=low_stock, message="Low stock retrieved.", original_text=orig_text)

            elif intent == "history_query":
                cust_name = params.get("customer_name") or entities.get("customer")
                if cust_name:
                    res_cust = CustomerService.resolve_customer(shop_id, cust_name)
                    txs = TransactionService.get_customer_transactions(shop_id, res_cust["id"])
                    return ExecutionResult(success=True, action=action, result=txs, message=f"History for {res_cust['name']}.", original_text=orig_text)
                txs = TransactionService.get_shop_transactions(shop_id)
                return ExecutionResult(success=True, action=action, result=txs, message="Shop transactions retrieved.", original_text=orig_text)

            return ExecutionResult(
                success=False,
                action=action,
                clarification_needed=True,
                clarification_question="Maaf kijiye, yeh command abhi supported nahi hai ya samajh nahi aayi.",
                message=f"Unsupported intent '{intent}' or action '{action}'.",
                original_text=orig_text,
            )

        except NegativeContradictionError as exc:
            return ExecutionResult(
                success=True,
                action=action,
                clarification_needed=True,
                clarification_question=str(exc),
                message="Negative financial amount contradiction detected.",
                original_text=orig_text,
            )
        except AmbiguousEntityError as exc:
            return ExecutionResult(
                success=True,
                action=action,
                clarification_needed=True,
                clarification_question=str(exc),
                message="Ambiguous entity match.",
                original_text=orig_text,
            )
        except EntityNotFoundError as exc:
            return ExecutionResult(
                success=False,
                action=action,
                clarification_needed=True,
                clarification_question=f"{str(exc)}. Kripya pehle use add karein ya naam jaanchein.",
                message=str(exc),
                original_text=orig_text,
            )
        except InsufficientStockError as exc:
            return ExecutionResult(success=False, action=action, message=str(exc), original_text=orig_text)
        except ValidationError as exc:
            return ExecutionResult(success=False, action=action, message=str(exc), original_text=orig_text)
        except BusinessLogicError as exc:
            return ExecutionResult(success=False, action=action, message=str(exc), original_text=orig_text)
        except Exception as exc:
            return ExecutionResult(success=False, action=action, message="Database operation failed.", original_text=orig_text)
