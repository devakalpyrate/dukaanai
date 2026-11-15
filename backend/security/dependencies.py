from typing import Any, Dict
from fastapi import HTTPException, Request, status
from backend.security.config import DEFAULT_RATE_LIMITS
from backend.security.rate_limiter import get_rate_limiter

def enforce_rate_limit(
    request: Request,
    category: str,
    user_id: str | None = None,
    client_ip: str | None = None,
):
    limiter = get_rate_limiter()
    ip = client_ip or (request.client.host if request.client else "127.0.0.1")

    global_rule = DEFAULT_RATE_LIMITS.get("global_ip", {"max_requests": 120, "window_sec": 60})
    ip_allowed, ip_retry = limiter.is_allowed(f"ip:{ip}:global", global_rule["max_requests"], global_rule["window_sec"])
    if not ip_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"IP rate limit exceeded. Please wait {ip_retry} seconds.",
            headers={"Retry-After": str(ip_retry)},
        )

    rule = DEFAULT_RATE_LIMITS.get(category, {"max_requests": 60, "window_sec": 60})
    max_req = rule["max_requests"]
    window = rule["window_sec"]

    if user_id:
        key = f"user:{user_id}:{category}"
    else:
        key = f"ip:{ip}:{category}"

    allowed, retry_after = limiter.is_allowed(key, max_req, window)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for {category}. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
