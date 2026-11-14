import json
import logging
import os
from pathlib import Path
from typing import Any ,Dict ,List ,Optional
from dotenv import load_dotenv
from groq import Groq
from pydantic import BaseModel ,Field ,ValidationError

logger =logging .getLogger (__name__ )

env_path =Path (__file__ ).resolve ().parent .parent .parent /".env"
load_dotenv (dotenv_path =env_path )

DEFAULT_GROQ_MODEL =os .getenv ("GROQ_MODEL","qwen/qwen3.8-27b")

VALID_INTENTS ={
"customer_management",
"credit_transaction",
"product_management",
"inventory_update",
"stock_query",
"history_query",
"unknown",
}

class IntentParameters (BaseModel ):
    customer_name :Optional [str ]=None
    customer_phone :Optional [str ]=None
    product_name :Optional [str ]=None
    price :Optional [float ]=None
    unit :Optional [str ]=None
    quantity :Optional [float ]=None
    quantity_change :Optional [float ]=None
    reason :Optional [str ]=None
    transaction_type :Optional [str ]=None
    amount :Optional [float ]=None
    description :Optional [str ]=None

class StructuredIntent (BaseModel ):
    intent :str
    action :str
    entities :Dict [str ,Any ]=Field (default_factory =dict )
    parameters :Dict [str ,Any ]=Field (default_factory =dict )
    requires_confirmation :bool =False
    clarification_needed :bool =False
    clarification_question :Optional [str ]=None

SYSTEM_PROMPT ="""You are DukaanAI, an intelligent shop assistant for Indian local shopkeepers (Kirana/retail).
Shopkeepers speak in Hindi, Odia, English, or mixed dialects (Hinglish/Odia-English).
Your task is to analyze the shopkeeper's instruction and extract the structured intent, action, and parameters.

The database schema has 7 tables:
1. users (id, name, email)
2. shops (id, owner_id, shop_name)
3. customers (id, shop_id, name, phone)
4. transactions (id, shop_id, customer_id, type: 'credit' or 'payment', amount, description)
5. products (id, shop_id, name, price, unit)
6. inventory (id, shop_id, product_id, quantity, low_stock_limit)
7. inventory_logs (id, shop_id, product_id, quantity_change, reason)

SUPPORTED INTENTS & ACTIONS:
1. "customer_management":
   - "add_customer" (e.g., "Ramesh ko add karo phone 9876543210")
   - "find_customer" (e.g., "Ramesh ka number kya hai")
2. "credit_transaction":
   - "record_credit" (giving goods on credit / udhar diya / baki - type: 'credit')
   - "record_payment" (received payment / jama kiya / paisa mila - type: 'payment')
3. "product_management":
   - "add_product" (e.g., "Naya product Parle-G price 10 packet add karo")
   - "update_product_price" (e.g., "Sugar ka price 45 kardo")
4. "inventory_update":
   - "add_stock" (e.g., "Maggi 50 packet aya hai stock me add karo")
   - "reduce_stock" (e.g., "10 packet damage ho gaya hata do")
   - "set_stock" (e.g., "Aata ka stock 20 kg set karo")
5. "stock_query":
   - "check_stock" (e.g., "Mustard oil kitna bacha hai?")
   - "check_low_stock" (e.g., "Konsa saman khatam hone wala hai?")
6. "history_query":
   - "customer_history" (e.g., "Ramesh ka pichhla hisab dikhao")
   - "daily_summary" (e.g., "Aaj ka total transaction kitna hua?")
7. "unknown":
   - Use if instruction is unrelated or completely unintelligible.

SAFETY & CLARIFICATION RULES:
- If critical details are missing (e.g., "udhar likho" without customer name or amount), set clarification_needed: true, and provide a polite clarification_question in the language the user spoke.
- If an action modifies money or deletes records, set requires_confirmation: true.
- NEVER invent database IDs or SQL statements.
- Return ONLY valid JSON matching this exact structure:
{
  "intent": "<intent_name>",
  "action": "<action_name>",
  "entities": { "customer": "...", "product": "...", ... },
  "parameters": { "customer_name": "...", "amount": 100.0, "quantity": 5.0, ... },
  "requires_confirmation": false,
  "clarification_needed": false,
  "clarification_question": null
}
"""

class GroqLLMClient :

    def __init__ (self ,api_key :Optional [str ]=None ,model :str =DEFAULT_GROQ_MODEL ):
        self .api_key =api_key or os .getenv ("GROQ_API_KEY","")
        self .model =model
        self ._client :Optional [Groq ]=None

    @property
    def client (self )->Groq :
        if self ._client is None :

            current_key =self .api_key or os .getenv ("GROQ_API_KEY","")
            if not current_key or current_key =="your_groq_api_key_here":
                raise ValueError ("GROQ_API_KEY is not configured or contains placeholder.")
            self ._client =Groq (api_key =current_key ,timeout =20.0 )
        return self ._client

    def is_configured (self )->bool :

        key =self .api_key or os .getenv ("GROQ_API_KEY","")
        return bool (key and key !="your_groq_api_key_here")

    def understand_intent (
    self ,
    text :str ,
    context :Optional [str ]=None ,
    shop_id :Optional [int ]=None ,
    )->StructuredIntent :

        if not text or not text .strip ():
            return StructuredIntent (
            intent ="unknown",
            action ="none",
            clarification_needed =True ,
            clarification_question ="Koi instruction nahi mila. Kripya dobara bolein.",
            )

        messages =[
        {"role":"system","content":SYSTEM_PROMPT },
        ]
        context_parts =[]
        if shop_id :
            context_parts .append (f"Shop ID: {shop_id}")
        if context :
            context_parts .append (f"Prior context: {context}")

        if context_parts :
            messages .append ({"role":"system","content":"\n".join (context_parts )})

        messages .append ({"role":"user","content":text })

        try :
            response =self .client .chat .completions .create (
            model =self .model ,
            messages =messages ,
            response_format ={"type":"json_object"},
            temperature =0.1 ,
            )
            raw_content =response .choices [0 ].message .content or "{}"
            parsed_json =json .loads (raw_content )

            structured =StructuredIntent .model_validate (parsed_json )
            if structured .intent not in VALID_INTENTS :
                structured .intent ="unknown"

            if shop_id and "shop_id"not in structured .parameters :
                structured .parameters ["shop_id"]=shop_id

            return structured

        except json .JSONDecodeError as exc :
            logger .error ("Groq returned malformed JSON: %s",exc )
            return StructuredIntent (
            intent ="unknown",
            action ="parse_error",
            clarification_needed =True ,
            clarification_question ="Command samajh nahi aaya, kripya saaf bolein.",
            )
        except ValidationError as exc :
            logger .error ("StructuredIntent schema validation error: %s",exc )
            return StructuredIntent (
            intent ="unknown",
            action ="validation_error",
            clarification_needed =True ,
            clarification_question ="Adhoori jankari mili, kripya pura sentence bolein.",
            )
        except Exception as exc :
            logger .error ("Groq API call error: %s",exc )
            raise RuntimeError (f"Groq LLM service failure: {exc}")from exc

_default_llm_client :Optional [GroqLLMClient ]=None

def get_llm_client ()->GroqLLMClient :

    global _default_llm_client
    if _default_llm_client is None :
        _default_llm_client =GroqLLMClient ()
    return _default_llm_client
