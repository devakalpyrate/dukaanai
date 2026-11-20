import logging
import re
from decimal import Decimal
from typing import Any, Dict, List, Optional
from urllib.parse import quote
from backend.queries import customer as customer_queries
from backend.queries import notification as notification_queries
from backend.queries import product as product_queries
from backend.queries import shops as shop_queries
from backend.queries import supplier as supplier_queries
from backend.queries import transaction as transaction_queries
from backend.services.price_discovery import get_market_price

logger = logging.getLogger(__name__)
from backend.services.business_logic import (
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
from backend.services.validators import NegativeContradictionError, ValidationError
from backend.services.language_detection import detect_language, get_localized_confirmation

_pending_contexts: Dict[int, Dict[str, Any]] = {}

class PendingContextManager:
    @staticmethod
    def get(shop_id: int) -> Optional[Dict[str, Any]]:
        return _pending_contexts.get(shop_id)

    @staticmethod
    def set(shop_id: int, context_data: Dict[str, Any]) -> None:
        _pending_contexts[shop_id] = context_data

    @staticmethod
    def clear(shop_id: int) -> None:
        _pending_contexts.pop(shop_id, None)

def parse_spoken_amount(text: str) -> Optional[Decimal]:
    if not text:
        return None
    raw = text.strip()
    match = re.search(r'(\d+(?:\.\d{1,2})?)', raw)
    if match:
        try:
            return Decimal(match.group(1)).quantize(Decimal("0.01"))
        except Exception:
            pass
    hindi_map = {
        "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "panch": 5,
        "das": 10, "bees": 20, "tees": 30, "chaalis": 40, "chalis": 40,
        "pachaas": 50, "pachas": 50, "saath": 60, "sattar": 70, "assi": 80,
        "nabbe": 90, "sau": 100, "hazaar": 1000, "hazar": 1000
    }
    for word, val in hindi_map.items():
        if word in raw.lower().split():
            return Decimal(val).quantize(Decimal("0.01"))
    return None

def sanitize_public_message(text: Optional[str]) -> str:
    if not text:
        return ""
    cleaned = re.sub(r'(?:in|for|from)?\s*shop\s*(?:id)?\s*[:=]?\s*\d+', 'aapke dukaan par', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'shop_id\s*[:=]?\s*\d+', '', cleaned, flags=re.IGNORECASE)
    forbidden_terms = [
        "mysql", "postgresql", "sqlite", "database", "schema", "table",
        "fastapi", "uvicorn", "gunicorn", "backend", "architecture", "endpoint",
        "grpc", "normaliz", "traceback", "exception", "deadlock", "internal error"
    ]
    lower = cleaned.lower()
    for term in forbidden_terms:
        if term in lower:
            return "Kripya dobara prayas karein ya jaankari spasht karein."
    return cleaned.strip()

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
        spoken_message: Optional[str] = None,
        detected_language: Optional[str] = None,
    ):
        self.success = success
        self.action = action
        self.result = result
        self.message = sanitize_public_message(message)
        self.clarification_needed = clarification_needed
        self.clarification_question = sanitize_public_message(clarification_question) if clarification_question else None
        self.requires_confirmation = requires_confirmation
        self.original_text = original_text
        self.normalized_text = normalized_text
        self.normalization_notes = normalization_notes or {}
        self.spoken_message = sanitize_public_message(spoken_message or message)
        self.detected_language = detected_language or "en"

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "action": self.action,
            "result": self.result,
            "message": self.message,
            "spoken_message": self.spoken_message,
            "detected_language": self.detected_language,
            "clarification_needed": self.clarification_needed,
            "clarification_question": self.clarification_question,
            "requires_confirmation": self.requires_confirmation,
            "original_text": self.original_text,
            "normalized_text": self.normalized_text,
            "normalization_notes": self.normalization_notes,
        }

class IntentExecutor:
    @staticmethod
    def _execute_batch_stock_addition(
        shop_id: int,
        items_list: list,
        action: str,
        orig_text: str,
        norm_text: str,
        norm_meta: Optional[Dict[str, Any]],
    ) -> ExecutionResult:
        if not isinstance(items_list, list) or len(items_list) == 0:
            return ExecutionResult(
                success=True,
                action=action,
                clarification_needed=True,
                clarification_question="Kripya products aur unki quantity batayein.",
                original_text=orig_text,
            )

        added_items = []
        failed_items = []
        item_summaries = []

        unit_map = {
            "किलो": "kilo", "केजी": "kilo", "kg": "kilo", "kgs": "kilo", "kilogram": "kilo",
            "लीटर": "litre", "लीटरों": "litre", "l": "litre", "ltr": "litre", "litre": "litre", "litres": "litre",
            "पैकेट": "packet", "पैकेटों": "packet", "pkt": "packet", "packet": "packet", "packets": "packet",
            "पीस": "piece", "पीसों": "piece", "pc": "piece", "pcs": "piece", "piece": "piece", "pieces": "piece",
            "बोरी": "bori", "बोरीयां": "bori", "bag": "bori", "bags": "bori", "bori": "bori"
        }

        for itm in items_list:
            if not isinstance(itm, dict):
                continue
            p_name = (itm.get("product_name") or itm.get("name") or "").strip()
            raw_qty = itm.get("quantity") or itm.get("quantity_change")
            raw_unit = (itm.get("unit") or "kilo").strip().lower()
            unit = unit_map.get(raw_unit, raw_unit)
            price = itm.get("price")

            if not p_name or raw_qty is None:
                continue

            try:
                if isinstance(raw_qty, str):
                    nums = re.findall(r"[-+]?\d*\.?\d+", raw_qty)
                    qty_val = Decimal(nums[0]) if nums else Decimal("0.00")
                else:
                    qty_val = Decimal(str(raw_qty))

                if qty_val <= Decimal("0.00"):
                    continue
            except Exception:
                continue

            try:
                matches = product_queries.search_products(shop_id, p_name)
                exact_prod = next((p for p in matches if p["name"].lower() == p_name.lower()), None) if matches else None
                existing_price = Decimal(str(exact_prod["price"])) if exact_prod and exact_prod.get("price") is not None else Decimal("0.00")

                v_price = Decimal("0.00")
                if price is not None and str(price).strip():
                    try:
                        v_price = Decimal(str(price))
                    except Exception:
                        pass

                if existing_price <= Decimal("0.00") and v_price <= Decimal("0.00"):
                    try:
                        disc = get_market_price(p_name, unit)
                        if disc and disc.get("price") and float(disc["price"]) > 0:
                            v_price = Decimal(str(disc["price"]))
                    except Exception:
                        pass

                final_price = v_price if v_price > Decimal("0.00") else existing_price

                res_prod, was_created = ProductService.resolve_or_create_product(
                    shop_id=shop_id,
                    product_name=p_name,
                    price=final_price,
                    unit=unit or (exact_prod["unit"] if exact_prod else "kilo"),
                    auto_create=True,
                )

                if v_price > Decimal("0.00") and float(res_prod.get("price") or 0) != float(v_price):
                    try:
                        ProductService.update_product_price(shop_id, res_prod["id"], float(v_price))
                    except Exception:
                        pass

                adj = InventoryService.adjust_stock(
                    shop_id=shop_id,
                    product_id=res_prod["id"],
                    quantity_change=qty_val,
                    reason="voice_batch_add_stock",
                )

                u_label = res_prod.get("unit") or unit or "kilo"
                added_items.append({
                    "product_id": res_prod["id"],
                    "product_name": res_prod["name"],
                    "quantity_added": float(qty_val),
                    "unit": u_label,
                    "new_stock": adj["new_quantity"],
                    "price": float(final_price),
                    "was_created": was_created,
                })
                display_qty = int(qty_val) if qty_val % 1 == 0 else qty_val
                item_summaries.append(f"{res_prod['name']} {display_qty} {u_label}")
            except Exception as itm_err:
                logger.error("Failed to add batch item '%s': %s", p_name, itm_err)
                failed_items.append({"product_name": p_name, "error": str(itm_err)})

        if not added_items:
            return ExecutionResult(
                success=False,
                action=action,
                error_message="Koi bhi item stock me add nahi ho saka. Kripya naam aur quantity check karein.",
                original_text=orig_text,
            )

        PendingContextManager.clear(shop_id)

        if len(item_summaries) == 1:
            items_str = item_summaries[0]
        elif len(item_summaries) == 2:
            items_str = f"{item_summaries[0]} aur {item_summaries[1]}"
        else:
            items_str = f"{', '.join(item_summaries[:-1])}, aur {item_summaries[-1]}"

        lang = detect_language(orig_text or norm_text)
        if lang in ("ta", "ta-latn"):
            spoken_msg = f"சரி, {items_str} உங்கள் கடையின் இருப்பில் வெற்றிகரமாக சேர்க்கப்பட்டது."
        elif lang in ("or", "or-latn"):
            spoken_msg = f"ଠିକ୍ ଅଛି, {items_str} ଆପଣଙ୍କ ଦୋକାନ ଷ୍ଟକରେ ସଫଳତାର ସହିତ ଯୋଡ଼ାଗଲା।"
        elif lang == "hi":
            spoken_msg = f"ठीक है, {items_str} आपकी दुकान के स्टॉक में सफलतापूर्वक जोड़ दिए गए हैं।"
        else:
            spoken_msg = f"Theek hai, {items_str} aapki dukaan ke stock me safalta-purvak save kar diye gaye hain."
        audit_msg = f"Batch stock added: {len(added_items)} items ({', '.join(item_summaries)})."

        return ExecutionResult(
            success=True,
            action="batch_add_stock",
            result={
                "items": added_items,
                "failed": failed_items,
                "total_items": len(added_items),
            },
            message=audit_msg,
            spoken_message=spoken_msg,
            original_text=orig_text,
            normalized_text=norm_text,
            normalization_notes=norm_meta,
        )

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
            cq = (
                intent_data.get("clarification_question")
                or (params.get("reply") if params else None)
                or "Kripya spasht karein ki aap kya entry karna chahte hain."
            )
            return ExecutionResult(
                success=True,
                action=action,
                clarification_needed=True,
                clarification_question=cq,
                message=cq,
                spoken_message=cq,
                original_text=orig_text,
                normalized_text=norm_text,
                normalization_notes=norm_meta,
            )

        if intent == "conversation" or action in ("greet", "assist", "general_chat", "help"):
            chat_reply = (
                params.get("reply")
                or intent_data.get("conversational_response")
                or intent_data.get("clarification_question")
                or "Namaste! Main DukaanAI hoon. Bataiye, aaj dukaan me kya entry karni hai ya kiska hisaab dekhna hai?"
            )
            return ExecutionResult(
                success=True,
                action=action or "greet",
                result={"reply": chat_reply},
                message=chat_reply,
                spoken_message=chat_reply,
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

        pending = PendingContextManager.get(shop_id)
        if pending and pending.get("action") == "awaiting_product_price":
            ans_price = params.get("price") or params.get("amount") or parse_spoken_amount(orig_text) or parse_spoken_amount(norm_text)
            if ans_price and Decimal(str(ans_price)) > Decimal("0.00"):
                p_name = pending["product_name"]
                qty_change = pending.get("quantity") or Decimal("1.00")
                unit = pending.get("unit") or "unit"
                v_price = Decimal(str(ans_price))
                res_prod, _ = ProductService.resolve_or_create_product(
                    shop_id=shop_id,
                    product_name=p_name,
                    price=v_price,
                    unit=unit,
                    auto_create=True,
                )
                if float(res_prod.get("price") or 0) != float(v_price):
                    ProductService.update_product_price(shop_id, res_prod["id"], float(v_price))
                adj = InventoryService.adjust_stock(
                    shop_id=shop_id,
                    product_id=res_prod["id"],
                    quantity_change=qty_change,
                    reason="voice_add_stock_with_price",
                )
                PendingContextManager.clear(shop_id)
                spoken_msg = f"Theek hai, {p_name} ₹{float(v_price):,.2f} prati {unit} ke hisaab se {qty_change} {unit} stock me save kar diya gaya hai."
                return ExecutionResult(
                    success=True,
                    action="add_product_price",
                    result=adj,
                    message=spoken_msg,
                    spoken_message=spoken_msg,
                    original_text=orig_text,
                    normalized_text=norm_text,
                    normalization_notes=norm_meta,
                )

        if action in ("request_recorded_pending", "queued_processing"):
            sh_data = shop_queries.get_shop_by_id(shop_id)
            ow_id = sh_data["owner_id"] if sh_data else 1
            raw_ins = params.get("raw_instruction") or orig_text or "Voice Instruction"
            
            try:
                from backend.services.task_queue import DukaanTaskQueue
                DukaanTaskQueue.enqueue(shop_id=shop_id, user_id=ow_id, text=raw_ins)
            except Exception as q_err:
                logger.warning("Failed to enqueue task: %s", q_err)

            # Only log an immediate info note if it's not a financial transaction that the FIFO worker will log
            has_financial_amount = bool(re.search(r'\d+', raw_ins))
            if not has_financial_amount:
                try:
                    notification_queries.create_notification(
                        shop_id=shop_id,
                        user_id=ow_id,
                        title="🎙️ Voice Note / आवाज नोट",
                        message=f"Voice instruction noted: \"{raw_ins}\"",
                        notification_type="info",
                    )
                except Exception as n_err:
                    logger.warning("Failed to write notification for pending request: %s", n_err)
            
            spoken = "Theek hai bhaiya, aapka note likh liya hai, khata update ho raha hai."
            return ExecutionResult(
                success=True,
                action=action,
                result={"status": "recorded", "instruction": raw_ins},
                message=spoken,
                spoken_message=spoken,
                detected_language=detect_language(orig_text or norm_text),
                original_text=orig_text,
                normalized_text=norm_text,
            )

        raw_l = f"{orig_text} {norm_text}".lower()
        if not action or action in ("none", "unknown", "customer_history", "daily_summary") or intent in ("customer_query", "khata_query", "history_query", "customer_management", "unknown"):
            if any(k in raw_l for k in ["मेरी लिस्ट", "लिस्ट में", "कौन कौन", "कौन-कौन", "ग्राहक कौन", "ग्राहक लिस्ट", "लिस्ट बताओ", "କିଏ କିଏ", "ତାଲିକା", "meri list", "list me aur", "list me kaun", "kaun kaun hai", "customer list", "grahak list", "sabke naam", "all customer", "show customer"]):
                action = "list_customers"
                intent = "customer_query"
            elif any(k in raw_l for k in ["टॉप 3", "टॉप 5", "टॉप 10", "टॉप", "सबसे ज्यादा", "सबसे ज़्यादा", "सबसे अधिक", "ଟପ୍", "ସର୍ବାଧିକ", "top 3", "top 5", "top 10", "top three", "top five", "sabse jyada udhar", "sabse jyada baki", "highest debt", "highest udhar"]):
                action = "top_debtors"
                intent = "customer_query"
            elif any(k in raw_l for k in ["से ज्यादा", "से ज़्यादा", "से अधिक", "से ऊपर", "रुपये से ज्यादा", "रुपये से ज़्यादा", "ରୁ ଅଧିକ", "se jyada", "se zyada", "se adhik", "se upar", "greater than", "more than"]):
                action = "filter_debtors"
                intent = "customer_query"
            elif any(k in raw_l for k in ["क्लियर हो चुका", "चुकता हो चुका", "चुकता हो गया", "उधार क्लियर", "बैलेंस शून्य", "बैलेंस जीरो", "खाता जीरो", "खाता चुकता", "କ୍ଲିୟର", "ଶୂନ୍ୟ", "clear ho chuka", "chukta ho chuka", "chukta ho gaya", "balance zero", "khata zero", "udhar clear ho chuka", "cleared debt", "zero balance"]):
                action = "cleared_debtors"
                intent = "customer_query"
            elif any(k in raw_l for k in ["कितना बाकी", "कितना उधार", "हिसाब बताओ", "खाता दिखाओ", "ବାକି କେତେ", "kitna baki", "kitna udhar", "hisab batao", "khata dikhao", "kitna rupya baki"]):
                action = "check_balance"
                intent = "customer_query"
            elif any(k in raw_l for k in ["order de do", "order kar do", "order bhej do", "order kardo", "doodh mangwa", "doodh mangao", "packet doodh", "packets of milk", "order milk", "distributor ko", "supplier ko"]):
                action = "order_from_supplier"
                intent = "supplier_order"

        try:
            if intent in ("customer_query", "khata_query") or action in ("list_customers", "top_debtors", "filter_debtors", "cleared_debtors", "check_balance"):
                lang = detect_language(orig_text or norm_text)
                if action == "list_customers":
                    all_custs = customer_queries.get_customers_with_balances_by_shop(shop_id)
                    count = len(all_custs)
                    if count == 0:
                        if lang == "hi":
                            spoken_msg = "आपकी दुकान की लिस्ट में अभी कोई ग्राहक नहीं है।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = "ଆପଣଙ୍କ ଦୋକାନ ତାଲିକାରେ ବର୍ତ୍ତମାନ କୌଣସି ଗ୍ରାହକ ନାହାଁନ୍ତି।"
                        elif lang in ("ta", "ta-latn"):
                            spoken_msg = "உங்கள் வாடிக்கையாளர் பட்டியலில் தற்போது யாரும் இல்லை."
                        else:
                            spoken_msg = "You have no customers in your store yet."
                        return ExecutionResult(success=True, action="list_customers", result={"customers": [], "total_count": 0, "total_debt": 0.0}, message="No customers found.", spoken_message=spoken_msg, detected_language=lang, original_text=orig_text)

                    total_debt = sum(float(c["balance"]) for c in all_custs if float(c["balance"]) > 0)
                    top_names = [c["name"] for c in all_custs[:5]]
                    names_str = ", ".join(top_names)
                    if count > 5:
                        names_str += f" और अन्य {count - 5} ग्राहक"

                    if lang == "hi":
                        spoken_msg = f"आपकी दुकान में कुल {count} ग्राहक हैं और कुल बकाया उधार ₹{total_debt:,.2f} है। इनमें {names_str} शामिल हैं।"
                    elif lang in ("or", "or-latn"):
                        spoken_msg = f"ଆପଣଙ୍କ ଦୋକାନରେ ମୋଟ {count} ଜଣ ଗ୍ରାହକ ଅଛନ୍ତି ଏବଂ ମୋଟ ବାକି ଉଧାର ₹{total_debt:,.2f} ଅଛି।"
                    elif lang in ("ta", "ta-latn"):
                        spoken_msg = f"உங்கள் கடையில் மொத்தம் {count} வாடிக்கையாளர்கள் உள்ளனர். மொத்த கடன் பாக்கி ₹{total_debt:,.2f}."
                    elif lang == "hi-latn":
                        spoken_msg = f"Aapki dukan me total {count} grahak hain aur kul baki udhaar ₹{total_debt:,.2f} hai. Inme {names_str} shamil hain."
                    else:
                        spoken_msg = f"You have {count} customers with total outstanding debt of Rs {total_debt:,.2f}. Customers include: {names_str}."

                    return ExecutionResult(
                        success=True,
                        action="list_customers",
                        result={"customers": all_custs, "total_count": count, "total_debt": total_debt},
                        message=f"Retrieved {count} store customers. Total debt: Rs {total_debt:,.2f}.",
                        spoken_message=spoken_msg,
                        detected_language=lang,
                        original_text=orig_text,
                        normalized_text=norm_text,
                    )

                elif action == "top_debtors":
                    limit_val = 3
                    raw_check = f"{orig_text} {norm_text}".lower()
                    if "5" in raw_check or "पांच" in raw_check or "paanch" in raw_check or "five" in raw_check:
                        limit_val = 5
                    elif "10" in raw_check or "दस" in raw_check or "das" in raw_check or "ten" in raw_check:
                        limit_val = 10
                    elif "3" in raw_check or "तीन" in raw_check or "teen" in raw_check or "three" in raw_check:
                        limit_val = 3
                    elif params.get("limit"):
                        try:
                            limit_val = int(params["limit"])
                        except (ValueError, TypeError):
                            limit_val = 3

                    all_custs = customer_queries.get_customers_with_balances_by_shop(shop_id)
                    active_debtors = [c for c in all_custs if float(c["balance"]) > 0]
                    top_list = active_debtors[:limit_val]

                    if not top_list:
                        if lang == "hi":
                            spoken_msg = "आपकी दुकान में किसी भी ग्राहक का कोई बकाया उधार नहीं है।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = "ଆପଣଙ୍କ ଦୋକାନରେ କୌଣସି ଗ୍ରାହକଙ୍କ ବାକି ଉଧାର ନାହିଁ।"
                        elif lang in ("ta", "ta-latn"):
                            spoken_msg = "உங்கள் கடையில் எந்த வாடிக்கையாளருக்கும் கடன் பாக்கி இல்லை."
                        else:
                            spoken_msg = "No customers have outstanding debt."
                        return ExecutionResult(success=True, action="top_debtors", result={"top_debtors": [], "limit": limit_val}, message="No active debtors found.", spoken_message=spoken_msg, detected_language=lang, original_text=orig_text)

                    items_str = ", ".join(f"{i+1}. {c['name']} (₹{float(c['balance']):,.2f})" for i, c in enumerate(top_list))
                    if lang == "hi":
                        spoken_msg = f"सबसे ज़्यादा उधार वाले टॉप {len(top_list)} ग्राहक हैं: {items_str}।"
                    elif lang in ("or", "or-latn"):
                        spoken_msg = f"ସର୍ବାଧିକ ଉଧାର ଥିବା ଟପ୍ {len(top_list)} ଗ୍ରାହକ ହେଲେ: {items_str}।"
                    elif lang in ("ta", "ta-latn"):
                        spoken_msg = f"அதிக கடன் உள்ள முதல் {len(top_list)} வாடிக்கையாளர்கள்: {items_str}."
                    elif lang == "hi-latn":
                        spoken_msg = f"Sabse jyada udhaar wale top {len(top_list)} grahak hain: {items_str}."
                    else:
                        spoken_msg = f"Top {len(top_list)} customers with highest debt are: {items_str}."

                    return ExecutionResult(
                        success=True,
                        action="top_debtors",
                        result={"top_debtors": top_list, "limit": limit_val},
                        message=f"Top {len(top_list)} debtors retrieved.",
                        spoken_message=spoken_msg,
                        detected_language=lang,
                        original_text=orig_text,
                        normalized_text=norm_text,
                    )

                elif action == "filter_debtors":
                    raw_check = f"{orig_text} {norm_text}".lower()
                    threshold = 0.0
                    thresh_param = params.get("threshold") or params.get("amount")
                    if thresh_param:
                        try:
                            threshold = float(thresh_param)
                        except (ValueError, TypeError):
                            threshold = 0.0

                    if threshold <= 0:
                        num_match = re.search(r"(\d+[\d,]*)", raw_check)
                        if num_match:
                            threshold = float(num_match.group(1).replace(",", ""))
                        elif "पचास हजार" in raw_check or "pachaas hazaar" in raw_check or "50 hazar" in raw_check:
                            threshold = 50000.0
                        elif "बीस हजार" in raw_check or "bees hazaar" in raw_check or "20 hazar" in raw_check:
                            threshold = 20000.0
                        elif "दस हजार" in raw_check or "das hazaar" in raw_check or "10 hazar" in raw_check:
                            threshold = 10000.0
                        elif "हजार" in raw_check or "hazaar" in raw_check:
                            threshold = 1000.0

                    all_custs = customer_queries.get_customers_with_balances_by_shop(shop_id)
                    matches = [c for c in all_custs if float(c["balance"]) >= threshold and float(c["balance"]) > 0]

                    if not matches:
                        if lang == "hi":
                            spoken_msg = f"आपकी दुकान में ₹{threshold:,.2f} से अधिक बकाया उधार किसी का भी नहीं है।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = f"ଆପଣଙ୍କ ଦୋକାନରେ ₹{threshold:,.2f} ରୁ ଅଧିକ ବାକି ଉଧାର କାହାରି ନାହିଁ।"
                        elif lang in ("ta", "ta-latn"):
                            spoken_msg = f"உங்கள் கடையில் ₹{threshold:,.2f} க்கு மேல் யாருக்கும் கடன் பாக்கி இல்லை."
                        elif lang == "hi-latn":
                            spoken_msg = f"Aapki dukan me ₹{threshold:,.2f} se jyada baki udhaar kisi ka bhi nahi hai."
                        else:
                            spoken_msg = f"No customers currently have outstanding debt exceeding Rs {threshold:,.2f}."
                    else:
                        items_str = ", ".join(f"{c['name']} (₹{float(c['balance']):,.2f})" for c in matches)
                        if lang == "hi":
                            spoken_msg = f"₹{threshold:,.2f} से ज़्यादा उधार वाले {len(matches)} ग्राहक हैं: {items_str}।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = f"₹{threshold:,.2f} ରୁ ଅଧିକ ଉଧାର ଥିବା {len(matches)} ଜଣ ଗ୍ରାହକ ହେଲେ: {items_str}।"
                        elif lang in ("ta", "ta-latn"):
                            spoken_msg = f"₹{threshold:,.2f} க்கு மேல் கடன் உள்ள {len(matches)} வாடிக்கையாளர்கள்: {items_str}."
                        elif lang == "hi-latn":
                            spoken_msg = f"₹{threshold:,.2f} se jyada udhaar wale {len(matches)} grahak hain: {items_str}."
                        else:
                            spoken_msg = f"{len(matches)} customer(s) have debt over Rs {threshold:,.2f}: {items_str}."

                    return ExecutionResult(
                        success=True,
                        action="filter_debtors",
                        result={"customers": matches, "threshold": threshold, "count": len(matches)},
                        message=f"Found {len(matches)} customer(s) with debt >= Rs {threshold:,.2f}.",
                        spoken_message=spoken_msg,
                        detected_language=lang,
                        original_text=orig_text,
                        normalized_text=norm_text,
                    )

                elif action == "cleared_debtors":
                    all_custs = customer_queries.get_customers_with_balances_by_shop(shop_id)
                    cleared = [c for c in all_custs if float(c["balance"]) <= 0 and (float(c["total_paid"]) > 0 or float(c["total_credit"]) > 0)]

                    if not cleared:
                        if lang == "hi":
                            spoken_msg = "अभी किसी भी ग्राहक का उधार पूरी तरह चुकता नहीं है।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = "ବର୍ତ୍ତମାନ କୌଣସି ଗ୍ରାହକଙ୍କ ଉଧାର ସମ୍ପୂର୍ଣ୍ଣ କ୍ଲିୟର ହୋଇନାହିଁ।"
                        elif lang in ("ta", "ta-latn"):
                            spoken_msg = "தற்போது எந்த வாடிக்கையாளரின் கடனும் முழுமையாக தீர்க்கப்படவில்லை."
                        else:
                            spoken_msg = "No customers currently have cleared their dues."
                    else:
                        names_str = ", ".join(c["name"] for c in cleared)
                        if lang == "hi":
                            spoken_msg = f"इन ग्राहकों का पूरा उधार चुकता हो चुका है: {names_str}। इनका बैलेंस अब ₹0.00 है।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = f"ଏହି ଗ୍ରାହକମାନଙ୍କର ସମସ୍ତ ଉଧାର କ୍ଲିୟର ହୋଇଯାଇଛି: {names_str}। ବାକି ଏବେ ₹0.00 ଅଛି।"
                        elif lang in ("ta", "ta-latn"):
                            spoken_msg = f"இந்த வாடிக்கையாளர்களின் கடன் முழுவதும் தீர்க்கப்பட்டது: {names_str}. பாக்கி ₹0.00."
                        elif lang == "hi-latn":
                            spoken_msg = f"In grahakon ka pura udhaar clear ho chuka hai: {names_str}. Balance ab ₹0.00 hai."
                        else:
                            spoken_msg = f"The following customers have fully cleared their debt: {names_str} (Balance: Rs 0.00)."

                    return ExecutionResult(
                        success=True,
                        action="cleared_debtors",
                        result={"cleared_customers": cleared, "count": len(cleared)},
                        message=f"Found {len(cleared)} customer(s) with cleared debt.",
                        spoken_message=spoken_msg,
                        detected_language=lang,
                        original_text=orig_text,
                        normalized_text=norm_text,
                    )

                elif action == "check_balance":
                    cust_name = params.get("customer_name") or entities.get("customer")
                    if not cust_name:
                        all_custs = customer_queries.get_customers_with_balances_by_shop(shop_id)
                        for c in all_custs:
                            if c["name"].lower() in raw_l:
                                cust_name = c["name"]
                                break
                    if cust_name:
                        resolved = CustomerService.resolve_customer(shop_id, cust_name)
                        bal_info = customer_queries.get_customer_balance_in_db(shop_id, resolved["id"])
                        bal = float(bal_info["balance"]) if bal_info else 0.0
                        tot_cr = float(bal_info["total_credit"]) if bal_info else 0.0
                        tot_pd = float(bal_info["total_paid"]) if bal_info else 0.0
                        if lang == "hi":
                            spoken_msg = f"{resolved['name']} का कुल उधार ₹{tot_cr:,.2f}, जमा ₹{tot_pd:,.2f}, और वर्तमान बकाया ₹{bal:,.2f} है।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = f"{resolved['name']}ଙ୍କ ମୋଟ ବାକି ଉଧାର ₹{bal:,.2f} ଅଛି।"
                        elif lang in ("ta", "ta-latn"):
                            spoken_msg = f"{resolved['name']} அவர்களின் மொத்த கடன் பாக்கி ₹{bal:,.2f}."
                        elif lang == "hi-latn":
                            spoken_msg = f"{resolved['name']} ka kul udhaar ₹{tot_cr:,.2f}, jama ₹{tot_pd:,.2f}, aur baki ₹{bal:,.2f} hai."
                        else:
                            spoken_msg = f"{resolved['name']} has Rs {bal:,.2f} outstanding debt."
                        return ExecutionResult(
                            success=True,
                            action="check_balance",
                            result=bal_info or resolved,
                            message=f"Balance for {resolved['name']}: Rs {bal:,.2f}.",
                            spoken_message=spoken_msg,
                            detected_language=lang,
                            original_text=orig_text,
                            normalized_text=norm_text,
                        )

            if intent == "credit_transaction":
                if action in ("record_credit", "record_payment", "record_debit"):
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
                    lang = detect_language(orig_text or norm_text)
                    new_bal_info = customer_queries.get_customer_balance_in_db(shop_id=shop_id, customer_id=cust_id)
                    new_bal = float(new_bal_info["balance"]) if new_bal_info and new_bal_info.get("balance") is not None else 0.0
                    if t_type == "payment":
                        if lang == "hi":
                            if new_bal > 0:
                                spoken_msg = f"{resolved_cust['name']} से ₹{tx['amount']:,.2f} का भुगतान जमा कर दिया गया है। खाते में अब बाकी उधार ₹{new_bal:,.2f} है।"
                            else:
                                spoken_msg = f"{resolved_cust['name']} से ₹{tx['amount']:,.2f} प्राप्त हुए। पूरा उधार चुकता हो चुका है, बैलेंस अब ₹0.00 है।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = f"{resolved_cust['name']}ଙ୍କଠାରୁ ₹{tx['amount']:,.2f} ଜମା କରାଗଲା। ବାକି ଉଧାର ଏବେ ₹{new_bal:,.2f} ଅଛି।"
                        elif lang in ("ta", "ta-latn"):
                            if new_bal > 0:
                                spoken_msg = f"{resolved_cust['name']} இடமிருந்து ₹{tx['amount']:,.2f} பெறப்பட்டது. மீதமுள்ள கடன் பாக்கி ₹{new_bal:,.2f}."
                            else:
                                spoken_msg = f"{resolved_cust['name']} இடமிருந்து ₹{tx['amount']:,.2f} பெறப்பட்டது. அனைத்து கடனும் தீர்க்கப்பட்டது, பாக்கி ₹0.00."
                        elif lang == "hi-latn":
                            spoken_msg = f"{resolved_cust['name']} se ₹{tx['amount']:,.2f} ka payment jama ho gaya hai. Khate me baki udhaar ₹{new_bal:,.2f} hai."
                        else:
                            spoken_msg = f"Payment of Rs {tx['amount']:,.2f} recorded for {resolved_cust['name']}. Remaining balance is Rs {new_bal:,.2f}."
                    else:
                        float_amt = float(tx['amount'])
                        disp_amt = int(float_amt) if float_amt.is_integer() else f"{float_amt:,.2f}"
                        if params.get("is_ai_busy") or params.get("busy_fallback"):
                            if resolved_cust['name'] in ("Customer", "Grahak"):
                                spoken_msg = f"Theek hai bhaiya, ₹{disp_amt} ka udhaar khate me darj kar diya hai."
                            else:
                                spoken_msg = f"Theek hai bhaiya, {resolved_cust['name']} ji ke khate me ₹{disp_amt} ka udhaar darj kar diya hai."
                        else:
                            spoken_msg = get_localized_confirmation(
                                action=action,
                                customer=resolved_cust['name'],
                                amount=tx['amount'],
                                lang=lang,
                                was_created=was_created
                            )
                    try:
                        sh_data = shop_queries.get_shop_by_id(shop_id)
                        ow_id = sh_data["owner_id"] if sh_data else 1
                        float_amt = float(tx['amount'])
                        disp_amt = int(float_amt) if float_amt.is_integer() else f"{float_amt:,.2f}"
                        if params.get("is_ai_busy") or params.get("busy_fallback"):
                            n_title = f"📋 Request Recorded: ₹{disp_amt} {t_type.capitalize()}"
                            n_msg = f"₹{float_amt:,.2f} {t_type} entry for {resolved_cust['name']} has been successfully recorded in your ledger. (System was busy, processed via resilient queue)."
                        else:
                            n_title = f"नया उधार / Credit: {resolved_cust['name']}" if t_type == "credit" else f"भुगतान प्राप्त / Payment: {resolved_cust['name']}"
                            n_msg = f"{t_type.capitalize()} of Rs {tx['amount']} recorded for {resolved_cust['name']}."
                        notification_queries.create_notification(
                            shop_id=shop_id,
                            user_id=ow_id,
                            title=n_title,
                            message=n_msg,
                            notification_type=t_type,
                        )
                    except Exception:
                        pass
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=tx,
                        message=f"{created_prefix}{t_type.capitalize()} of Rs {tx['amount']} {status_note} for {resolved_cust['name']}.",
                        spoken_message=spoken_msg,
                        detected_language=lang,
                        original_text=orig_text,
                        normalized_text=norm_text,
                        normalization_notes=norm_meta,
                    )
                elif action == "clear_debt":
                    cust_name = params.get("customer_name") or entities.get("customer")
                    if not cust_name:
                        return ExecutionResult(
                            success=True,
                            action=action,
                            clarification_needed=True,
                            clarification_question="Kripya grahak ka naam batayein jiska udhar clear karna hai.",
                            original_text=orig_text,
                        )
                    resolved_cust = CustomerService.resolve_customer(shop_id=shop_id, name_or_phone=cust_name)
                    cust_id = resolved_cust["id"]
                    bal_info = customer_queries.get_customer_balance_in_db(shop_id=shop_id, customer_id=cust_id)
                    current_balance = float(bal_info["balance"]) if bal_info and bal_info.get("balance") is not None else 0.0
                    lang = detect_language(orig_text or norm_text)
                    if current_balance <= 0:
                        spoken_msg = get_localized_confirmation(
                            action="already_cleared",
                            customer=resolved_cust["name"],
                            amount=0.0,
                            lang=lang,
                        )
                        return ExecutionResult(
                            success=True,
                            action=action,
                            result={"customer": resolved_cust, "balance": 0.0, "cleared_amount": 0.0},
                            message=f"Customer '{resolved_cust['name']}' has no outstanding balance (Balance: Rs 0.00).",
                            spoken_message=spoken_msg,
                            detected_language=lang,
                            original_text=orig_text,
                            normalized_text=norm_text,
                            normalization_notes=norm_meta,
                        )

                    amount_param = params.get("amount") or entities.get("amount")
                    specified_amount = 0.0
                    if amount_param:
                        try:
                            specified_amount = float(amount_param)
                        except (ValueError, TypeError):
                            specified_amount = 0.0

                    if specified_amount > 0 and specified_amount < current_balance:
                        tx = TransactionService.record_transaction(
                            shop_id=shop_id,
                            customer_id=cust_id,
                            transaction_type="payment",
                            amount=specified_amount,
                            description=f"Payment received / ₹{specified_amount:,.2f} जमा (deducted from balance)",
                            request_id=request_id,
                        )
                        new_bal_info = customer_queries.get_customer_balance_in_db(shop_id=shop_id, customer_id=cust_id)
                        new_bal = float(new_bal_info["balance"]) if new_bal_info and new_bal_info.get("balance") is not None else max(0.0, current_balance - specified_amount)
                        if lang == "hi":
                            spoken_msg = f"{resolved_cust['name']} से ₹{specified_amount:,.2f} का भुगतान जमा कर दिया गया है। खाते में अब बाकी उधार ₹{new_bal:,.2f} है।"
                        elif lang in ("or", "or-latn"):
                            spoken_msg = f"{resolved_cust['name']}ଙ୍କଠାରୁ ₹{specified_amount:,.2f} ଜମା କରାଗଲା। ବାକି ଉଧାର ଏବେ ₹{new_bal:,.2f} ଅଛି।"
                        elif lang in ("ta", "ta-latn"):
                            spoken_msg = f"{resolved_cust['name']} இடமிருந்து ₹{specified_amount:,.2f} பெறப்பட்டது. மீதமுள்ள கடன் பாக்கி ₹{new_bal:,.2f}."
                        elif lang == "hi-latn":
                            spoken_msg = f"{resolved_cust['name']} se ₹{specified_amount:,.2f} ka payment jama ho gaya hai. Khate me baki udhaar ₹{new_bal:,.2f} hai."
                        else:
                            spoken_msg = f"Payment of Rs {specified_amount:,.2f} recorded for {resolved_cust['name']}. Remaining balance is Rs {new_bal:,.2f}."
                        try:
                            sh_data = shop_queries.get_shop_by_id(shop_id)
                            ow_id = sh_data["owner_id"] if sh_data else 1
                            notification_queries.create_notification(
                                shop_id=shop_id,
                                user_id=ow_id,
                                title=f"भुगतान प्राप्त / Payment: {resolved_cust['name']}",
                                message=f"Payment of Rs {specified_amount:,.2f} recorded for {resolved_cust['name']}. Remaining balance: Rs {new_bal:,.2f}.",
                                notification_type="payment",
                            )
                        except Exception:
                            pass
                        return ExecutionResult(
                            success=True,
                            action="record_payment",
                            result=tx,
                            message=f"Payment of Rs {specified_amount:,.2f} recorded for {resolved_cust['name']}. Remaining balance: Rs {new_bal:,.2f}.",
                            spoken_message=spoken_msg,
                            detected_language=lang,
                            original_text=orig_text,
                            normalized_text=norm_text,
                            normalization_notes=norm_meta,
                        )

                    tx = TransactionService.record_transaction(
                        shop_id=shop_id,
                        customer_id=cust_id,
                        transaction_type="payment",
                        amount=current_balance,
                        description="Full credit clearance / उधार चुकता",
                        request_id=request_id,
                    )
                    spoken_msg = get_localized_confirmation(
                        action="clear_debt",
                        customer=resolved_cust["name"],
                        amount=current_balance,
                        lang=lang,
                    )
                    try:
                        sh_data = shop_queries.get_shop_by_id(shop_id)
                        ow_id = sh_data["owner_id"] if sh_data else 1
                        notification_queries.create_notification(
                            shop_id=shop_id,
                            user_id=ow_id,
                            title=f"उधार चुकता / Debt Cleared: {resolved_cust['name']}",
                            message=f"Full outstanding balance of Rs {current_balance} cleared for {resolved_cust['name']}.",
                            notification_type="payment",
                        )
                    except Exception:
                        pass
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=tx,
                        message=f"Outstanding balance of Rs {current_balance} cleared for {resolved_cust['name']}.",
                        spoken_message=spoken_msg,
                        detected_language=lang,
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
                    lang = detect_language(orig_text or norm_text)
                    spoken_msg = get_localized_confirmation(
                        action="add_customer",
                        customer=new_c['name'],
                        lang=lang
                    )
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=new_c,
                        message=f"Customer '{new_c['name']}' added successfully.",
                        spoken_message=spoken_msg,
                        detected_language=lang,
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
                items_list = params.get("items") or entities.get("items")
                if action in ("batch_add_product", "batch_add_stock") or (isinstance(items_list, list) and len(items_list) > 0):
                    return IntentExecutor._execute_batch_stock_addition(
                        shop_id, items_list, action, orig_text, norm_text, norm_meta
                    )

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
                    lang = detect_language(orig_text or norm_text)
                    spoken_msg = get_localized_confirmation(
                        action="add_product",
                        customer=prod['name'],
                        amount=prod['price'],
                        lang=lang
                    )
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=prod,
                        message=f"Product '{prod['name']}' added at Rs {prod['price']}.",
                        spoken_message=spoken_msg,
                        detected_language=lang,
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
                items_list = params.get("items") or entities.get("items")
                if action in ("batch_add_stock", "batch_add_product") or (isinstance(items_list, list) and len(items_list) > 0):
                    return IntentExecutor._execute_batch_stock_addition(
                        shop_id, items_list, action, orig_text, norm_text, norm_meta
                    )

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

                matches = product_queries.search_products(shop_id, p_name)
                exact_prod = next((p for p in matches if p["name"].lower() == p_name.lower()), None) if matches else None
                existing_price = Decimal(str(exact_prod["price"])) if exact_prod and exact_prod.get("price") is not None else Decimal("0.00")
                provided_price = params.get("price")
                v_price = Decimal(str(provided_price)) if provided_price is not None and str(provided_price).strip() else Decimal("0.00")

                market_source = None
                if action in ("add_stock", "adjust_stock") and (not exact_prod or existing_price <= Decimal("0.00")) and v_price <= Decimal("0.00"):
                    disc = get_market_price(p_name, params.get("unit"))
                    if disc and disc.get("price") and float(disc["price"]) > 0:
                        v_price = Decimal(str(disc["price"]))
                        market_source = disc.get("source")
                    else:
                        unit_label = params.get("unit") or (exact_prod.get("unit") if exact_prod else "kilo") or "kilo"
                        PendingContextManager.set(shop_id, {
                            "action": "awaiting_product_price",
                            "product_name": p_name,
                            "quantity": qty_change,
                            "unit": unit_label,
                        })
                        cq = f"{p_name} ka rate kitne rupaye prati {unit_label} hai? Kripya bhav batayein."
                        return ExecutionResult(
                            success=True,
                            action="ask_product_price",
                            clarification_needed=True,
                            clarification_question=cq,
                            message=cq,
                            spoken_message=cq,
                            original_text=orig_text,
                            normalized_text=norm_text,
                            normalization_notes=norm_meta,
                        )

                final_price = v_price if v_price > Decimal("0.00") else existing_price
                auto_create_prod = action in ("add_stock", "adjust_stock")
                res_prod, was_prod_created = ProductService.resolve_or_create_product(
                    shop_id=shop_id,
                    product_name=p_name,
                    price=final_price,
                    unit=params.get("unit") or (exact_prod["unit"] if exact_prod else "unit"),
                    auto_create=auto_create_prod,
                )
                if v_price > Decimal("0.00") and float(res_prod.get("price") or 0) != float(v_price):
                    ProductService.update_product_price(shop_id, res_prod["id"], float(v_price))

                if action == "reduce_stock" and Decimal(str(qty_change)) > Decimal("0.00"):
                    qty_change = -Decimal(str(qty_change))

                adj = InventoryService.adjust_stock(
                    shop_id=shop_id,
                    product_id=res_prod["id"],
                    quantity_change=qty_change,
                    reason=params.get("reason") or action,
                )
                PendingContextManager.clear(shop_id)
                u_str = res_prod.get('unit') or ''
                if market_source:
                    p_str = f" (₹{float(final_price):,.2f} prati {u_str or 'unit'} ke bazar bhav se)"
                elif final_price > Decimal("0.00"):
                    p_str = f" (₹{float(final_price):,.2f} ke bhav se)"
                else:
                    p_str = ""
                lang = detect_language(orig_text or norm_text)
                if lang in ("ta", "ta-latn"):
                    spoken_msg = f"{res_prod['name']} {qty_change} {u_str} இருப்பில் சேர்க்கப்பட்டது{p_str}. மொத்த இருப்பு: {adj['new_quantity']} {u_str}."
                elif lang in ("or", "or-latn"):
                    spoken_msg = f"{res_prod['name']} ର {qty_change} {u_str} ଷ୍ଟକରେ ଯୋଡ଼ାଗଲା{p_str}। ମୋଟ ଷ୍ଟକ: {adj['new_quantity']} {u_str}।"
                elif lang == "hi":
                    spoken_msg = f"{res_prod['name']} का {qty_change} {u_str} स्टॉक में जोड़ दिया गया है{p_str}। कुल स्टॉक: {adj['new_quantity']} {u_str}।"
                else:
                    spoken_msg = f"{res_prod['name']} ka {qty_change} {u_str} stock me add ho gaya hai{p_str}। Kul stock: {adj['new_quantity']} {u_str}."
                prod_created_prefix = f"New product '{res_prod['name']}' initialized. " if was_prod_created else ""
                audit_msg = f"{prod_created_prefix}Stock for '{res_prod['name']}' adjusted by {qty_change}. New quantity: {adj['new_quantity']}."
                return ExecutionResult(
                    success=True,
                    action=action,
                    result=adj,
                    message=audit_msg,
                    spoken_message=spoken_msg,
                    original_text=orig_text,
                    normalized_text=norm_text,
                    normalization_notes=norm_meta,
                )

            elif intent == "stock_query":
                if action == "check_stock":
                    p_name = params.get("product_name") or entities.get("product")
                    p_id = None
                    p_display_name = p_name
                    if p_name:
                        try:
                            res_prod = ProductService.resolve_product(shop_id, p_name)
                            p_id = res_prod["id"]
                            p_display_name = res_prod.get("name") or p_name
                        except EntityNotFoundError:
                            spoken_msg = f"Bhai, '{p_name}' aapke dukaan par nahi hai."
                            return ExecutionResult(
                                success=True,
                                action=action,
                                result=[],
                                message=spoken_msg,
                                spoken_message=spoken_msg,
                                original_text=orig_text,
                            )
                    stock_list = InventoryService.get_stock(shop_id, product_id=p_id)
                    if p_name and stock_list:
                        curr_qty = stock_list[0].get("quantity") or 0
                        curr_unit = stock_list[0].get("unit") or "unit"
                        if float(curr_qty) > 0:
                            spoken_msg = f"Bhai, aapke dukaan par {p_display_name} ka stock {curr_qty} {curr_unit} uplabdh hai."
                        else:
                            spoken_msg = f"Bhai, {p_display_name} aapke dukaan par khatam ho gaya hai (stock 0 hai)."
                    elif p_name:
                        spoken_msg = f"Bhai, '{p_name}' aapke dukaan par nahi hai."
                    else:
                        spoken_msg = f"Bhai, aapki dukaan me kul {len(stock_list)} products ka stock darj hai."
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=stock_list,
                        message=spoken_msg,
                        spoken_message=spoken_msg,
                        original_text=orig_text,
                    )
                elif action == "check_low_stock":
                    low_stock = InventoryService.get_low_stock(shop_id)
                    count_low = len(low_stock)
                    if count_low > 0:
                        names = ", ".join(item.get("name", "Product") for item in low_stock[:5])
                        spoken_msg = f"Bhai, aapke dukaan par {count_low} items ka stock kam hai: {names}."
                    else:
                        spoken_msg = "Bhai, aapke dukaan par sabhi items ka stock theek hai."
                    return ExecutionResult(
                        success=True,
                        action=action,
                        result=low_stock,
                        message=spoken_msg,
                        spoken_message=spoken_msg,
                        original_text=orig_text,
                    )

            elif intent == "history_query":
                cust_name = params.get("customer_name") or entities.get("customer")
                if cust_name:
                    res_cust = CustomerService.resolve_customer(shop_id, cust_name)
                    txs = TransactionService.get_customer_transactions(shop_id, res_cust["id"])
                    return ExecutionResult(success=True, action=action, result=txs, message=f"History for {res_cust['name']}.", original_text=orig_text)
                txs = TransactionService.get_shop_transactions(shop_id)
                return ExecutionResult(success=True, action=action, result=txs, message="Shop transactions retrieved.", original_text=orig_text)

            elif intent == "supplier_order" or action in ("order_from_supplier", "restock_order"):
                raw_item = params.get("item") or params.get("product_name") or entities.get("product") or "doodh"
                qty_raw = params.get("quantity") or params.get("quantity_change")
                if not qty_raw:
                    match_num = re.search(r'(\d+)', raw_l)
                    qty_raw = match_num.group(1) if match_num else "20"
                unit_val = params.get("unit") or "packet"
                if "bori" in raw_l:
                    unit_val = "bori"
                elif "kilo" in raw_l or "kg" in raw_l:
                    unit_val = "kg"
                elif "packet" in raw_l:
                    unit_val = "packet"
                timing_val = params.get("timing") or "kal subah"
                if "tomorrow" in raw_l or "kal" in raw_l:
                    timing_val = "kal subah" if "subah" in raw_l or "morning" in raw_l else "kal"
                elif "aaj sham" in raw_l or "evening" in raw_l:
                    timing_val = "aaj sham"

                sh_data = shop_queries.get_shop_by_id(shop_id)
                shop_name_display = sh_data.get("name") if sh_data else "Meri Dukaan"

                supp = supplier_queries.find_supplier_by_category_or_name(shop_id, raw_item)
                supp_name = supp["name"] if supp else "Dairy Distributor"
                supp_phone = (supp.get("phone") or "9876543210") if supp else "9876543210"

                clean_phone = re.sub(r"[^0-9]", "", supp_phone)
                if not clean_phone.startswith("91") and len(clean_phone) == 10:
                    clean_phone = "91" + clean_phone

                whatsapp_text = (
                    f"*नमस्ते जी!* 🙏\n\n"
                    f"*{shop_name_display}* से आर्डर:\n"
                    f"कृपया *{timing_val}* के लिए निम्नलिखित सामान भेजें:\n"
                    f"📦 *{qty_raw} {unit_val}* - *{raw_item.title()}*\n\n"
                    f"धन्यवाद! 🙏\n"
                    f"*{shop_name_display}*"
                )
                whatsapp_url = f"https://api.whatsapp.com/send?phone={clean_phone}&text={quote(whatsapp_text)}"

                spoken_msg = f"{timing_val.capitalize()} ke liye {qty_raw} {unit_val} {raw_item} ka order draft taiyar hai. WhatsApp par distributor ko bhejne ke liye ready hai."
                audit_msg = f"Supplier order for {qty_raw} {unit_val} {raw_item} drafted for {supp_name}."

                try:
                    ow_id = sh_data["owner_id"] if sh_data else 1
                    notification_queries.create_notification(
                        shop_id=shop_id,
                        user_id=ow_id,
                        title=f"सप्लायर ऑर्डर: {raw_item.title()}",
                        message=f"{supp_name} के लिए {qty_raw} {unit_val} {raw_item} का ऑर्डर तैयार है।",
                        notification_type="supplier_order",
                    )
                except Exception:
                    pass

                return ExecutionResult(
                    success=True,
                    action="order_from_supplier",
                    result={
                        "supplier_name": supp_name,
                        "supplier_phone": supp_phone,
                        "item": raw_item,
                        "quantity": str(qty_raw),
                        "unit": unit_val,
                        "timing": timing_val,
                        "whatsapp_url": whatsapp_url,
                        "whatsapp_message": whatsapp_text,
                    },
                    message=audit_msg,
                    spoken_message=spoken_msg,
                    original_text=orig_text,
                    normalized_text=norm_text,
                    normalization_notes=norm_meta,
                )

            cq = "Maaf kijiye, yeh command samajh nahi aayi. Kripya dobara bolein ya dukaan ka hisaab batayein."
            return ExecutionResult(
                success=False,
                action=action,
                clarification_needed=True,
                clarification_question=cq,
                message=cq,
                spoken_message=cq,
                original_text=orig_text,
            )

        except NegativeContradictionError as exc:
            msg = str(exc)
            return ExecutionResult(
                success=True,
                action=action,
                clarification_needed=True,
                clarification_question=msg,
                message=msg,
                spoken_message=msg,
                original_text=orig_text,
            )
        except AmbiguousEntityError as exc:
            msg = str(exc)
            return ExecutionResult(
                success=True,
                action=action,
                clarification_needed=True,
                clarification_question=msg,
                message=msg,
                spoken_message=msg,
                original_text=orig_text,
            )
        except EntityNotFoundError as exc:
            err_msg = str(exc)
            err_msg = re.sub(r'(?:in|for|from)?\s*shop\s*(?:id)?\s*[:=]?\s*\d+', 'aapke dukaan par', err_msg, flags=re.IGNORECASE)
            err_msg = re.sub(r'shop_id\s*[:=]?\s*\d+', '', err_msg, flags=re.IGNORECASE).strip()
            if "aapke dukaan" in err_msg or "aapki dukaan" in err_msg:
                msg = f"Bhai, {err_msg}."
            else:
                msg = f"Bhai, '{orig_text}' aapke dukaan par nahi hai."
            return ExecutionResult(
                success=False,
                action=action,
                clarification_needed=True,
                clarification_question=msg,
                message=msg,
                spoken_message=msg,
                original_text=orig_text,
            )
        except InsufficientStockError as exc:
            return ExecutionResult(success=False, action=action, message=str(exc), original_text=orig_text)
        except ValidationError as exc:
            return ExecutionResult(success=False, action=action, message=str(exc), original_text=orig_text)
        except BusinessLogicError as exc:
            return ExecutionResult(success=False, action=action, message=str(exc), original_text=orig_text)
        except Exception as exc:
            logger.error("IntentExecutor unexpected failure: %s", exc, exc_info=True)
            return ExecutionResult(success=False, action=action, message="Database operation failed.", original_text=orig_text)
