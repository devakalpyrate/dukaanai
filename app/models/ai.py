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
    "product_management",
    "inventory_update",
    "stock_query",
    "history_query",
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

SYSTEM_PROMPT = """You are DukaanAI, an expert Indian Kirana shop assistant.
Shopkeepers speak in Hindi, Odia, English, or spoken dialects (Hinglish/Odia-English).

Your job is to normalize speech-recognition transcripts, extract structured intent, and strictly validate financial logic.

SUPPORTED INTENTS & ACTIONS:
1. "customer_management":
   - "add_customer", "find_customer"
2. "credit_transaction":
   - "record_credit" (giving goods on credit / udhar diya / baki likho)
   - "record_payment" (received payment / jama kiya / wapas mila)
3. "product_management":
   - "add_product", "update_product_price"
4. "inventory_update":
   - "add_stock", "reduce_stock"
5. "stock_query":
   - "check_stock", "check_low_stock"
6. "history_query":
   - "customer_history", "daily_summary"
7. "unknown":
   - If ambiguous, unintelligible, or unanswerable.

STRICT NORMALIZATION & SAFETY RULES:
1. SPOKEN NUMBERS & AMOUNTS:
   - Convert spoken numbers in Hindi/Odia/English (e.g., 'sau' -> 100, 'dedh sau' -> 150, 'panchas' -> 50, 'pachaas hazaar' -> 50000) to exact decimal string in parameters (e.g. "amount": "150.00").
   - NEVER represent money as float. Always output amounts as decimal strings.
2. CRITICAL FINANCIAL CONTRADICTIONS:
   - NEVER silently convert a negative number into a positive number.
   - If user says 'minus 50 rupaye diye' or 'negative udhar', mark:
     "clarification_needed": true,
     "clarification_question": "Negative amount contradiction: Did the customer pay or take credit? Please clarify."
3. SPEECH CORRECTIONS:
   - If a speech recognition typo is normalized (e.g. 'ramesh kumr' -> 'Ramesh Kumar', 'chini' -> 'Sugar'), state it in "normalization" { "corrected": true, "reason": "..." }.
   - If the correction changes financial meaning, mark "requires_confirmation": true.
4. HALLUCINATION PREVENTION:
   - NEVER invent customer names, amounts, or items.
   - If information is missing (e.g. 'udhar likh lo' without customer name or amount), mark "clarification_needed": true and ask politely.
5. JSON CONTRACT:
Return ONLY a valid JSON object matching this schema:
{
  "intent": "<intent>",
  "action": "<action>",
  "entities": { "customer": "...", "product": "..." },
  "parameters": { "customer_name": "...", "amount": "100.00", "quantity": "5.00" },
  "original_text": "<verbatim raw input>",
  "normalized_text": "<cleaned normalized sentence>",
  "normalization": { "has_corrections": false, "reason": null },
  "confidence": 0.95,
  "requires_confirmation": false,
  "clarification_needed": false,
  "clarification_question": null
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

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,
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

        except json.JSONDecodeError as exc:
            logger.error("Groq returned malformed JSON: %s", exc)
            return CanonicalIntentContract(
                intent="unknown",
                action="parse_error",
                original_text=raw_text,
                clarification_needed=True,
                clarification_question="Command samajh nahi aaya, kripya saaf bolein.",
            )
        except ValidationError as exc:
            logger.error("CanonicalIntentContract schema validation error: %s", exc)
            return CanonicalIntentContract(
                intent="unknown",
                action="validation_error",
                original_text=raw_text,
                clarification_needed=True,
                clarification_question="Adhoori jankari mili, kripya pura sentence bolein.",
            )
        except Exception as exc:
            logger.error("Groq API call error: %s", exc)
            raise RuntimeError(f"Groq LLM service failure: {exc}") from exc

_default_llm_client: Optional[GroqLLMClient] = None

def get_llm_client() -> GroqLLMClient:
    global _default_llm_client
    if _default_llm_client is None:
        _default_llm_client = GroqLLMClient()
    return _default_llm_client
