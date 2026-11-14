import logging
import uuid
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("dukaanai.errors")

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

    error_code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        error_code = "UNAUTHORIZED"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        error_code = "FORBIDDEN"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        error_code = "NOT_FOUND"
    elif exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        error_code = "TOO_MANY_REQUESTS"
    elif exc.status_code == status.HTTP_400_BAD_REQUEST:
        error_code = "BAD_REQUEST"

    safe_msg = str(exc.detail) if isinstance(exc.detail, str) else "Request error."
    return create_error_response(
        status_code=exc.status_code,
        code=error_code,
        message=safe_msg,
        correlation_id=corr_id,
        headers=headers,
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    corr_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    logger.warning("Validation error on %s: %s (corr_id=%s)", request.url.path, exc.errors(), corr_id)

    safe_fields = []
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err.get("loc", []))
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

    logger.error(
        "Unhandled internal exception on %s %s: %s",
        method,
        endpoint,
        exc,
        exc_info=True,
        extra={"correlation_id": corr_id, "endpoint": endpoint},
    )

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected system error occurred. Please try again or contact support.",
        correlation_id=corr_id,
    )
