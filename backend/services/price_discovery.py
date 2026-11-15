import json
import logging
import os
import re
from typing import Any, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("dukaanai.price_discovery")

FMCG_BENCHMARK_CATALOG: Dict[str, Dict[str, Any]] = {
    "aata": {"name": "Aata (Wheat Flour)", "price": 42.0, "unit": "kg"},
    "atta": {"name": "Aata (Wheat Flour)", "price": 42.0, "unit": "kg"},
    "wheat flour": {"name": "Aata (Wheat Flour)", "price": 42.0, "unit": "kg"},
    "fortune atta": {"name": "Fortune Chakki Atta", "price": 44.0, "unit": "kg"},
    "aashirvaad atta": {"name": "Aashirvaad Shudh Chakki Atta", "price": 48.0, "unit": "kg"},
    "doodh": {"name": "Amul Taaza Milk", "price": 27.0, "unit": "packet"},
    "dudh": {"name": "Amul Taaza Milk", "price": 27.0, "unit": "packet"},
    "milk": {"name": "Milk", "price": 27.0, "unit": "packet"},
    "amul milk": {"name": "Amul Taaza Milk", "price": 27.0, "unit": "packet"},
    "amul gold": {"name": "Amul Gold Milk", "price": 33.0, "unit": "packet"},
    "cheeni": {"name": "Sugar (Cheeni)", "price": 44.0, "unit": "kg"},
    "chini": {"name": "Sugar (Cheeni)", "price": 44.0, "unit": "kg"},
    "sugar": {"name": "Sugar", "price": 44.0, "unit": "kg"},
    "chai patti": {"name": "Tea Leaves (Chai)", "price": 90.0, "unit": "packet"},
    "chai": {"name": "Tea Leaves (Chai)", "price": 90.0, "unit": "packet"},
    "tea": {"name": "Tea Leaves (Chai)", "price": 90.0, "unit": "packet"},
    "taj mahal tea": {"name": "Brooke Bond Taj Mahal Tea 250g", "price": 140.0, "unit": "packet"},
    "red label": {"name": "Brooke Bond Red Label Tea 250g", "price": 120.0, "unit": "packet"},
    "chawal": {"name": "Rice (Chawal)", "price": 52.0, "unit": "kg"},
    "rice": {"name": "Rice (Chawal)", "price": 52.0, "unit": "kg"},
    "basmati rice": {"name": "Basmati Rice", "price": 95.0, "unit": "kg"},
    "namak": {"name": "Tata Salt", "price": 28.0, "unit": "kg"},
    "salt": {"name": "Tata Salt", "price": 28.0, "unit": "kg"},
    "tata salt": {"name": "Tata Salt 1kg", "price": 28.0, "unit": "kg"},
    "tel": {"name": "Cooking Oil", "price": 140.0, "unit": "L"},
    "oil": {"name": "Cooking Oil", "price": 140.0, "unit": "L"},
    "sarson tel": {"name": "Mustard Oil (Sarson Tel)", "price": 155.0, "unit": "L"},
    "mustard oil": {"name": "Mustard Oil", "price": 155.0, "unit": "L"},
    "refined oil": {"name": "Fortune Refined Oil", "price": 135.0, "unit": "L"},
    "dal": {"name": "Toor Dal (Arhar)", "price": 165.0, "unit": "kg"},
    "toor dal": {"name": "Toor Dal", "price": 165.0, "unit": "kg"},
    "arhar dal": {"name": "Arhar Dal", "price": 165.0, "unit": "kg"},
    "moong dal": {"name": "Moong Dal", "price": 125.0, "unit": "kg"},
    "chana dal": {"name": "Chana Dal", "price": 95.0, "unit": "kg"},
    "besan": {"name": "Besan (Gram Flour)", "price": 90.0, "unit": "kg"},
    "maggi": {"name": "Maggi 2-Minute Noodles 70g", "price": 14.0, "unit": "packet"},
    "maggi noodles": {"name": "Maggi 2-Minute Noodles 70g", "price": 14.0, "unit": "packet"},
    "noodles": {"name": "Noodles Packet", "price": 14.0, "unit": "packet"},
    "biscuit": {"name": "Parle-G Glucose Biscuits", "price": 10.0, "unit": "packet"},
    "parle g": {"name": "Parle-G Glucose Biscuits", "price": 10.0, "unit": "packet"},
    "parle-g": {"name": "Parle-G Glucose Biscuits", "price": 10.0, "unit": "packet"},
    "good day": {"name": "Britannia Good Day Biscuits", "price": 20.0, "unit": "packet"},
    "bread": {"name": "Fresh White Bread", "price": 35.0, "unit": "packet"},
    "dahi": {"name": "Curd / Dahi 400g", "price": 35.0, "unit": "packet"},
    "curd": {"name": "Curd / Dahi 400g", "price": 35.0, "unit": "packet"},
    "paneer": {"name": "Fresh Dairy Paneer", "price": 380.0, "unit": "kg"},
    "ghee": {"name": "Amul Pure Ghee 1L", "price": 630.0, "unit": "kg"},
    "amul ghee": {"name": "Amul Pure Ghee 1L", "price": 630.0, "unit": "kg"},
    "anda": {"name": "Farm Eggs", "price": 7.0, "unit": "piece"},
    "egg": {"name": "Farm Eggs", "price": 7.0, "unit": "piece"},
    "eggs": {"name": "Farm Eggs", "price": 7.0, "unit": "piece"},
    "haldi": {"name": "Turmeric Powder (Haldi) 100g", "price": 35.0, "unit": "packet"},
    "mirchi": {"name": "Red Chilli Powder 100g", "price": 45.0, "unit": "packet"},
    "dhaniya": {"name": "Coriander Powder 100g", "price": 35.0, "unit": "packet"},
    "sabun": {"name": "Bath Soap", "price": 35.0, "unit": "piece"},
    "soap": {"name": "Bath Soap", "price": 35.0, "unit": "piece"},
    "surf": {"name": "Detergent Powder", "price": 110.0, "unit": "kg"},
    "detergent": {"name": "Detergent Powder", "price": 110.0, "unit": "kg"},
}

def lookup_benchmark_price(product_name: str, requested_unit: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not product_name:
        return None
    cleaned = product_name.strip().lower()
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", cleaned)
    cleaned = " ".join(cleaned.split())

    if cleaned in FMCG_BENCHMARK_CATALOG:
        match = FMCG_BENCHMARK_CATALOG[cleaned]
        return {
            "price": float(match["price"]),
            "unit": requested_unit or match["unit"],
            "source": "benchmark_catalog",
            "standard_name": match["name"],
        }

    for key, val in FMCG_BENCHMARK_CATALOG.items():
        if key in cleaned or cleaned in key:
            return {
                "price": float(val["price"]),
                "unit": requested_unit or val["unit"],
                "source": "benchmark_catalog",
                "standard_name": val["name"],
            }

    tokens = cleaned.split()
    for token in tokens:
        if len(token) >= 3 and token in FMCG_BENCHMARK_CATALOG:
            val = FMCG_BENCHMARK_CATALOG[token]
            return {
                "price": float(val["price"]),
                "unit": requested_unit or val["unit"],
                "source": "benchmark_catalog",
                "standard_name": val["name"],
            }
    return None

def estimate_market_price_with_llm(product_name: str, requested_unit: Optional[str] = None) -> Dict[str, Any]:
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    default_unit = requested_unit or "kg"
    if not api_key:
        return {
            "price": 50.0,
            "unit": default_unit,
            "source": "default_fallback",
            "standard_name": product_name.title(),
        }

    try:
        client = Groq(api_key=api_key)
        prompt = f"""You are a market pricing engine for Indian retail Kirana stores.
Provide the estimated retail selling price in INR (Indian Rupees) for the following product in India.
Product: "{product_name}"
Requested Unit: "{default_unit}"

Respond ONLY with a valid JSON object with keys:
"price": (number, retail price in INR),
"unit": (string, standard unit e.g. "kg", "packet", "piece", "L"),
"confidence": (number between 0 and 1)

Do not include any markdown, explanation or commentary."""
        completion = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        data = json.loads(completion.choices[0].message.content)
        parsed_price = float(data.get("price") or 50.0)
        parsed_unit = data.get("unit") or default_unit
        return {
            "price": round(parsed_price, 2),
            "unit": parsed_unit,
            "source": "ai_market_estimate",
            "standard_name": product_name.title(),
        }
    except Exception as exc:
        logger.warning("LLM pricing estimation failed for '%s': %s", product_name, exc)
        return {
            "price": 50.0,
            "unit": default_unit,
            "source": "default_fallback",
            "standard_name": product_name.title(),
        }

def fetch_serpapi_price(product_name: str, requested_unit: Optional[str] = None) -> Optional[Dict[str, Any]]:
    serpapi_key = os.getenv("SERPAPI_API_KEY")
    if not serpapi_key:
        return None
    try:
        import urllib.request
        from urllib.parse import urlencode
        query_params = {
            "engine": "google_shopping",
            "q": f"{product_name} price INR",
            "gl": "in",
            "hl": "en",
            "api_key": serpapi_key,
        }
        url = f"https://serpapi.com/search.json?{urlencode(query_params)}"
        req = urllib.request.Request(url, headers={"User-Agent": "DukaanAI/1.0"})
        with urllib.request.urlopen(req, timeout=4.0) as response:
            if response.status == 200:
                payload = json.loads(response.read().decode("utf-8"))
                shopping_results = payload.get("shopping_results", [])
                for item in shopping_results:
                    raw_price = item.get("extracted_price")
                    if raw_price and float(raw_price) > 0:
                        return {
                            "price": round(float(raw_price), 2),
                            "unit": requested_unit or "unit",
                            "source": "serpapi_google_shopping",
                            "standard_name": item.get("title") or product_name.title(),
                        }
    except Exception as exc:
        logger.warning("SerpApi price fetch failed for '%s': %s", product_name, exc)
    return None

def get_market_price(product_name: str, requested_unit: Optional[str] = None) -> Dict[str, Any]:
    from backend.queries import global_prices as global_price_queries
    try:
        db_price = global_price_queries.get_global_price(product_name)
        if db_price:
            return {
                "price": float(db_price["price"]),
                "unit": requested_unit or db_price["unit"],
                "source": db_price["source"],
                "standard_name": db_price["display_name"],
            }
    except Exception:
        pass

    benchmark = lookup_benchmark_price(product_name, requested_unit)
    if benchmark:
        try:
            global_price_queries.save_global_price(
                item_key=product_name,
                display_name=benchmark["standard_name"],
                price=benchmark["price"],
                unit=benchmark["unit"],
                source="benchmark_catalog",
            )
        except Exception:
            pass
        return benchmark

    live_web_price = fetch_serpapi_price(product_name, requested_unit)
    if live_web_price:
        try:
            global_price_queries.save_global_price(
                item_key=product_name,
                display_name=live_web_price["standard_name"],
                price=live_web_price["price"],
                unit=live_web_price["unit"],
                source="serpapi_google_shopping",
            )
        except Exception:
            pass
        return live_web_price

    llm_est = estimate_market_price_with_llm(product_name, requested_unit)
    try:
        global_price_queries.save_global_price(
            item_key=product_name,
            display_name=llm_est["standard_name"],
            price=llm_est["price"],
            unit=llm_est["unit"],
            source=llm_est["source"],
        )
    except Exception:
        pass
    return llm_est
