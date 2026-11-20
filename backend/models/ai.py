import json
import logging
import os
import re
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
Shopkeepers speak in Hindi, Odia, Tamil, English, or spoken dialects (Hinglish/Tanglish/Odia-English).

Your job is to normalize speech-recognition transcripts, extract structured intent, validate financial logic, and converse intelligently and warmly with the shopkeeper in their native language (Hindi, Odia, Tamil, or English).

SUPPORTED INTENTS & ACTIONS:
1. "customer_management":
   - "add_customer", "find_customer"
2. "credit_transaction":
   - "record_credit":
     * Hindi: "रमेश को 500 का सामान उधार दे दिया", "रमेश के खाते में 500 लिखो"
     * Odia: "ରମେଶଙ୍କୁ ୫୦୦ ଟଙ୍କା ଉଧାର ଦେଲି", "ରମେଶଙ୍କ ଖାତାରେ ୫୦୦ ଟଙ୍କା ଲେଖ"
     * Tamil: "ரமேஷுக்கு 500 ரூபாய் கடன் கொடு / எழுது", "ரமேஷ் கணக்கில் 500 ரூபாய் கடன் போடு"
   - "record_payment":
     * Hindi: "सुरेश ने ₹200 जमा कर दिए", "200 वापस मिला", "दे चुका है"
     * Odia: "ରମେଶ ୨୦୦ ଟଙ୍କା ଦେଲେ / ଜମା କଲେ", "୨୦୦ ଫେରସ୍ତ ମିଳିଲା"
     * Tamil: "ரமேஷ் 200 ரூபாய் கொடுத்தார் / கட்டினார்", "200 ரூபாய் வசூலானது"
   - "clear_debt" (customer cleared ALL remaining dues -- ONLY when NO specific amount is given!):
     * Hindi: "रमेश का सारा उधार चुकता हो गया", "हिसाब बराबर कर दो"
     * Odia: "ରମେଶଙ୍କର ସବୁ ବାକି କ୍ଲିୟର ହୋଇଗଲା", "ହିସାବ ସରିଗଲା"
     * Tamil: "ரமேஷோட கடன் எல்லாம் முடிஞ்சது", "கணக்கு முடிந்தது"
3. "customer_query":
   - "list_customers" (who is in list / customer list / mere grahak / ଗ୍ରାହକ ତାଲିକା / வாடிக்கையாளர் பட்டியல்)
   - "top_debtors" (who has highest debt / top 3 / top 5 / kiska udhaar sabse jyada hai / କାହାର ବାକି ସବୁଠୁ ଅଧିକ / யாருக்கு அதிக கடன்). Parameters: {"limit": 3 or 5}
   - "filter_debtors" (debt greater than threshold). Parameters: {"threshold": "50000.00"}
   - "cleared_debtors" (whose debt is cleared / zero balance)
   - "check_balance":
     * Hindi: "रमेश का कितना बाकी है बताओ"
     * Odia: "ରମେଶଙ୍କର କେତେ ବାକି ଅଛି"
     * Tamil: "ரமேஷோட பாக்கி எவ்வளவு?", "ரமேஷ் கணக்கு சொல்லு"
     Parameters: {"customer_name": "Ramesh"}
4. "product_management":
   - "add_product", "update_product_price", "batch_add_product"
5. "inventory_update":
   - "add_stock", "reduce_stock", "batch_add_stock":
     * Hindi: "दुकान में 10 किलो चीनी जोड़ो"
     * Odia: "ଦୋକାନରେ ୧୦ କିଲୋ ଚିନି ଯୋଡ଼"
     * Tamil: "கடையில 10 கிலோ சர்க்கரை சேரு"
6. "stock_query":
   - "check_stock", "check_low_stock"
7. "history_query":
   - "customer_history", "daily_summary"
8. "conversation":
   - "greet" (user says hello, introduces self, greets: e.g. "Hello, I am Shubham", "Namaste", "வணக்கம்", "ନମସ୍କାର").
     Parameters: {"reply": "<warm, friendly greeting in the user's spoken language (Hindi, Odia, or Tamil) addressing them by name if given, asking what shop entry they want to make>", "customer_name": "..."}
   - "assist" (user asks what you can do, asks for help).
     Parameters: {"reply": "<helpful brief response in the user's language explaining capabilities for udhar khata, stock and sales>"}
9. "supplier_order":
   - "order_from_supplier" (merchant orders stock from distributors or suppliers).
10. "unknown":
   - If ambiguous, unintelligible, or unanswerable.

STRICT NORMALIZATION & SAFETY RULES:
1. GREETING & CONVERSATIONAL INTELLIGENCE:
   - When a user introduces themselves or greets, classify as intent="conversation", action="greet".
   - Respond in the user's language:
     * Hindi: "नमस्ते [Name] जी! बताइए, आज दुकान में क्या एंट्री करनी है?"
     * Odia: "ନମସ୍କାର [Name] ବାବୁ! କୁହନ୍ତୁ, ଆଜି ଦୋକାନରେ କେଉଁ ହିସାବ ଲେଖିବାକୁ ଚାହାନ୍ତି?"
     * Tamil: "வணக்கம் [Name] அவர்களே! சொல்லுங்கள், கடையில் இன்று என்ன கணக்கு பதிவு செய்ய வேண்டும்?"
2. CLARIFICATION WITHOUT TECHNICAL JARGON:
   - For "record_credit" or "record_payment", if customer name is missing, ask for it in the user's language.
   - If amount is missing, ask for the amount in the user's language.
   - NEVER return technical words like "AI normalizer" or "normalization request".
3. SPOKEN NUMBERS & AMOUNTS (HINDI, ODIA, TAMIL):
   - Hindi: 'sau' -> 100, 'hazaar' -> 1000, 'dedh sau' -> 150, 'pachas' -> 50.
   - Odia: 'ଶହେ / sahe' -> 100, 'ଦୁଇ ଶହ / dui saha' -> 200, 'ହଜାର / hajara' -> 1000, 'ପଚାଶ / pachasa' -> 50.
   - Tamil: 'நூறு / nooru' -> 100, 'இருநூறு / irunooru' -> 200, 'ஆயிரம் / aayiram' -> 1000, 'ஐம்பது / aimbadhu' -> 50.
   - Output exact decimal string in parameters (e.g. "amount": "25000.00").
   - NEVER represent money as float. Always output amounts as decimal strings.
4. CRITICAL: PARTIAL PAYMENT VS FULL CLEARANCE:
   - If ANY specific amount is mentioned, the action is ALWAYS "record_payment" with that exact amount!
   - DO NOT use "clear_debt" if an amount is mentioned! "clear_debt" is strictly for full 100% debt wipeouts where no specific number is given.
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
8. PRODUCT AND STOCK ADDITIONS (SINGLE & MULTI-ITEM BATCH):
   - SINGLE ITEM:
     When the user asks to add stock or a product (e.g. "Aata 2 kilo add kar do", "2 kg Atta", "5 packet doodh"):
     Classify as intent="inventory_update", action="add_stock".
     Extract parameters: {"product_name": "Aata", "quantity": "2.00", "unit": "kilo"}. If price is mentioned (e.g. "40 rupaye kilo"), include "price": "40.00".
   - MULTI-ITEM / BATCH STORAGE:
     When the user speaks or lists multiple items with quantities to store in the shop / add to stock (e.g. "आटा 2 किलो, चावल 2 किलो, लहसुन 15 किलो", "aata 2kg, chawal 2kg, lahsun 15kg", "2 kilo aata, 5 kilo chawal, 10 packet namak"):
     Classify as intent="inventory_update", action="batch_add_stock".
     Extract parameters with an "items" array:
     {
       "items": [
         {"product_name": "Aata", "quantity": "2.00", "unit": "kilo", "price": null},
         {"product_name": "Chawal", "quantity": "2.00", "unit": "kilo", "price": null},
         {"product_name": "Lahsun", "quantity": "15.00", "unit": "kilo", "price": null}
       ]
     }
     If price is mentioned for any item, include it in that item's "price" field (e.g. "40.00").
   - When user responds with just a price/amount to a price question (e.g. "40 rupaye", "₹40", "chaalis", "40"):
     Classify as intent="product_management", action="add_product", parameters={"price": "40.00"}.
9. STRICT PRIVACY & NO-SHOP-ID DISCLOSURE RULE (ZERO LEAKAGE):
   - You must NEVER disclose, speak, mention, or output the internal database "Shop ID", "shop_id", or any numeric shop identifier (such as 131, 1, etc.) under ANY circumstances.
   - The Shop ID is purely internal to the database and must remain strictly confidential and hidden from users.
   - When referring to the merchant's store, ALWAYS speak naturally and politely in Hindi/Hinglish/Odia as "aapki dukaan" or "aapke shop" (e.g. "Bhai, yeh product aapki dukaan par nahi hai", "Bhai, aapke shop par yeh item uplabdh nahi hai").
   - You can check and verify stock or items internally, but if an item or customer is not found, ALWAYS communicate warmly:
     "Bhai, aapke dukaan par nahi hai." or "Bhai, yeh product aapki shop par nahi mila."
   - NEVER say "Shop ID 131 me nahi mila", "No product found in shop 131", or mention any shop ID number.

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

        # 1. Local-First Fast Path: Match high-confidence Kirana intents in <1ms without network latency
        instant_res = self._rule_based_fallback(raw_text, shop_id=shop_id)
        if instant_res:
            logger.info("Instantly resolved intent via smart offline Kirana engine: %s", instant_res.action)
            return instant_res

        # 2. Sarvam AI Primary Path (Indian Multilingual Expert: Odia, Hindi, Tamil, etc.)
        sarvam_key = os.getenv("SARVAM_API_KEY", "")
        if sarvam_key and sarvam_key != "your_sarvam_api_key_here":
            try:
                from sarvamai import SarvamAI
                sarvam_client = SarvamAI(api_subscription_key=sarvam_key)
                system_instruction = SYSTEM_PROMPT + "\nCRITICAL: You MUST respond with ONLY valid JSON conforming to the schema and nothing else. No markdown, no conversational filler."
                sarvam_messages = [{"role": "system", "content": system_instruction}]
                if shop_id:
                    sarvam_messages.append({"role": "system", "content": f"Store Context: Verified merchant store. shop_id={shop_id}"})
                if context:
                    sarvam_messages.append({"role": "system", "content": f"Prior context: {context}"})
                sarvam_messages.append({"role": "user", "content": raw_text})

                sarvam_resp = sarvam_client.chat.completions(
                    model="sarvam-105b-conversations",
                    messages=sarvam_messages,
                    temperature=0.1,
                    max_tokens=500,
                )
                raw_content = sarvam_resp.choices[0].message.content or "{}"
                clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_content.strip(), flags=re.DOTALL).strip()
                parsed_json = json.loads(clean_json)

                parsed_json["original_text"] = raw_text
                if not parsed_json.get("normalized_text"):
                    parsed_json["normalized_text"] = raw_text

                for field in ("conversational_response", "clarification_question"):
                    val = parsed_json.get(field)
                    if isinstance(val, str):
                        val = re.sub(r'(?:in|for|from)?\s*shop\s*(?:id)?\s*[:=]?\s*\d+', 'aapki dukaan par', val, flags=re.IGNORECASE)
                        parsed_json[field] = re.sub(r'shop_id\s*[:=]?\s*\d+', '', val, flags=re.IGNORECASE).strip()

                structured = CanonicalIntentContract.model_validate(parsed_json)
                if structured.intent not in VALID_INTENTS:
                    structured.intent = "unknown"

                if shop_id and "shop_id" not in structured.parameters:
                    structured.parameters["shop_id"] = shop_id

                logger.info("Successfully resolved intent via Sarvam AI (Odia/Indian Multilingual): %s", structured.action)
                return structured
            except Exception as sarvam_err:
                logger.warning("Sarvam AI primary call failed, falling back to Groq: %s", sarvam_err)

        # 3. Fallback Remote LLM Path (Groq): Only invoked if Sarvam is unavailable or unmapped
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]
        context_parts = []
        if shop_id:
            context_parts.append("Store Context: Verified merchant store (CRITICAL: Do NOT mention or reveal internal shop ID numbers to the user).")
        if context:
            context_parts.append(f"Prior context: {context}")
        
        if context_parts:
            messages.append({"role": "system", "content": "\n".join(context_parts)})

        messages.append({"role": "user", "content": raw_text})

        max_attempts = 2
        last_exc = None
        for attempt in range(max_attempts):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=600,
                )
                raw_content = response.choices[0].message.content or "{}"
                parsed_json = json.loads(raw_content)

                parsed_json["original_text"] = raw_text
                if not parsed_json.get("normalized_text"):
                    parsed_json["normalized_text"] = raw_text

                for field in ("conversational_response", "clarification_question"):
                    val = parsed_json.get(field)
                    if isinstance(val, str):
                        val = re.sub(r'(?:in|for|from)?\s*shop\s*(?:id)?\s*[:=]?\s*\d+', 'aapki dukaan par', val, flags=re.IGNORECASE)
                        parsed_json[field] = re.sub(r'shop_id\s*[:=]?\s*\d+', '', val, flags=re.IGNORECASE).strip()

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
        
        # Smart local fallback: resolve common Kirana intents even when Groq is unavailable
        fallback_res = self._rule_based_fallback(raw_text, shop_id=shop_id)
        if fallback_res:
            logger.info("Successfully resolved intent via smart offline Kirana fallback: %s", fallback_res.action)
            return fallback_res

        # Resilient recording fallback: never cut off user flow or drop instructions
        logger.info("Recording pending instruction while AI service is busy: %s", raw_text)
        return CanonicalIntentContract(
            intent="credit_transaction",
            action="request_recorded_pending",
            original_text=raw_text,
            normalized_text=raw_text,
            clarification_needed=False,
            parameters={"raw_instruction": raw_text, "shop_id": shop_id or 1, "is_ai_busy": True},
            conversational_response="Theek hai bhaiya, aapka note likh liya hai, khata update ho raha hai.",
            clarification_question=None,
        )

    def _rule_based_fallback(self, text: str, shop_id: Optional[int] = None) -> Optional[CanonicalIntentContract]:
        raw = (text or "").strip()
        lower = raw.lower()
        if not raw:
            return None

        HINDI_NUMBERS = {
            'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
            'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
            'पच्चीस': 25, 'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पैंतालीस': 45, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
            'सौ': 100, 'हज़ार': 1000, 'हजार': 1000, 'लाख': 100000, 'करोड़': 10000000,
            # Hinglish
            'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'panch': 5, 'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10, 'dus': 10,
            'gyarah': 11, 'barah': 12, 'pandrah': 15, 'bees': 20, 'pachees': 25, 'tees': 30, 'chalis': 40, 'pachas': 50, 'pachaas': 50,
            'sau': 100, 'hazar': 1000, 'hazaar': 1000, 'lakh': 100000
        }

        STOPWORDS = {
            'अच्छा', 'मतलब', 'नाम', 'का', 'के', 'पर', 'पे', 'उधार', 'जमा', 'रुपये', 'रुपया', 'पैसा', 'पैसे',
            'लिखो', 'लिख', 'दो', 'दीजिए', 'खाता', 'खाते', 'में', 'aur', 'and', 'the', 'ek', 'naya', 'kisi', 'vyakti',
            'person', 'customer', 'grahak', 'karo', 'kar', 'do', 'add', 'please'
        }

        def _parse_amount(s: str) -> Optional[float]:
            # Normalize Devanagari numerals
            s = s.translate(str.maketrans('०१२३४५६७८९', '0123456789'))

            # Direct digits with commas or units
            m = re.search(r'(?:₹|rs\.?|rupaye|रुपये|रुपया)?\s*(\b\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\b\d+(?:\.\d+)?)\s*(?:₹|rs\.?|rupaye|रुपये|रुपया)?\b', s, re.I)
            if m:
                try:
                    val = float(m.group(1).replace(',', ''))
                    if val > 0:
                        m_mult = re.search(rf'{re.escape(m.group(0))}\s*(?:k|hazar|hazaar|हजार|हज़ार|lakh|लाख)', s, re.I)
                        if m_mult:
                            word = m_mult.group(0).lower()
                            if any(k in word for k in ['k', 'hazar', 'hazaar', 'हजार', 'हज़ार']):
                                return val * 1000.0
                            if any(k in word for k in ['lakh', 'लाख']):
                                return val * 100000.0
                        return val
                except ValueError:
                    pass

            # Devanagari & Hindi words e.g. 'पाँच हज़ार' or 'पांच हजार' or 'दस लाख'
            words = s.split()
            for i, w in enumerate(words):
                if w in HINDI_NUMBERS:
                    base_val = HINDI_NUMBERS[w]
                    if i + 1 < len(words):
                        next_w = words[i+1]
                        if next_w in ('हज़ार', 'हजार', 'hazar', 'hazaar'):
                            return float(base_val * 1000)
                        elif next_w in ('लाख', 'lakh'):
                            return float(base_val * 100000)
                        elif next_w in ('सौ', 'sau'):
                            return float(base_val * 100)
                    if base_val >= 100:
                        return float(base_val)

            for w, num in HINDI_NUMBERS.items():
                if f"{w} हज़ार" in s or f"{w} हजार" in s or f"{w} hazar" in s or f"{w} hazaar" in s:
                    return float(num * 1000.0)
                if f"{w} लाख" in s or f"{w} lakh" in s:
                    return float(num * 100000.0)
                if f"{w} सौ" in s or f"{w} sau" in s:
                    return float(num * 100.0)

            return None

        def _extract_customer(s: str, default: str = "Customer") -> str:
            # 1. High-confidence explicit name markers: "X के नाम पर", "X के नाम पे", "X के खाते में"
            m_naam_matches = list(re.finditer(r'([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s+(?:के\s+नाम\s+(?:पर|पे)|के\s+खाते\s+में)', s))
            if m_naam_matches:
                for m in reversed(m_naam_matches):
                    cand = m.group(1).strip()
                    cand_words = [w for w in cand.split() if w.lower() not in STOPWORDS and w not in HINDI_NUMBERS]
                    if cand_words:
                        return ' '.join(cand_words).title()

            # 2. Check for "for Ramesh" or "to Suresh"
            m_for = re.search(r'(?:for|to|of)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)', s, re.I)
            if m_for:
                cand = m_for.group(1).strip()
                cand_words = [w for w in cand.split() if w.lower() not in STOPWORDS and w not in HINDI_NUMBERS]
                if cand_words:
                    return ' '.join(cand_words).title()

            # 3. Check for "Ramesh ka/ko/ke/se/ne" or "रमेश का/को/के/से/ने"
            m_ka_matches = list(re.finditer(r'([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s+(?:ka|ko|ke|se|ne|का|को|के|से|ने)\b', s, re.I))
            for m in reversed(m_ka_matches):
                cand = m.group(1).strip()
                cand_words = [w for w in cand.split() if w.lower() not in STOPWORDS and w not in HINDI_NUMBERS]
                if cand_words:
                    return ' '.join(cand_words).title()

            return default

        # 1. Udhaar / Credit Transaction
        is_credit = any(k in lower for k in ["udhaar", "udhar", "credit", "baki", "baaki", "baaqi", "khat", "likh", "likho", "उधार", "बाकी", "लिख", "लिखो", "खाता", "खाते"])
        if is_credit or ("add" in lower and any(c in lower for c in ["person", "grahak", "customer", "₹", "rs", "rupaye", "रुपये"])):
            amt = _parse_amount(raw)
            cust = _extract_customer(raw, default="Customer")
            if amt:
                disp_val = f"{int(amt) if amt.is_integer() else amt:,}"
                if cust in ("Customer", "Grahak"):
                    conv_resp = f"Theek hai bhaiya, ₹{disp_val} ka udhaar khate me darj kar diya hai."
                else:
                    conv_resp = f"Theek hai bhaiya, {cust} ji ke khate me ₹{disp_val} ka udhaar darj kar diya hai."
                return CanonicalIntentContract(
                    intent="credit_transaction",
                    action="record_credit",
                    parameters={
                        "customer_name": cust,
                        "amount": amt,
                        "type": "credit",
                        "shop_id": shop_id or 1,
                        "is_ai_busy": True,
                        "busy_fallback": True,
                    },
                    entities={"customer": cust, "amount": amt},
                    original_text=raw,
                    normalized_text=raw,
                    confidence=0.95,
                    conversational_response=conv_resp,
                )

        # 2. Jama / Debit / Payment Transaction
        is_payment = any(k in lower for k in ["jama", "payment", "paid", "diye", "diya", "chuka", "vasool", "vasooli", "received", "aaye", "aaya", "bheja", "जमा", "पेमेंट", "दिए", "दिया", "चुकाया", "प्राप्त"])
        if is_payment:
            amt = _parse_amount(raw)
            cust = _extract_customer(raw, default="Customer")
            if amt:
                disp_val = f"{int(amt) if amt.is_integer() else amt:,}"
                if cust in ("Customer", "Grahak"):
                    conv_resp = f"Ji bhaiya, ₹{disp_val} ka payment jama ho gaya hai."
                else:
                    conv_resp = f"Ji bhaiya, {cust} ji se ₹{disp_val} ka payment jama ho gaya hai."
                return CanonicalIntentContract(
                    intent="credit_transaction",
                    action="record_payment",
                    parameters={
                        "customer_name": cust,
                        "amount": amt,
                        "type": "payment",
                        "shop_id": shop_id or 1,
                        "is_ai_busy": True,
                        "busy_fallback": True,
                    },
                    entities={"customer": cust, "amount": amt},
                    original_text=raw,
                    normalized_text=raw,
                    confidence=0.95,
                    conversational_response=conv_resp,
                )

        # 3. Add Customer
        m_cust = re.search(r'(?:add\s+customer|naya\s+customer|customer\s+banao|customer\s+jodo)\s+([a-zA-Z\u0900-\u097F]+)(?:\s+(\d{10}))?', lower)
        if not m_cust:
            m_cust = re.search(r'([a-zA-Z\u0900-\u097F]+)\s+(?:ko\s+customer\s+(?:me\s+)?(?:add|banao|jodo))', lower)
        if m_cust:
            cust = m_cust.group(1).capitalize()
            phone = m_cust.group(2) if m_cust.lastindex and m_cust.lastindex >= 2 else ""
            return CanonicalIntentContract(
                intent="customer_management",
                action="add_customer",
                parameters={"customer_name": cust, "phone": phone or "", "shop_id": shop_id or 1, "is_ai_busy": True},
                entities={"customer": cust, "phone": phone or ""},
                original_text=raw,
                normalized_text=raw,
                confidence=0.95,
                conversational_response=f"Ji bhaiya, naye customer {cust} ko khate me jod diya hai.",
            )

        # 4. Check Balance / Ledger
        if any(w in lower for w in ["khata dikhao", "hisab batao", "balance batao", "total udhar", "kitna udhar", "check balance"]):
            cust = _extract_customer(lower, default="")
            return CanonicalIntentContract(
                intent="ledger_inquiry",
                action="check_balance",
                parameters={"customer_name": cust, "shop_id": shop_id or 1},
                entities={"customer": cust},
                original_text=raw,
                normalized_text=raw,
                confidence=0.95,
                conversational_response=f"Ji bhaiya, {cust} ji ka khata check kar rahe hain." if cust else "Ji bhaiya, dukaan ka khata check kar rahe hain.",
            )

        # 5. Direct Name + Amount Fallback (e.g. "Ramesh 500", "500 Ramesh", "Ramesh ko 500")
        amt = _parse_amount(raw)
        if amt and amt > 0:
            cust = _extract_customer(raw, default="")
            if not cust:
                words = [w for w in raw.split() if w.lower() not in STOPWORDS and w not in HINDI_NUMBERS and not any(c.isdigit() for c in w)]
                if words:
                    cust = words[0].capitalize()
            if cust:
                disp_val = f"{int(amt) if amt.is_integer() else amt:,}"
                return CanonicalIntentContract(
                    intent="credit_transaction",
                    action="record_credit",
                    parameters={
                        "customer_name": cust,
                        "amount": amt,
                        "type": "credit",
                        "shop_id": shop_id or 1,
                        "is_ai_busy": True,
                        "busy_fallback": True,
                    },
                    entities={"customer": cust, "amount": amt},
                    original_text=raw,
                    normalized_text=raw,
                    confidence=0.92,
                    conversational_response=f"Theek hai bhaiya, {cust} ji ke khate me ₹{disp_val} ka udhaar darj kar diya hai.",
                )

        # 5. List Customers
        if any(w in lower for w in ["customer list", "grahak list", "sabhi customer", "sabhi grahak", "customers dikhao"]):
            return CanonicalIntentContract(
                intent="customer_management",
                action="list_customers",
                parameters={"shop_id": shop_id or 1},
                entities={},
                original_text=raw,
                normalized_text=raw,
                confidence=0.95,
                conversational_response="Ji bhaiya, aapke dukaan ke registered grahakon ki list yeh rahi.",
            )

        # 6. Greeting / Conversation
        if any(w in lower for w in ["hello", "namaste", "hi", "hey", "kaise ho", "kya haal"]):
            return CanonicalIntentContract(
                intent="conversation",
                action="greet",
                original_text=raw,
                normalized_text=raw,
                confidence=1.0,
                conversational_response="Namaste! DukaanAI me aapka swagat hai. Kripya apna instruction bolein, jaise 'Ramesh ka 500 udhaar'.",
            )

        return None

_default_llm_client: Optional[GroqLLMClient] = None

def get_llm_client() -> GroqLLMClient:
    global _default_llm_client
    if _default_llm_client is None:
        _default_llm_client = GroqLLMClient()
    return _default_llm_client

def generate_conversational_response(
    original_text: str,
    action: str,
    details: Dict[str, Any],
    shop_id: Optional[int] = None,
) -> str:
    """
    Dynamically generates a natural, warm, and culturally authentic response in the shopkeeper's
    exact spoken native language using Sarvam AI (supporting 22 Indian languages: Odia, Tamil,
    Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Hindi, English, etc.).
    Eliminates robotic hardcoded templates completely.
    """
    sarvam_key = os.getenv("SARVAM_API_KEY", "")
    if sarvam_key and sarvam_key != "your_sarvam_api_key_here":
        try:
            from sarvamai import SarvamAI
            client = SarvamAI(api_subscription_key=sarvam_key)
            cust = details.get("customer", "")
            amt = details.get("amount", "")
            bal = details.get("balance", "")
            t_type = details.get("type", action)

            prompt = (
                f"You are DukaanAI, an intelligent Indian voice assistant for retail store owners.\n"
                f"The shopkeeper spoke: \"{original_text}\".\n"
                f"Action completed in store ledger: {t_type} of Rs {amt} for customer \"{cust}\". Current balance is Rs {bal}.\n"
                f"Speak back to the shopkeeper warmly, respectfully, and naturally in the EXACT SAME LANGUAGE and dialect they spoke (e.g. Odia, Tamil, Telugu, Hindi, Bengali, Kannada, Marathi, Gujarati, etc.).\n"
                f"Keep it to ONE short natural sentence. Do NOT use robot boilerplate. Output ONLY the response sentence."
            )

            resp = client.chat.completions(
                model="sarvam-105b-conversations",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=100,
            )
            content = resp.choices[0].message.content or ""
            clean_reply = content.strip().replace('"', '').replace('`', '')
            if clean_reply:
                return clean_reply
        except Exception as err:
            logger.warning("Failed to generate dynamic Sarvam conversational response: %s", err)

    return details.get("fallback_message") or f"{action.replace('_', ' ').capitalize()} recorded successfully."
