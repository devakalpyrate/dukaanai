import logging
import re
import uuid
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("dukaanai.errors")

SENSITIVE_LEAK_PATTERNS = [
    re.compile(r"mysql", re.IGNORECASE),
    re.compile(r"postgresql", re.IGNORECASE),
    re.compile(r"postgres", re.IGNORECASE),
    re.compile(r"sqlite", re.IGNORECASE),
    re.compile(r"supabase", re.IGNORECASE),
    re.compile(r"postgrest", re.IGNORECASE),
    re.compile(r"mariadb", re.IGNORECASE),
    re.compile(r"\bdatabase\b", re.IGNORECASE),
    re.compile(r"\btable\b", re.IGNORECASE),
    re.compile(r"\bcolumn\b", re.IGNORECASE),
    re.compile(r"\brelation\b", re.IGNORECASE),
    re.compile(r"\bschema\b", re.IGNORECASE),
    re.compile(r"syntax\s*error", re.IGNORECASE),
    re.compile(r"error\s*104", re.IGNORECASE),
    re.compile(r"\b104\b"),
    re.compile(r"\bsql\b", re.IGNORECASE),
    re.compile(r"select\s+", re.IGNORECASE),
    re.compile(r"insert\s+into", re.IGNORECASE),
    re.compile(r"update\s+\w+\s+set", re.IGNORECASE),
    re.compile(r"delete\s+from", re.IGNORECASE),
    re.compile(r"traceback", re.IGNORECASE),
    re.compile(r"operationalerror", re.IGNORECASE),
    re.compile(r"programmingerror", re.IGNORECASE),
    re.compile(r"integrityerror", re.IGNORECASE),
    re.compile(r"password", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"token", re.IGNORECASE),
    re.compile(r"api_key", re.IGNORECASE),
    re.compile(r"file\s+\"", re.IGNORECASE),
    re.compile(r"\.py\b", re.IGNORECASE),
    re.compile(r"line\s+\d+", re.IGNORECASE),
    re.compile(r"groq", re.IGNORECASE),
    re.compile(r"bodhan", re.IGNORECASE),
    re.compile(r"huggingface", re.IGNORECASE),
    re.compile(r"gsk_", re.IGNORECASE),
    re.compile(r"hf_", re.IGNORECASE),
    re.compile(r"sb_", re.IGNORECASE),
    re.compile(r"connection\s+refused", re.IGNORECASE),
    re.compile(r"connection\s+reset", re.IGNORECASE),
    re.compile(r"failed\s+to\s+fetch", re.IGNORECASE),
]

SAFE_STATUS_MESSAGES = {
    status.HTTP_400_BAD_REQUEST: "Invalid request. Please verify your inputs and try again.",
    status.HTTP_401_UNAUTHORIZED: "Unable to log in. Check your credentials and try again.",
    status.HTTP_403_FORBIDDEN: "Access denied. You do not have permission for this resource.",
    status.HTTP_404_NOT_FOUND: "Requested resource not found.",
    status.HTTP_409_CONFLICT: "Record already exists. Please verify and try again.",
    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: "File exceeds maximum allowed size.",
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: "Unsupported file format. Please upload a valid file.",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "Invalid request payload format.",
    status.HTTP_429_TOO_MANY_REQUESTS: "Too many requests. Please wait and try again.",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "Service temporarily unavailable. Please try again later.",
    status.HTTP_502_BAD_GATEWAY: "Service temporarily unavailable. Please try again later.",
    status.HTTP_503_SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again later.",
    status.HTTP_504_GATEWAY_TIMEOUT: "Service temporarily unavailable. Please try again later.",
}

def sanitize_public_error_message(raw_msg: str, status_code: int, path: str = "") -> str:
    if not isinstance(raw_msg, str) or not raw_msg.strip():
        return SAFE_STATUS_MESSAGES.get(status_code, "Service temporarily unavailable. Please try again later.")
    
    if status_code >= 500:
        if "voice" in path.lower() or "transcribe" in path.lower() or "speak" in path.lower():
            return "Unable to process your voice request. Please try again."
        return "Service temporarily unavailable. Please try again later."
    
    for pattern in SENSITIVE_LEAK_PATTERNS:
        if pattern.search(raw_msg):
            return SAFE_STATUS_MESSAGES.get(status_code, "Service temporarily unavailable. Please try again later.")
    
    return raw_msg

def create_error_response(
    status_code: int,
    code: str,
    message: str,
    correlation_id: str,
    details: Optional[Any] = None,
    headers: Optional[Dict[str, str]] = None,
) -> JSONResponse:
    content = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "correlation_id": correlation_id,
        }
    }
    if details is not None:
        content["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=content, headers=headers)

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    corr_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    headers = getattr(exc, "headers", None) or {}
    path = request.url.path

    error_code = "HTTP_ERROR"
    if ("voice" in path.lower() or "transcribe" in path.lower() or "speak" in path.lower()) and exc.status_code >= 500:
        error_code = "VOICE_PROCESSING_ERROR"
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        error_code = "UNAUTHORIZED"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        error_code = "FORBIDDEN"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        error_code = "NOT_FOUND"
    elif exc.status_code == status.HTTP_409_CONFLICT:
        error_code = "CONFLICT"
    elif exc.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE:
        error_code = "PAYLOAD_TOO_LARGE"
    elif exc.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE:
        error_code = "UNSUPPORTED_MEDIA_TYPE"
    elif exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        error_code = "TOO_MANY_REQUESTS"
    elif exc.status_code == status.HTTP_400_BAD_REQUEST:
        error_code = "BAD_REQUEST"
    elif exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        error_code = "SERVICE_UNAVAILABLE"
    elif exc.status_code >= 500:
        error_code = "INTERNAL_SERVER_ERROR"

    raw_detail = str(exc.detail) if isinstance(exc.detail, str) else "Request error."
    safe_msg = sanitize_public_error_message(raw_detail, exc.status_code, path=path)

    if exc.status_code >= 500:
        logger.error(
            "Server HTTP %d exception on %s %s: %s",
            exc.status_code,
            request.method,
            path,
            raw_detail,
            exc_info=True,
            extra={
                "correlation_id": corr_id,
                "endpoint": path,
                "method": request.method,
                "status_code": exc.status_code,
            },
        )
    elif exc.status_code in (400, 401, 403, 404, 429):
        logger.warning(
            "Client HTTP %d error on %s %s: %s (corr_id=%s)",
            exc.status_code,
            request.method,
            path,
            raw_detail,
            corr_id,
            extra={
                "correlation_id": corr_id,
                "endpoint": path,
                "method": request.method,
                "status_code": exc.status_code,
            },
        )

    return create_error_response(
        status_code=exc.status_code,
        code=error_code,
        message=safe_msg,
        correlation_id=corr_id,
        headers=headers,
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    corr_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    path = request.url.path
    
    logger.warning(
        "Validation error on %s %s: %s (corr_id=%s)",
        request.method,
        path,
        str(exc.errors()),
        corr_id,
        extra={
            "correlation_id": corr_id,
            "endpoint": path,
            "method": request.method,
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
        },
    )

    safe_fields = []
    for err in exc.errors():
        field_parts = [str(loc) for loc in err.get("loc", []) if str(loc) not in ("body", "__root__")]
        field = ".".join(field_parts) if field_parts else "payload"
        safe_fields.append({
            "field": field,
            "issue": err.get("msg", "Invalid value"),
        })

    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="VALIDATION_ERROR",
        message="Invalid request payload format.",
        correlation_id=corr_id,
        details=safe_fields,
    )

async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    corr_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    endpoint = request.url.path
    method = request.method
    exc_type = type(exc).__name__
    exc_str = str(exc)

    logger.error(
        "Unhandled internal exception on %s %s: [%s] %s",
        method,
        endpoint,
        exc_type,
        exc_str,
        exc_info=True,
        extra={
            "correlation_id": corr_id,
            "endpoint": endpoint,
            "method": method,
            "exception_type": exc_type,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
    )

    lowered_exc = (exc_type + " " + exc_str).lower()
    
    if any(k in lowered_exc for k in ["23505", "duplicate key", "unique constraint", "already exists"]):
        return create_error_response(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message="Record already exists. Please verify and try again.",
            correlation_id=corr_id,
        )
    
    if any(k in lowered_exc for k in ["database", "mysql", "postgres", "sqlite", "supabase", "postgrest", "error 104", "104", "relation", "table"]):
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="DATABASE_ERROR",
            message="Service temporarily unavailable. Please try again later.",
            correlation_id=corr_id,
        )
    
    if any(k in lowered_exc for k in ["groq", "bodhan", "huggingface", "serpapi", "timeout", "connectionerror", "connecterror"]):
        return create_error_response(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="SERVICE_UNAVAILABLE",
            message="Service temporarily unavailable. Please try again later.",
            correlation_id=corr_id,
        )
    
    if "voice" in endpoint.lower() or "transcribe" in endpoint.lower() or "speak" in endpoint.lower():
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="VOICE_PROCESSING_ERROR",
            message="Unable to process your voice request. Please try again.",
            correlation_id=corr_id,
        )

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_SERVER_ERROR",
        message="Service temporarily unavailable. Please try again later.",
        correlation_id=corr_id,
    )
