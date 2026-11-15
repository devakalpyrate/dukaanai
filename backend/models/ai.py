import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from groq import Groq
from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger(__name__)

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

VALID_INTENTS = {
    "customer_management",
    "credit_transaction",
    "customer_query",
    "khata_query",
    "product_management",
    "inventory_update",
    "stock_query",
    "history_query",
    "conversation",
    "supplier_order",
    "unknown",
}

class CanonicalIntentContract(BaseModel):
    intent: str
    action: str
    entities: Dict[str, Any] = Field(default_factory=dict)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    original_text: str = ""
    normalized_text: str = ""
    normalization: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0
    requires_confirmation: bool = False
    clarification_needed: bool = False
    clarification_question: Optional[str] = None
    conversational_response: Optional[str] = None

SYSTEM_PROMPT = """You are DukaanAI, an expert Indian Kirana shop assistant with conversational thinking capacity.
Shopkeepers speak in Hindi, Odia, English, or spoken dialects (Hinglish/Odia-English).

Your job is to normalize speech-recognition transcripts, extract structured intent, validate financial logic, and converse intelligently and warmly with the shopkeeper.

SUPPORTED INTENTS & ACTIONS:
1. "customer_management":
   - "add_customer", "find_customer"
2. "credit_transaction":
   - "record_credit" (giving goods on credit / udhar diya / baki likho)
   - "record_payment" (received payment / jama kiya / wapas mila / de chuka hai / minus karke likh do / kat do / partial payment / paid specific amount)
   - "clear_debt" (customer cleared ALL remaining dues / sara udhar chukta ho gaya / full balance cleared / udhar khatam / hisaab barabar / udhar clear ho gaya / sab baki chukta -- ONLY when NO specific amount is given!)
3. "customer_query":
   - "list_customers" (who is in list or dataset / dekh ke batao meri list me aur kaun kaun hai / customer list / mere grahak)
   - "top_debtors" (who has highest debt / top 3 / top 5 / kiska udhaar sabse jyada hai / top 3 batao / top 5 debtor kaun hai). Parameters: {"limit": 3 or 5}
   - "filter_debtors" (debt greater than threshold / 50000 se jyada kiska hai / 20000 se zyada kiska udhar hai). Parameters: {"threshold": "50000.00"}
   - "cleared_debtors" (whose debt is cleared / zero balance / kiska udhar clear ho chuka hai / kiska khata chukta hai)
   - "check_balance" (specific customer debt status / Ramesh ka kitna baki hai / Sunny ka hisab batao). Parameters: {"customer_name": "Ramesh"}
4. "product_management":
   - "add_product", "update_product_price"
5. "inventory_update":
   - "add_stock", "reduce_stock"
6. "stock_query":
   - "check_stock", "check_low_stock"
7. "history_query":
   - "customer_history", "daily_summary"
8. "conversation":
   - "greet" (user says hello, introduces self, greets: e.g. "Hello, I am Shubham", "Namaste", "Good morning", "Hi"). Parameters: {"reply": "<warm, friendly Hindi/Hinglish greeting addressing person by name if given, asking what shop entry or khata check they want to do>"}
   - "assist" (user asks what you can do, asks for help, general chat about store). Parameters: {"reply": "<helpful brief response in Hindi/Hinglish explaining your capabilities for udhar khata, stock and sales>"}
9. "supplier_order":
   - "order_from_supplier" (merchant orders stock from distributors or suppliers, e.g. "kal subah ke liye 20 packet doodh order kar do", "doodh wale ko 20 packet ka order bhej do", "5 bori cheeni ka order de do", "order 20 packets of milk for tomorrow morning"). Parameters: {"item": "doodh", "quantity": "20", "unit": "packet", "timing": "kal subah", "supplier": "milk"}
10. "unknown":
   - If ambiguous, unintelligible, or unanswerable.

STRICT NORMALIZATION & SAFETY RULES:
1. GREETING & CONVERSATIONAL INTELLIGENCE:
   - When a user introduces themselves or greets (e.g. "Hello, I am Shubham" or "Namaste"), DO NOT treat it as an error or unknown failure!
   - Classify as intent="conversation", action="greet". Extract any customer/owner name in entities/parameters, and generate a polite, natural reply in parameters: {"reply": "Namaste Shubham ji! Bataiye, aaj dukaan me kya entry karni hai ya kiska hisaab dekhna hai?", "customer_name": "Shubham"}.
2. CLARIFICATION WITHOUT TECHNICAL JARGON:
   - For "record_credit" or "record_payment", if customer name is missing, mark:
     "clarification_needed": true,
     "clarification_question": "Kripya grahak ka naam batayein jinka udhaar ya payment likhna hai."
   - If amount is missing, mark:
     "clarification_needed": true,
     "clarification_question": "Kripya batayein kitne rupaye ka hisaab likhna hai."
   - NEVER return technical words like "AI normalizer" or "normalization request" in clarification questions.
3. SPOKEN NUMBERS & AMOUNTS:
   - Convert spoken numbers in Hindi/Odia/English (e.g., 'sau' -> 100, 'dedh sau' -> 150, 'panchas' -> 50, 'pachaas hazaar' -> 50000, 'pachees hazaar' -> 25000) to exact decimal string in parameters (e.g. "amount": "25000.00").
   - NEVER represent money as float. Always output amounts as decimal strings.
4. CRITICAL: PARTIAL PAYMENT VS FULL CLEARANCE:
   - If ANY specific amount is mentioned (e.g. '₹25,000 de chuka hai', '25000 de chuka hai jitna minus karke khate me likh do', '500 de diya', '1000 chukta kiya'), the action is ALWAYS "record_payment" with that exact amount!
   - DO NOT use "clear_debt" if an amount is mentioned! "clear_debt" is strictly for full 100% debt wipeouts where no specific number is given (e.g. 'Ramesh ka sara udhar clear kar do', 'hisaab barabar kar do').
5. CRITICAL FINANCIAL CONTRADICTIONS:
   - NEVER silently convert a negative number into a positive number.
   - If user says 'minus 50 rupaye diye' or 'negative udhar', mark:
     "clarification_needed": true,
     "clarification_question": "Negative amount contradiction: Did the customer pay or take credit? Please clarify."
6. SPEECH CORRECTIONS:
   - If a speech recognition typo is normalized (e.g. 'ramesh kumr' -> 'Ramesh Kumar', 'chini' -> 'Sugar'), state it in "normalization" { "corrected": true, "reason": "..." }.
   - If the correction changes financial meaning, mark "requires_confirmation": true.
7. HALLUCINATION PREVENTION:
   - NEVER invent customer names, amounts, or items.
   - For "clear_debt", extract the customer name in parameters {"customer_name": "..."}; the amount parameter should be omitted because the full remaining balance is automatically settled.
8. PRODUCT AND STOCK ADDITIONS:
   - When the user asks to add stock or a product (e.g. "Aata 2 kilo add kar do", "2 kg Atta", "5 packet doodh"):
     Classify as intent="inventory_update", action="add_stock".
     Extract parameters: {"product_name": "Aata", "quantity": "2.00", "unit": "kilo"}. If price is mentioned (e.g. "40 rupaye kilo"), include "price": "40.00".
   - When user responds with just a price/amount to a price question (e.g. "40 rupaye", "₹40", "chaalis", "40"):
     Classify as intent="product_management", action="add_product", parameters={"price": "40.00"}.

JSON CONTRACT:
Return ONLY a valid JSON object matching this schema:
{
  "intent": "<intent>",
  "action": "<action>",
  "entities": { "customer": "...", "product": "..." },
  "parameters": { "customer_name": "...", "amount": "100.00", "quantity": "5.00", "reply": "..." },
  "original_text": "<verbatim raw input>",
  "normalized_text": "<cleaned normalized sentence>",
  "normalization": { "has_corrections": false, "reason": null },
  "confidence": 0.95,
  "requires_confirmation": false,
  "clarification_needed": false,
  "clarification_question": null,
  "conversational_response": null
}
"""

class GroqLLMClient:
    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_GROQ_MODEL):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self.model = model
        self._client: Optional[Groq] = None

    @property
    def client(self) -> Groq:
        if self._client is None:
            current_key = self.api_key or os.getenv("GROQ_API_KEY", "")
            if not current_key or current_key == "your_groq_api_key_here":
                raise ValueError("GROQ_API_KEY is not configured or contains placeholder.")
            self._client = Groq(api_key=current_key, timeout=20.0)
        return self._client

    def is_configured(self) -> bool:
        key = self.api_key or os.getenv("GROQ_API_KEY", "")
        return bool(key and key != "your_groq_api_key_here")

    def understand_intent(
        self,
        text: str,
        context: Optional[str] = None,
        shop_id: Optional[int] = None,
    ) -> CanonicalIntentContract:
        raw_text = text or ""
        if not raw_text.strip():
            return CanonicalIntentContract(
                intent="unknown",
                action="none",
                original_text=raw_text,
                normalized_text="",
                clarification_needed=True,
                clarification_question="Koi instruction nahi mila. Kripya dobara bolein.",
            )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]
        context_parts = []
        if shop_id:
            context_parts.append(f"Shop ID: {shop_id}")
        if context:
            context_parts.append(f"Prior context: {context}")
        
        if context_parts:
            messages.append({"role": "system", "content": "\n".join(context_parts)})

        messages.append({"role": "user", "content": raw_text})

        max_attempts = 3
        last_exc = None
        for attempt in range(max_attempts):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=350,
                )
                raw_content = response.choices[0].message.content or "{}"
                parsed_json = json.loads(raw_content)

                parsed_json["original_text"] = raw_text
                if not parsed_json.get("normalized_text"):
                    parsed_json["normalized_text"] = raw_text

                structured = CanonicalIntentContract.model_validate(parsed_json)
                if structured.intent not in VALID_INTENTS:
                    structured.intent = "unknown"

                if shop_id and "shop_id" not in structured.parameters:
                    structured.parameters["shop_id"] = shop_id

                return structured

            except (json.JSONDecodeError, ValidationError) as parse_exc:
                logger.error("Groq returned unparseable content: %s", parse_exc)
                return CanonicalIntentContract(
                    intent="unknown",
                    action="parse_error",
                    original_text=raw_text,
                    clarification_needed=True,
                    clarification_question="Command samajh nahi aaya, kripya dobara bolein.",
                )
            except Exception as exc:
                last_exc = exc
                err_str = str(exc).lower()
                is_transient = any(w in err_str for w in ["timeout", "timed out", "rate limit", "429", "500", "502", "503", "connection"])
                if is_transient and attempt < max_attempts - 1:
                    import random
                    import time
                    jitter = random.uniform(0.1, 0.3)
                    sleep_time = (0.5 * (2 ** attempt)) + jitter
                    time.sleep(sleep_time)
                    continue
                break

        logger.error("Groq API call error: %s", last_exc)
        return CanonicalIntentContract(
            intent="unknown",
            action="service_unavailable",
            original_text=raw_text,
            clarification_needed=True,
            clarification_question="AI service is momentarily busy. Please repeat your instruction.",
        )

_default_llm_client: Optional[GroqLLMClient] = None

def get_llm_client() -> GroqLLMClient:
    global _default_llm_client
    if _default_llm_client is None:
        _default_llm_client = GroqLLMClient()
    return _default_llm_client
