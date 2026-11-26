import logging
import re
from typing import Optional

logger = logging.getLogger("dukaanai.security.sql_guard")

SQL_INJECTION_PATTERNS = [
    r"(\b(UNION|INTERSECT|EXCEPT)\s+(ALL\s+)?SELECT\b)",
    r"(\bSELECT\b.+\bFROM\b)",
    r"(\bINSERT\s+INTO\b.+\bVALUES\b)",
    r"(\bUPDATE\b.+\bSET\b)",
    r"(\bDELETE\s+FROM\b)",
    r"(\bDROP\s+(TABLE|DATABASE|VIEW|INDEX|PROCEDURE)\b)",
    r"(\bALTER\s+(TABLE|DATABASE)\b)",
    r"(\bCREATE\s+(TABLE|DATABASE|USER)\b)",
    r"(\bTRUNCATE\s+TABLE\b)",
    r"(\b(OR|AND)\s+[\'\"]?[0-9a-zA-Z]+[\'\"]?\s*=\s*[\'\"]?[0-9a-zA-Z]+[\'\"]?)",
    r"(\b(OR|AND)\s+[0-9]+\s*=\s*[0-9]+)",
    r"(\'\s*(OR|AND)\s*[\'0-9a-zA-Z])",
    r"(\bWAITFOR\s+DELAY\b)",
    r"(\bPG_SLEEP\s*\()",
    r"(\bSLEEP\s*\([0-9]+\))",
    r"(\bBENCHMARK\s*\()",
    r"(\bINFORMATION_SCHEMA\b)",
    r"(\bPG_CATALOG\b)",
    r"(\bSYS\.(OBJECTS|TABLES|DATABASES)\b)",
    r"(--|/\*|\*/|;\s*(DROP|DELETE|UPDATE|INSERT|SELECT|EXEC))",
    r"(\bEXEC(\s+|\s*\(|\s+xp_))",
]

_COMPILED_SQLI_REGEX = re.compile(
    "|".join(SQL_INJECTION_PATTERNS),
    re.IGNORECASE
)

POSTGREST_DANGEROUS_CHARS = re.compile(r"[,;()\"'\\`]|(\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|not|or|and|cs|cd|ov|sl|sr)\.)", re.IGNORECASE)


def detect_sql_injection(input_val: Optional[str]) -> bool:
    if not input_val or not isinstance(input_val, str):
        return False
    
    cleaned = input_val.replace("\x00", "").strip()
    if not cleaned:
        return False
        
    match = _COMPILED_SQLI_REGEX.search(cleaned)
    if match:
        logger.warning(
            "SQL Injection payload detected: '%s' matched pattern '%s'",
            cleaned[:80],
            match.group(0),
        )
        return True
    return False


def sanitize_search_term(term: Optional[str], max_len: int = 80) -> str:
    if not term or not isinstance(term, str):
        return ""

    cleaned = term.replace("\x00", "").strip()

    if detect_sql_injection(cleaned):
        return ""

    cleaned = POSTGREST_DANGEROUS_CHARS.sub(" ", cleaned)

    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned[:max_len]
