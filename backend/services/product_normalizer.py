import re
from typing import Any, Dict, List, Optional, Tuple
from decimal import Decimal

CANONICAL_UNITS: Dict[str, str] = {
    "kilo": "kg",
    "kilos": "kg",
    "kg": "kg",
    "kgs": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "किलो": "kg",
    "କିଲୋ": "kg",
    "கிலோ": "kg",
    "gm": "gm",
    "gms": "gm",
    "g": "gm",
    "gram": "gm",
    "grams": "gm",
    "ग्राम": "gm",
    "l": "liter",
    "lt": "liter",
    "ltr": "liter",
    "litre": "liter",
    "litres": "liter",
    "liter": "liter",
    "liters": "liter",
    "लीटर": "liter",
    "packet": "packet",
    "packets": "packet",
    "pkt": "packet",
    "pkts": "packet",
    "pack": "packet",
    "पैकेट": "packet",
    "piece": "piece",
    "pieces": "piece",
    "pc": "piece",
    "pcs": "piece",
    "पीस": "piece",
    "नग": "piece",
    "box": "box",
    "boxes": "box",
    "डिब्बा": "box",
    "bottle": "bottle",
    "bottles": "bottle",
    "बोतल": "bottle",
}

CANONICAL_COMMODITY_MAP: Dict[str, str] = {
    "chawal": "chawal",
    "chaawal": "chawal",
    "chawl": "chawal",
    "rice": "chawal",
    "चावल": "chawal",
    "ଚାଉଳ": "chawal",
    "அரிசி": "chawal",
    "arisi": "chawal",
    "chaula": "chawal",
    "basmati": "chawal",
    "basmati rice": "chawal",

    "atta": "atta",
    "aata": "atta",
    "aattha": "atta",
    "wheat": "atta",
    "wheat flour": "atta",
    "flour": "atta",
    "आटा": "atta",
    "ଆଟା": "atta",
    "கோதுமை மாவு": "atta",
    "godhumai": "atta",

    "dal": "dal",
    "daal": "dal",
    "dall": "dal",
    "lentil": "dal",
    "lentils": "dal",
    "दाल": "dal",
    "ଡାଲି": "dal",
    "பருப்பு": "dal",
    "paruppu": "dal",

    "toor dal": "toor_dal",
    "arhar dal": "toor_dal",
    "arhar": "toor_dal",
    "toor": "toor_dal",
    "तूर दाल": "toor_dal",
    "अरहर दाल": "toor_dal",
    "ହରଡ ଡାଲି": "toor_dal",

    "moong dal": "moong_dal",
    "moong": "moong_dal",
    "मूंग दाल": "moong_dal",
    "ମୁଗ ଡାଲି": "moong_dal",

    "chana dal": "chana_dal",
    "chana": "chana_dal",
    "चना दाल": "chana_dal",
    "ଚଣା ଡାଲି": "chana_dal",

    "sugar": "cheeni",
    "cheeni": "cheeni",
    "chini": "cheeni",
    "shakar": "cheeni",
    "shakkar": "cheeni",
    "चीनी": "cheeni",
    "शक्कर": "cheeni",
    "ଚିନି": "cheeni",
    "சர்க்கரை": "cheeni",
    "sakkarai": "cheeni",

    "salt": "namak",
    "namak": "namak",
    "noon": "namak",
    "नमक": "namak",
    "ଲୁଣ": "namak",
    "உப்பு": "namak",
    "uppu": "namak",
    "tata salt": "namak",

    "tel": "oil",
    "oil": "oil",
    "taila": "oil",
    "cooking oil": "oil",
    "तेल": "oil",
    "ତେଲ": "oil",
    "எண்ணெய்": "oil",
    "ennai": "oil",

    "sarson tel": "mustard_oil",
    "mustard oil": "mustard_oil",
    "सरसों तेल": "mustard_oil",
    "ସୋରିଷ ତେଲ": "mustard_oil",

    "refined oil": "refined_oil",
    "fortune oil": "refined_oil",
    "रिफाइंड तेल": "refined_oil",

    "doodh": "milk",
    "dudh": "milk",
    "milk": "milk",
    "dudha": "milk",
    "दूध": "milk",
    "କ୍ଷୀର": "milk",
    "பால்": "milk",
    "paal": "milk",
    "amul milk": "milk",

    "chai": "tea",
    "chai patti": "tea",
    "tea": "tea",
    "chaya": "tea",
    "चाय": "tea",
    "चाय पत्ती": "tea",
    "ଚା": "tea",
    "தேநீர்": "tea",

    "ghee": "ghee",
    "ghi": "ghee",
    "घी": "ghee",
    "ଘିଅ": "ghee",
    "நெய்": "ghee",

    "paneer": "paneer",
    "panir": "paneer",
    "पनीर": "paneer",
    "ପନୀର": "paneer",
    "பன்னீர்": "paneer",

    "dahi": "dahi",
    "curd": "dahi",
    "दही": "dahi",
    "ଦହି": "dahi",
    "தயிர்": "dahi",

    "besan": "besan",
    "gram flour": "besan",
    "बेसन": "besan",
    "ବେସନ": "besan",

    "anda": "egg",
    "ande": "egg",
    "egg": "egg",
    "eggs": "egg",
    "अंडा": "egg",
    "अंडे": "egg",
    "ଅଣ୍ଡା": "egg",
    "முட்டை": "egg",

    "pyaz": "pyaz",
    "pyaaz": "pyaz",
    "kanda": "pyaz",
    "onion": "pyaz",
    "onions": "pyaz",
    "प्याज": "pyaz",
    "प्याज़": "pyaz",
    "ପିଆଜ": "pyaz",
    "வெங்காயம்": "pyaz",

    "aloo": "aloo",
    "alu": "aloo",
    "batata": "aloo",
    "potato": "aloo",
    "potatoes": "aloo",
    "आलू": "aloo",
    "ଆଳୁ": "aloo",
    "உருளைக்கிழங்கு": "aloo",

    "tamatar": "tamatar",
    "tomato": "tamatar",
    "tomatoes": "tamatar",
    "टमाटर": "tamatar",
    "ବିଲାତି": "tamatar",
    "தக்காளி": "tamatar",

    "lahsun": "lahsun",
    "lasun": "lahsun",
    "garlic": "lahsun",
    "लहसुन": "lahsun",
    "ରସୁଣ": "lahsun",
    "பூண்டு": "lahsun",

    "adrak": "adrak",
    "ginger": "adrak",
    "अदरक": "adrak",
    "ଅଦା": "adrak",
    "இஞ்சி": "adrak",

    "haldi": "haldi",
    "turmeric": "haldi",
    "हल्दी": "haldi",
    "ହଳଦୀ": "haldi",
    "மஞ்சள்": "haldi",

    "mirchi": "mirchi",
    "chilli": "mirchi",
    "chili": "mirchi",
    "मिर्ची": "mirchi",
    "लाल मिर्च": "mirchi",
    "ମିର୍ଚି": "mirchi",
    "மிளகாய்": "mirchi",

    "sabun": "soap",
    "soap": "soap",
    "साबुन": "soap",
    "ସାବୁନ": "soap",
    "சோப்பு": "soap",

    "surf": "detergent",
    "detergent": "detergent",
    "सर्फ": "detergent",

    "biscuit": "biscuit",
    "biscuits": "biscuit",
    "बिस्कुट": "biscuit",
    "बिस्किट": "biscuit",
    "ବିସ୍କୁଟ": "biscuit",

    "bread": "bread",
    "ब्रेड": "bread",
    "double roti": "bread",
    "ପାଉରୁଟି": "bread",

    "maggi": "maggi",
    "noodles": "maggi",
    "मैगी": "maggi",
    "ମ୍ୟାଗି": "maggi",
}

DEVANAGARI_TRANSLIT: Dict[str, str] = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "w", "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "n", "ँ": "n", "्": "",
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au"
}

ODIA_TRANSLIT: Dict[str, str] = {
    "କ": "k", "ଖ": "kh", "ଗ": "g", "ଘ": "gh",
    "ଚ": "ch", "ଛ": "chh", "ଜ": "j", "ଝ": "jh",
    "ଟ": "t", "ଠ": "th", "ଡ": "d", "ଢ": "dh", "ଣ": "n",
    "ତ": "t", "ଥ": "th", "ଦ": "d", "ଧ": "dh", "ନ": "n",
    "ପ": "p", "ଫ": "ph", "ବ": "b", "ଭ": "bh", "ମ": "m",
    "ଯ": "y", "ର": "r", "ଲ": "l", "ଳ": "l", "ଶ": "sh", "ଷ": "sh", "ସ": "s", "ହ": "h",
    "ା": "a", "ି": "i", "ୀ": "ee", "ୁ": "u", "ୂ": "oo",
    "େ": "e", "ୈ": "ai", "ୋ": "o", "ୌ": "au", "ଂ": "n", "୍": "",
    "ଅ": "a", "ଆ": "aa", "ଇ": "i", "ଉ": "u", "ଏ": "e", "ଓ": "o"
}

TAMIL_TRANSLIT: Dict[str, str] = {
    "க": "k", "ங": "ng", "ச": "ch", "ஞ": "ny", "ட": "t", "ண": "n",
    "த": "t", "ந": "n", "ப": "p", "ம": "m", "ய": "y", "ர": "r",
    "ல": "l", "வ": "v", "ழ": "zh", "ள": "l", "ற": "r", "ன": "n",
    "ா": "a", "ி": "i", "ீ": "ee", "ு": "u", "ூ": "oo",
    "ெ": "e", "ே": "e", "ை": "ai", "ொ": "o", "ோ": "o", "ௌ": "au",
    "அ": "a", "ஆ": "aa", "இ": "i", "ஈ": "ee", "உ": "u", "ஊ": "oo", "எ": "e", "ஏ": "ee", "ஐ": "ai", "ஒ": "o", "ஓ": "oo"
}

def canonicalize_unit(unit: Optional[str]) -> str:
    if not unit:
        return "kg"
    cleaned = unit.strip().lower()
    return CANONICAL_UNITS.get(cleaned, cleaned)

def transliterate_indic_to_latin(text: str) -> str:
    if not text:
        return ""
    res = []
    prev_was_consonant = False
    vowels_or_matras = set(list("ािीुूृेैोौ्")+list("ାିୀୁୂେୈୋୌ୍")+list("ாிீுூெேைொோௌ"))
    for c in text:
        if c in DEVANAGARI_TRANSLIT:
            mapped = DEVANAGARI_TRANSLIT[c]
            if prev_was_consonant and c not in vowels_or_matras:
                res.append("a")
            res.append(mapped)
            prev_was_consonant = (c in "कखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह")
        elif c in ODIA_TRANSLIT:
            mapped = ODIA_TRANSLIT[c]
            if prev_was_consonant and c not in vowels_or_matras:
                res.append("a")
            res.append(mapped)
            prev_was_consonant = (c in "କଖଗଘଚଛଜଝଟଠଡଢଣତଥଦଧନପଫବଭମଯରଲଳଶଷସହ")
        elif c in TAMIL_TRANSLIT:
            mapped = TAMIL_TRANSLIT[c]
            if prev_was_consonant and c not in vowels_or_matras:
                res.append("a")
            res.append(mapped)
            prev_was_consonant = (c in "கஙசஞடணதநபமயரலவழளறன")
        else:
            res.append(c)
            prev_was_consonant = False
    trans = "".join(res).lower()
    trans = trans.replace("v", "w")
    trans = re.sub(r'([aeiou])\1+', r'\1', trans)
    return re.sub(r'[^a-z0-9]', '', trans)

def normalize_product_key(name: str) -> str:
    if not name:
        return ""
    cleaned = name.strip().lower()
    cleaned_simple = re.sub(r'[^a-zA-Z0-9\u0900-\u097F\u0B00-\u0B7F\u0B80-\u0BFF\s]', '', cleaned)
    cleaned_simple = " ".join(cleaned_simple.split())

    if cleaned_simple in CANONICAL_COMMODITY_MAP:
        return CANONICAL_COMMODITY_MAP[cleaned_simple]

    for key, canonical in CANONICAL_COMMODITY_MAP.items():
        if key in cleaned_simple or cleaned_simple in key:
            return canonical

    phonetic = transliterate_indic_to_latin(cleaned_simple)
    if phonetic in CANONICAL_COMMODITY_MAP:
        return CANONICAL_COMMODITY_MAP[phonetic]

    for key, canonical in CANONICAL_COMMODITY_MAP.items():
        if key in phonetic or phonetic in key:
            return canonical

    return phonetic or cleaned_simple

def is_same_product(name1: str, name2: str) -> bool:
    if not name1 or not name2:
        return False
    n1 = name1.strip().lower()
    n2 = name2.strip().lower()
    if n1 == n2:
        return True

    k1 = normalize_product_key(n1)
    k2 = normalize_product_key(n2)
    if k1 and k2 and k1 == k2:
        return True

    p1 = transliterate_indic_to_latin(n1)
    p2 = transliterate_indic_to_latin(n2)
    if p1 and p2 and (p1 == p2 or p1 in p2 or p2 in p1):
        return True

    return False

def find_matching_product(product_name: str, existing_products: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not product_name or not existing_products:
        return None

    target = product_name.strip().lower()
    for p in existing_products:
        p_name = (p.get("name") or "").strip().lower()
        if p_name == target:
            return p

    target_key = normalize_product_key(target)
    target_phonetic = transliterate_indic_to_latin(target)

    for p in existing_products:
        p_name = (p.get("name") or "").strip().lower()
        curr_key = normalize_product_key(p_name)
        if target_key and curr_key and target_key == curr_key:
            return p
        curr_phonetic = transliterate_indic_to_latin(p_name)
        if target_phonetic and curr_phonetic and (target_phonetic == curr_phonetic):
            return p

    for p in existing_products:
        p_name = (p.get("name") or "").strip().lower()
        if is_same_product(target, p_name):
            return p

    return None

def merge_duplicate_products(shop_id: int) -> Dict[str, Any]:
    from backend.database.supabase_client import get_supabase
    client = get_supabase()

    products_res = client.table("products").select("id, shop_id, name, price, unit").eq("shop_id", shop_id).order("id").execute()
    products = products_res.data or []
    if len(products) <= 1:
        return {"merged_count": 0, "products": products}

    inv_res = client.table("inventory").select("id, shop_id, product_id, quantity, low_stock_limit").eq("shop_id", shop_id).execute()
    inv_map = {row["product_id"]: row for row in (inv_res.data or [])}

    merged_groups = []
    visited_ids = set()

    for i in range(len(products)):
        p1 = products[i]
        if p1["id"] in visited_ids:
            continue
        group = [p1]
        visited_ids.add(p1["id"])

        for j in range(i + 1, len(products)):
            p2 = products[j]
            if p2["id"] in visited_ids:
                continue
            if is_same_product(p1["name"], p2["name"]):
                group.append(p2)
                visited_ids.add(p2["id"])

        if len(group) > 1:
            merged_groups.append(group)

    merge_results = []
    for group in merged_groups:
        has_english = next((p for p in group if re.search(r'^[A-Za-z0-9\s]+$', p["name"])), None)
        primary = has_english or group[0]
        duplicates = [p for p in group if p["id"] != primary["id"]]

        total_qty = 0.0
        p_inv = inv_map.get(primary["id"])
        if p_inv:
            total_qty += float(p_inv.get("quantity") or 0.0)

        for d in duplicates:
            d_inv = inv_map.get(d["id"])
            if d_inv:
                total_qty += float(d_inv.get("quantity") or 0.0)

        latest_price = max(float(p.get("price") or 0.0) for p in group)
        norm_unit = canonicalize_unit(primary.get("unit"))

        client.table("products").update({
            "price": latest_price,
            "unit": norm_unit
        }).eq("id", primary["id"]).execute()

        if p_inv:
            client.table("inventory").update({
                "quantity": total_qty
            }).eq("id", p_inv["id"]).execute()

        for d in duplicates:
            try:
                client.table("inventory_logs").update({
                    "product_id": primary["id"]
                }).eq("product_id", d["id"]).execute()
            except Exception:
                pass

            client.table("inventory").delete().eq("product_id", d["id"]).execute()
            client.table("products").delete().eq("id", d["id"]).execute()

        merge_results.append({
            "primary_id": primary["id"],
            "primary_name": primary["name"],
            "merged_ids": [d["id"] for d in duplicates],
            "merged_names": [d["name"] for d in duplicates],
            "consolidated_quantity": total_qty,
            "final_price": latest_price,
            "unit": norm_unit
        })

    return {
        "merged_count": len(merge_results),
        "details": merge_results
    }
