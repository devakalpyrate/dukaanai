import logging
import uuid
from urllib.parse import unquote
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from backend.security.sql_guard import detect_sql_injection

logger = logging.getLogger("dukaanai.security")

class SQLInjectionGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        raw_query = unquote(request.url.query or "")
        if raw_query:
            if detect_sql_injection(raw_query):
                ip = request.client.host if request.client else "unknown"
                logger.warning(
                    "Blocked SQL Injection attempt from IP %s on URL %s",
                    ip,
                    request.url.path
                )
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Request rejected due to potentially unsafe input parameters."}
                )

        for param_name, param_val in request.query_params.items():
            if detect_sql_injection(param_val):
                ip = request.client.host if request.client else "unknown"
                logger.warning(
                    "Blocked SQL Injection attempt in parameter '%s' from IP %s",
                    param_name,
                    ip
                )
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Request rejected due to potentially unsafe input parameters."}
                )

        return await call_next(request)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        corr_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        request.state.correlation_id = corr_id

        response: Response = await call_next(request)

        response.headers["X-Correlation-ID"] = corr_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "microphone=(self)"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https:; "
            "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 ws://127.0.0.1:8000; "
            "media-src 'self' blob:; "
            "object-src 'none';"
        )

        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response
