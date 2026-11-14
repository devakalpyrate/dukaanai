import re
from typing import Any, Optional

def detect_language(text: str) -> str:
    if not text:
        return "en"
    cleaned = text.strip()
    for ch in cleaned:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F:
            return "hi"
        if 0x0B00 <= code <= 0x0B7F:
            return "or"
        if 0x0A00 <= code <= 0x0A7F:
            return "pa"
        if 0x0980 <= code <= 0x09FF:
            return "bn"
        if 0x0A80 <= code <= 0x0AFF:
            return "gu"
        if 0x0B80 <= code <= 0x0BFF:
            return "ta"
        if 0x0C00 <= code <= 0x0C7F:
            return "te"
        if 0x0C80 <= code <= 0x0CFF:
            return "kn"
        if 0x0D00 <= code <= 0x0D7F:
            return "ml"

    tokens = set(re.findall(r"[a-zA-Z]+", cleaned.lower()))
    hinglish_markers = {
        "udhar", "udhaar", "jama", "likho", "likh", "rupaye", "rupay", "rupya",
        "ka", "ki", "ke", "ko", "ne", "se", "paise", "paisa", "bhai", "ji", "aaj", "kitna",
        "hai", "hein", "hain", "de", "diye", "diya", "karo", "kar", "do", "bhejo", "bhej",
        "khata", "bahi", "dukaan", "grahak"
    }
    if tokens.intersection(hinglish_markers):
        return "hi-latn"

    return "en"

def get_localized_confirmation(
    action: str,
    customer: str,
    amount: Optional[Any] = None,
    lang: str = "en",
    was_created: bool = False
) -> str:
    amt_str = str(amount) if amount is not None else ""
    created_prefix_map = {
        "hi": f"नया ग्राहक {customer} बना। " if was_created else "",
        "hi-latn": f"Naya customer '{customer}' add hua. " if was_created else "",
        "or": f"ନୂଆ ଗ୍ରାହକ {customer} ତିଆରି ହେଲା। " if was_created else "",
        "pa": f"ਨਵਾਂ ਗਾਹਕ {customer} ਸ਼ਾਮਲ ਹੋਇਆ। " if was_created else "",
        "bn": f"নতুন গ্রাহক {customer} তৈরি হয়েছে। " if was_created else "",
        "gu": f"નવો ગ્રાહક {customer} ઉમેરાયો. " if was_created else "",
        "en": f"New customer '{customer}' created. " if was_created else "",
    }
    prefix = created_prefix_map.get(lang, created_prefix_map["en"])

    if action == "record_credit":
        if lang == "hi":
            return f"{prefix}{customer} के खाते में ₹{amt_str} का उधार दर्ज कर दिया गया है।"
        elif lang == "hi-latn":
            return f"{prefix}{customer} ke khate mein ₹{amt_str} ka udhaar likh diya gaya hai."
        elif lang == "or":
            return f"{prefix}{customer}ଙ୍କ ଖାତାରେ ₹{amt_str} ଉଧାର ଲେଖାଗଲା।"
        elif lang == "pa":
            return f"{prefix}{customer} ਦੇ ਖਾਤੇ ਵਿੱਚ ₹{amt_str} ਦਾ ਉਧਾਰ ਦਰਜ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।"
        elif lang == "bn":
            return f"{prefix}{customer}এর খাতায় ₹{amt_str} বাকি জমা করা হয়েছে।"
        elif lang == "gu":
            return f"{prefix}{customer}ના ખાતામાં ₹{amt_str}નું ઉધાર લખાઈ ગયું છે।"
        else:
            return f"{prefix}Credit of Rs {amt_str} recorded for {customer}."

    elif action == "record_payment":
        if lang == "hi":
            return f"{customer} से ₹{amt_str} का भुगतान प्राप्त हो गया है।"
        elif lang == "hi-latn":
            return f"{customer} se ₹{amt_str} ka payment jama ho gaya hai."
        elif lang == "or":
            return f"{customer}ଙ୍କଠାରୁ ₹{amt_str} ଜମା ଗ୍ରହଣ କରାଗଲା।"
        elif lang == "pa":
            return f"{customer} ਤੋਂ ₹{amt_str} ਦਾ ਭੁਗਤਾਨ ਪ੍ਰਾਪਤ ਹੋਇਆ ਹੈ।"
        elif lang == "bn":
            return f"{customer}এর থেকে ₹{amt_str} জমা পাওয়া গেছে।"
        elif lang == "gu":
            return f"{customer} પાસેથી ₹{amt_str}નું પેમેન્ટ જમા થઈ ગયું છે।"
        else:
            return f"Payment of Rs {amt_str} received from {customer}."

    elif action == "clear_debt":
        if lang == "hi":
            return f"{customer} का पूरा ₹{amt_str} का उधार चुकता कर दिया गया है। बैलेंस अब ₹0.00 है।"
        elif lang == "hi-latn":
            return f"{customer} ka pura ₹{amt_str} ka udhaar clear ho gaya hai. Balance ab ₹0.00 hai."
        elif lang == "or":
            return f"{customer}ଙ୍କ ସମସ୍ତ ₹{amt_str} ଉଧାର କ୍ଲିୟର ହୋଇଗଲା। ବାକି ଏବେ ₹0.00 ଅଛି।"
        elif lang == "pa":
            return f"{customer} ਦਾ ਪੂਰਾ ₹{amt_str} ਦਾ ਉਧਾਰ ਕਲੀਅਰ ਹੋ ਗਿਆ ਹੈ। ਬਾਕੀ ਹੁਣ ₹0.00 ਹੈ।"
        elif lang == "bn":
            return f"{customer}এর সম্পূর্ণ ₹{amt_str} বাকি পরিশোধ করা হয়েছে। বর্তমান বাকি ₹0.00।"
        elif lang == "gu":
            return f"{customer}નું તમામ ₹{amt_str}નું ઉધાર ચૂકતે થઈ ગયું છે. બાકી હવે ₹0.00 છે."
        else:
            return f"All dues of Rs {amt_str} cleared for {customer}. Current balance is Rs 0.00."

    elif action == "already_cleared":
        if lang == "hi":
            return f"{customer} का कोई बाकी उधार नहीं है। बैलेंस ₹0.00 है।"
        elif lang == "hi-latn":
            return f"{customer} ka koi baki udhaar nahi hai. Balance ₹0.00 hai."
        elif lang == "or":
            return f"{customer}ଙ୍କ କୌଣସି ବାକି ଉଧାର ନାହିଁ। ବାକି ₹0.00 ଅଛି।"
        else:
            return f"No outstanding dues for {customer}. Balance is Rs 0.00."

    elif action == "add_customer":
        if lang == "hi":
            return f"ग्राहक {customer} सफलतापूर्वक जुड़ गया है।"
        elif lang == "hi-latn":
            return f"Customer {customer} safalta-purvak add ho gaya hai."
        elif lang == "or":
            return f"ଗ୍ରାହକ {customer} ସଫଳତାର ସହିତ ଯୋଡ଼ାଗଲା।"
        else:
            return f"Customer '{customer}' added successfully."

    elif action == "add_product":
        if lang == "hi":
            return f"प्रोडक्ट {customer} ₹{amt_str} पर स्टोर में जुड़ गया है।"
        elif lang == "hi-latn":
            return f"Product {customer} ₹{amt_str} par store mein add ho gaya hai."
        elif lang == "or":
            return f"ପ୍ରଡକ୍ଟ {customer} ₹{amt_str} ରେ ଯୋଡ଼ାଗଲା।"
        else:
            return f"Product '{customer}' added at Rs {amt_str}."

    return f"Action completed for {customer}."
