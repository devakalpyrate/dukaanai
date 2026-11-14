from decimal import Decimal
from typing import Any, Dict, Optional
from app.queries import customer as customer_queries
from app.queries import notification as notification_queries
from app.queries import shops as shop_queries
from app.queries import transaction as transaction_queries
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
from app.services.language_detection import detect_language, get_localized_confirmation

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
        self.message = message
        self.clarification_needed = clarification_needed
        self.clarification_question = clarification_question
        self.requires_confirmation = requires_confirmation
        self.original_text = original_text
        self.normalized_text = normalized_text
        self.normalization_notes = normalization_notes or {}
        self.spoken_message = spoken_message or message
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

        try:
            if intent in ("customer_query", "khata_query") or action in ("list_customers", "top_debtors", "filter_debtors", "cleared_debtors", "check_balance"):
                lang = detect_language(orig_text or norm_text)
                if action == "list_customers":
                    all_custs = customer_queries.get_customers_with_balances_by_shop(shop_id)
                    count = len(all_custs)
                    if count == 0:
                        if lang == "hi":
                            spoken_msg = "आपकी दुकान की लिस्ट में अभी कोई ग्राहक नहीं है।"
                        elif lang == "or":
                            spoken_msg = "ଆପଣଙ୍କ ଦୋକାନ ତାଲିକାରେ ବର୍ତ୍ତମାନ କୌଣସି ଗ୍ରାହକ ନାହାଁନ୍ତି।"
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
                    elif lang == "or":
                        spoken_msg = f"ଆପଣଙ୍କ ଦୋକାନରେ ମୋଟ {count} ଜଣ ଗ୍ରାହକ ଅଛନ୍ତି ଏବଂ ମୋଟ ବାକି ଉଧାର ₹{total_debt:,.2f} ଅଛି।"
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
                        elif lang == "or":
                            spoken_msg = "ଆପଣଙ୍କ ଦୋକାନରେ କୌଣସି ଗ୍ରାହକଙ୍କ ବାକି ଉଧାର ନାହିଁ।"
                        else:
                            spoken_msg = "No customers have outstanding debt."
                        return ExecutionResult(success=True, action="top_debtors", result={"top_debtors": [], "limit": limit_val}, message="No active debtors found.", spoken_message=spoken_msg, detected_language=lang, original_text=orig_text)

                    items_str = ", ".join(f"{i+1}. {c['name']} (₹{float(c['balance']):,.2f})" for i, c in enumerate(top_list))
                    if lang == "hi":
                        spoken_msg = f"सबसे ज़्यादा उधार वाले टॉप {len(top_list)} ग्राहक हैं: {items_str}।"
                    elif lang == "or":
                        spoken_msg = f"ସର୍ବାଧିକ ଉଧାର ଥିବା ଟପ୍ {len(top_list)} ଗ୍ରାହକ ହେଲେ: {items_str}।"
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
                        import re
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
                        elif lang == "or":
                            spoken_msg = f"ଆପଣଙ୍କ ଦୋକାନରେ ₹{threshold:,.2f} ରୁ ଅଧିକ ବାକି ଉଧାର କାହାରି ନାହିଁ।"
                        elif lang == "hi-latn":
                            spoken_msg = f"Aapki dukan me ₹{threshold:,.2f} se jyada baki udhaar kisi ka bhi nahi hai."
                        else:
                            spoken_msg = f"No customers currently have outstanding debt exceeding Rs {threshold:,.2f}."
                    else:
                        items_str = ", ".join(f"{c['name']} (₹{float(c['balance']):,.2f})" for c in matches)
                        if lang == "hi":
                            spoken_msg = f"₹{threshold:,.2f} से ज़्यादा उधार वाले {len(matches)} ग्राहक हैं: {items_str}।"
                        elif lang == "or":
                            spoken_msg = f"₹{threshold:,.2f} ରୁ ଅଧିକ ଉଧାର ଥିବା {len(matches)} ଜଣ ଗ୍ରାହକ ହେଲେ: {items_str}।"
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
                        elif lang == "or":
                            spoken_msg = "ବର୍ତ୍ତମାନ କୌଣସି ଗ୍ରାହକଙ୍କ ଉଧାର ସମ୍ପୂର୍ଣ୍ଣ କ୍ଲିୟର ହୋଇନାହିଁ।"
                        else:
                            spoken_msg = "No customers currently have cleared their dues."
                    else:
                        names_str = ", ".join(c["name"] for c in cleared)
                        if lang == "hi":
                            spoken_msg = f"इन ग्राहकों का पूरा उधार चुकता हो चुका है: {names_str}। इनका बैलेंस अब ₹0.00 है।"
                        elif lang == "or":
                            spoken_msg = f"ଏହି ଗ୍ରାହକମାନଙ୍କର ସମସ୍ତ ଉଧାର କ୍ଲିୟର ହୋଇଯାଇଛି: {names_str}। ବାକି ଏବେ ₹0.00 ଅଛି।"
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
                        import re
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
                        elif lang == "or":
                            spoken_msg = f"{resolved['name']}ଙ୍କ ମୋଟ ବାକି ଉଧାର ₹{bal:,.2f} ଅଛି।"
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
                    lang = detect_language(orig_text or norm_text)
                    new_bal_info = customer_queries.get_customer_balance_in_db(shop_id=shop_id, customer_id=cust_id)
                    new_bal = float(new_bal_info["balance"]) if new_bal_info and new_bal_info.get("balance") is not None else 0.0
                    if t_type == "payment":
                        if lang == "hi":
                            if new_bal > 0:
                                spoken_msg = f"{resolved_cust['name']} से ₹{tx['amount']:,.2f} का भुगतान जमा कर दिया गया है। खाते में अब बाकी उधार ₹{new_bal:,.2f} है।"
                            else:
                                spoken_msg = f"{resolved_cust['name']} से ₹{tx['amount']:,.2f} प्राप्त हुए। पूरा उधार चुकता हो चुका है, बैलेंस अब ₹0.00 है।"
                        elif lang == "or":
                            spoken_msg = f"{resolved_cust['name']}ଙ୍କଠାରୁ ₹{tx['amount']:,.2f} ଜମା କରାଗଲା। ବାକି ଉଧାର ଏବେ ₹{new_bal:,.2f} ଅଛି।"
                        elif lang == "hi-latn":
                            spoken_msg = f"{resolved_cust['name']} se ₹{tx['amount']:,.2f} ka payment jama ho gaya hai. Khate me baki udhaar ₹{new_bal:,.2f} hai."
                        else:
                            spoken_msg = f"Payment of Rs {tx['amount']:,.2f} recorded for {resolved_cust['name']}. Remaining balance is Rs {new_bal:,.2f}."
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
                        elif lang == "or":
                            spoken_msg = f"{resolved_cust['name']}ଙ୍କଠାରୁ ₹{specified_amount:,.2f} ଜମା କରାଗଲା। ବାକି ଉଧାର ଏବେ ₹{new_bal:,.2f} ଅଛି।"
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
