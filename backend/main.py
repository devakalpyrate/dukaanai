import asyncio
import random
import time
import uuid
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import tempfile
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.authentication.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
try:
    from backend.grpc_service.server import close_grpc_resources, get_grpc_client, get_grpc_server_manager
except Exception:
    close_grpc_resources = lambda: None
    get_grpc_client = lambda: None
    get_grpc_server_manager = lambda: None
from backend.models.ai import get_llm_client
from backend.models.voice import get_audio_duration, get_model_info, load_model, transcribe_audio
from backend.queries import customer as customer_queries
from backend.queries import notification as notification_queries
from backend.queries import product as product_queries
from backend.queries import settings as settings_queries
from backend.queries import shops as shop_queries
from backend.queries import supplier as supplier_queries
from backend.queries import transaction as transaction_queries
from backend.queries import user as user_queries
from backend.services.business_logic import CustomerService, InventoryService, ProductService, TransactionService
from backend.services.intent_executor import IntentExecutor
from backend.services.pdf_generator import generate_customer_ledger_pdf
from backend.services.price_discovery import get_market_price
from backend.services.email_service import mask_email, send_otp_email

from backend.security import config as sec_config
from backend.security.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    ALLOWED_AUDIO_MIME_TYPES,
    CORS_ALLOWED_ORIGINS,
    MAX_AUDIO_DURATION_SEC,
    MAX_CONCURRENT_VOICE_PER_USER,
)
from backend.security.dependencies import enforce_rate_limit
from backend.security.exceptions import (
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from backend.security.logger import StructuredLogFormatter
from backend.security.middleware import SecurityHeadersMiddleware
from backend.security.rate_limiter import get_rate_limiter

log_handler = logging.StreamHandler()
log_handler.setFormatter(StructuredLogFormatter())
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
if not root_logger.handlers:
    root_logger.addHandler(log_handler)
else:
    root_logger.handlers[0].setFormatter(StructuredLogFormatter())

logger = logging.getLogger("dukaanai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DukaanAI Backend with hardened production security...")

    if not os.getenv("VERCEL") and not os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        try:
            grpc_server = get_grpc_server_manager()
            if grpc_server and hasattr(grpc_server, "start"):
                grpc_server.start()
        except Exception as exc:
            logger.error("Failed to start gRPC LLM Service: %s", exc)

    try:
        load_model()
        logger.info("Voice STT model warmed up successfully.")
    except Exception as exc:
        logger.error("Error pre-warming STT model on startup: %s", exc)

    yield

    logger.info("Shutting down DukaanAI Backend & gRPC services...")
    if not os.getenv("VERCEL") and not os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        try:
            close_grpc_resources()
        except Exception as exc:
            logger.error("Error closing gRPC resources: %s", exc)
    logger.info("DukaanAI Backend shutdown completed.")

app = FastAPI(
    title="DukaanAI API",
    description="Production-hardened Backend API for DukaanAI Smart Shop Assistant",
    version="1.0.0",
    debug=False,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

static_dir = Path(__file__).resolve().parent / "static"
assets_dir = static_dir / "assets"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
landing_dir = Path(__file__).resolve().parent.parent / "landing"
if landing_dir.exists():
    app.mount("/landing", StaticFiles(directory=str(landing_dir), html=True), name="landing")

@app.get("/favicon.svg")
def favicon_svg():
    fav = static_dir / "favicon.svg"
    if fav.exists():
        return FileResponse(fav)
    return FileResponse(static_dir / "index.html")

@app.get("/favicon.png")
@app.get("/favicon.ico")
def favicon_png():
    fav_png = static_dir / "favicon.png"
    if fav_png.exists():
        return FileResponse(fav_png)
    fav_svg = static_dir / "favicon.svg"
    if fav_svg.exists():
        return FileResponse(fav_svg)
    return FileResponse(static_dir / "index.html")

@app.get("/")
@app.get("/login")
@app.get("/home")
@app.get("/assistant")
@app.get("/customers")
@app.get("/products")
@app.get("/sales")
@app.get("/suppliers")
@app.get("/billing")
@app.get("/automation")
@app.get("/reports")
@app.get("/settings")
@app.get("/docs")
@app.get("/docs/{subpath:path}")
def serve_ui(subpath: Optional[str] = None):
    ui_file = static_dir / "index.html"
    if ui_file.exists():
        content = ui_file.read_text(encoding="utf-8")
        return HTMLResponse(content=content, status_code=200)
    return HTMLResponse("<h1>DukaanAI Unified Server</h1><p>UI loading...</p>", status_code=200)

class TranscriptionResponse(BaseModel):
    success: bool
    transcribed_text: str
    audio_duration_sec: float | None = None
    inference_time_sec: float
    real_time_factor: float | None = None
    device: str

class UnderstandIntentPayload(BaseModel):
    text: str = Field(..., description="Recognized speech text or manual shopkeeper instruction")
    context: Optional[str] = Field(default="", description="Previous dialogue context or history")
    shop_id: Optional[int] = Field(default=1, description="Active shop identifier")

class UnderstandIntentResponseModel(BaseModel):
    success: bool
    intent: str
    action: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    entities: Dict[str, Any] = Field(default_factory=dict)
    original_text: str = ""
    normalized_text: str = ""
    normalization: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0
    requires_confirmation: bool = False
    clarification_needed: bool = False
    clarification_question: Optional[str] = None
    error_message: Optional[str] = None

class ExecuteActionPayload(BaseModel):
    intent_data: Dict[str, Any] = Field(..., description="Canonical structured intent from AI or manual override")
    confirmed: Optional[bool] = Field(default=False, description="User confirmation for destructive/financial actions")
    request_id: Optional[str] = Field(default=None, description="Client idempotency key to prevent duplicate submissions")

class ActionExecutionResponseModel(BaseModel):
    success: bool
    action: str
    result: Optional[Any] = None
    message: str
    spoken_message: Optional[str] = None
    detected_language: Optional[str] = None
    clarification_needed: bool = False
    clarification_question: Optional[str] = None
    requires_confirmation: bool = False
    original_text: str = ""
    normalized_text: str = ""
    normalization_notes: Dict[str, Any] = Field(default_factory=dict)

class RegisterPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    shop_name: str = Field(..., min_length=2, max_length=150)
    phone: Optional[str] = Field(default="", max_length=20)
    address: Optional[str] = Field(default="", max_length=300)
    otp: Optional[str] = Field(default=None, max_length=10)

class LoginPayload(BaseModel):
    email: Optional[str] = Field(default="", max_length=120)
    phone: Optional[str] = Field(default="", max_length=30)
    identifier: Optional[str] = Field(default="", max_length=120)
    password: Optional[str] = Field(default="", max_length=128)
    otp: Optional[str] = Field(default=None, max_length=10)

class SendOtpPayload(BaseModel):
    phone: str = Field(..., min_length=5, max_length=20)
    email: Optional[str] = Field(default="", max_length=120)

class SettingsPayload(BaseModel):
    upi_id: Optional[str] = Field(default="", max_length=100)
    upi_pin: Optional[str] = Field(default="", max_length=50)
    phone: Optional[str] = Field(default="", max_length=20)
    shop_name: Optional[str] = Field(default="", max_length=100)
    shop_address: Optional[str] = Field(default="", max_length=300)
    gstin: Optional[str] = Field(default="", max_length=50)
    theme: Optional[str] = Field(default="dark", max_length=20)
    language: Optional[str] = Field(default="hi", max_length=20)
    low_stock_alert: Optional[int] = Field(default=1)

class NotificationPayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=1000)
    type: Optional[str] = Field(default="info", max_length=50)

class NotificationBatchPayload(BaseModel):
    notification_ids: list[int] = Field(default_factory=list)

class AuthResponse(BaseModel):
    success: bool
    requires_otp: Optional[bool] = False
    message: Optional[str] = ""
    masked_email: Optional[str] = ""
    access_token: Optional[str] = ""
    user_id: Optional[int] = 0
    name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    shop_id: Optional[int] = 0
    shop_name: Optional[str] = ""
    shop_address: Optional[str] = ""

ACTIVE_OTPS: Dict[str, Dict[str, Any]] = {}

def persist_serverless_otp(keys: list[str], code: str, shop_id: Any = None, expires_in: int = 600):
    now = time.time()
    for k in keys:
        if k:
            ACTIVE_OTPS[k] = {"code": code, "created_at": now}
    try:
        from backend.database.supabase_client import get_supabase
        sb = get_supabase()
        clean_keys = [str(k).strip().lower() for k in keys if k]
        payload = {
            "title": "system_otp",
            "message": json.dumps({"keys": clean_keys, "code": str(code).strip(), "expires_at": now + expires_in}),
            "type": "system_otp",
            "is_read": False,
        }
        if shop_id:
            payload["shop_id"] = int(shop_id) if str(shop_id).isdigit() else None
        sb.table("notifications").insert(payload).execute()
    except Exception as exc:
        logger.warning("Could not persist serverless OTP to DB: %s", exc)

def verify_serverless_otp(candidate_keys: list[str], submitted_otp: str) -> bool:
    now = time.time()
    clean_submitted = submitted_otp.strip()
    for key in candidate_keys:
        if key and key in ACTIVE_OTPS:
            entry = ACTIVE_OTPS[key]
            if str(entry.get("code")).strip() == clean_submitted:
                if now - entry.get("created_at", now) <= 600:
                    for k in candidate_keys:
                        if k:
                            ACTIVE_OTPS.pop(k, None)
                    return True
    try:
        from backend.database.supabase_client import get_supabase
        sb = get_supabase()
        res = sb.table("notifications").select("id, message, created_at").eq("type", "system_otp").order("created_at", desc=True).limit(25).execute()
        valid_set = {str(k).strip().lower() for k in candidate_keys if k}
        matched_id = None
        for row in (res.data or []):
            try:
                data = json.loads(row.get("message") or "{}")
                entry_code = str(data.get("code") or "").strip()
                expires_at = float(data.get("expires_at") or 0)
                entry_keys = {str(k).strip().lower() for k in data.get("keys", [])}
                if entry_code == clean_submitted and now <= expires_at and valid_set.intersection(entry_keys):
                    matched_id = row.get("id")
                    break
            except Exception:
                continue
        if matched_id:
            try:
                sb.table("notifications").delete().eq("id", matched_id).execute()
            except Exception:
                pass
            for k in candidate_keys:
                if k:
                    ACTIVE_OTPS.pop(k, None)
            return True
    except Exception as exc:
        logger.warning("Error checking serverless OTP in DB: %s", exc)
    return False

class SpeakPayload(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Text to synthesize to speech")
    voice: Optional[str] = Field("Amit", description="Voice profile for synthesis")
    lang: Optional[str] = Field(None, description="Language code for synthesis (e.g. hi, or, ta, en)")

security_scheme = HTTPBearer(auto_error=False)

def get_current_shop(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    shop_id = payload.get("shop_id")
    if not user_id or not shop_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
        )
    
    shop = shop_queries.get_shop_by_id(shop_id)
    if not shop or str(shop.get("owner_id")) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or account no longer exists. Please log in again.",
        )
    
    return {
        "user_id": user_id,
        "shop_id": shop_id,
        "email": payload.get("email"),
        "shop_name": shop["shop_name"],
    }

@app.post(
    "/api/auth/send-otp",
    status_code=status.HTTP_200_OK,
    summary="Generate and send OTP confirmation code",
)
def send_otp_endpoint(request: Request, payload: SendOtpPayload):
    enforce_rate_limit(request, category="login")
    clean_phone = payload.phone.strip()
    clean_email = (payload.email or "").strip().lower()

    target_email = clean_email
    recipient_name = "Shop Owner"

    if not target_email:
        user = user_queries.get_user_credentials_by_email_or_phone(clean_phone)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account registered with this mobile number. Please register first.",
            )
        target_email = (user.get("email") or "").strip().lower()
        recipient_name = user.get("name") or "Shop Owner"
        if not target_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No registered email address found for this account. Please use password login.",
            )

    code = f"{random.randint(100000, 999999)}"
    digits = "".join(c for c in clean_phone if c.isdigit())
    last10 = digits[-10:] if len(digits) >= 10 else digits
    persist_serverless_otp(
        [clean_phone, last10, target_email],
        code=code,
        shop_id=user.get("shop_id") if user else None,
    )

    send_otp_email(target_email, code, recipient_name)
    masked = mask_email(target_email)

    return {
        "success": True,
        "message": f"Verification code sent to your registered email ({masked}).",
        "masked_email": masked,
        "phone": clean_phone,
    }

@app.post(
    "/api/auth/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Shop Owner and store",
)
def register_endpoint(request: Request, payload: RegisterPayload):
    enforce_rate_limit(request, category="login")
    clean_email = payload.email.strip().lower()
    clean_phone = (payload.phone or "").strip()
    
    existing = user_queries.get_user_by_email(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered. Please log in.",
        )
    if clean_phone:
        existing_phone = user_queries.get_user_by_phone(clean_phone)
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number is already registered. Please log in.",
            )

    if payload.otp:
        submitted_otp = payload.otp.strip()
        matched = False
        p_entry = ACTIVE_OTPS.get(clean_phone)
        e_entry = ACTIVE_OTPS.get(clean_email)
        if p_entry and p_entry["code"] == submitted_otp:
            matched = True
        elif e_entry and e_entry["code"] == submitted_otp:
            matched = True
        
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired confirmation code (OTP). Please check and try again.",
            )
    
    try:
        hashed_pwd = hash_password(payload.password)
        user_id = user_queries.create_user(
            name=payload.name.strip(),
            email=clean_email,
            password_hash=hashed_pwd,
            phone=clean_phone or None,
        )
        
        shop_id = shop_queries.create_shop(
            owner_id=user_id,
            shop_name=payload.shop_name.strip(),
            address=(payload.address or "").strip() or None,
        )

        settings_queries.upsert_settings(
            shop_id=shop_id,
            user_id=user_id,
            phone=clean_phone,
            shop_name=payload.shop_name.strip(),
            shop_address=(payload.address or "").strip(),
        )

        try:
            notification_queries.create_notification(
                shop_id=shop_id,
                user_id=user_id,
                title="Welcome to DukaanAI!",
                message="Your voice khata and digital ledger are active. You can record transactions with voice or keyboard.",
                notification_type="system",
            )
            notification_queries.create_notification(
                shop_id=shop_id,
                user_id=user_id,
                title="Digital QR & UPI Ready",
                message="Your store QR code is ready to receive instant payments from customers.",
                notification_type="payment",
            )
        except Exception:
            pass
        
        token = create_access_token({
            "sub": user_id,
            "shop_id": shop_id,
            "email": clean_email,
        })
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Registration error: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create your account. Please try again.",
        )
    
    return AuthResponse(
        success=True,
        access_token=token,
        user_id=user_id,
        name=payload.name.strip(),
        email=clean_email,
        phone=clean_phone,
        shop_id=shop_id,
        shop_name=payload.shop_name.strip(),
        shop_address=(payload.address or "").strip(),
    )

@app.post(
    "/api/auth/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in as a Shop Owner",
)
def login_endpoint(request: Request, payload: LoginPayload):
    raw_identifier = (payload.identifier or payload.phone or payload.email or "").strip()
    if not raw_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number or email is required.",
        )
    clean_identifier = raw_identifier.lower()
    enforce_rate_limit(request, category="login", user_id=clean_identifier)
    
    user = user_queries.get_user_credentials_by_email_or_phone(raw_identifier)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="First register yourself",
        )
    
    if payload.otp and payload.otp.strip():
        submitted_otp = payload.otp.strip()
        user_phone = user.get("phone") or ""
        user_email = (user.get("email") or "").lower()
        digits = "".join(c for c in user_phone if c.isdigit())
        last10 = digits[-10:] if len(digits) >= 10 else digits
        candidate_keys = [user_phone, last10, user_email, raw_identifier, clean_identifier]
        if not verify_serverless_otp(candidate_keys, submitted_otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code.",
            )
    else:
        # Password-based step (or initial 2FA credential check)
        if not payload.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password or OTP is required to log in.",
            )
        if not verify_password(payload.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to log in. Check your credentials and try again.",
            )

        # Generate and dispatch 2FA OTP code to registered email
        code = f"{random.randint(100000, 999999)}"
        user_email = (user.get("email") or "").lower()
        user_phone = user.get("phone") or ""
        digits = "".join(c for c in user_phone if c.isdigit())
        last10 = digits[-10:] if len(digits) >= 10 else digits
        persist_serverless_otp(
            [user_email, user_phone, last10, clean_identifier, raw_identifier],
            code=code,
            shop_id=user.get("shop_id"),
        )
        send_otp_email(user_email, code, user.get("name") or "Shop Owner")
        masked = mask_email(user_email)
        return AuthResponse(
            success=True,
            requires_otp=True,
            masked_email=masked,
            message=f"Password verified. A 6-digit confirmation code has been sent to your registered email ({masked}).",
            access_token="",
            user_id=0,
            name=user.get("name") or "",
            email=user_email,
            phone=user_phone,
            shop_id=0,
            shop_name="",
            shop_address="",
        )
    
    user_id = user["id"]
    user_queries.record_user_login(user_id)
    shops = shop_queries.get_shops_by_owner(user_id)
    if not shops:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shop found for this account.",
        )
    
    primary_shop = shops[0]
    token = create_access_token({
        "sub": user_id,
        "shop_id": primary_shop["id"],
        "email": user["email"],
    })
    
    return AuthResponse(
        success=True,
        access_token=token,
        user_id=user_id,
        name=user["name"],
        email=user["email"],
        phone=user.get("phone") or "",
        shop_id=primary_shop["id"],
        shop_name=primary_shop["shop_name"],
        shop_address=primary_shop.get("address") or "",
    )

@app.get(
    "/api/auth/me",
    summary="Get current authenticated shop owner profile",
)
def get_current_user_profile(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    user = user_queries.get_user_by_id(current_shop["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account has been deleted or no longer exists. Please register first.",
        )
    shop = shop_queries.get_shop_by_id(current_shop["shop_id"]) or {}
    st = settings_queries.get_settings_by_shop(current_shop["shop_id"]) or {}
    return {
        "success": True,
        "user": user,
        "shop": {
            "id": current_shop["shop_id"],
            "name": current_shop["shop_name"],
            "address": shop.get("address") or st.get("shop_address") or "",
        },
        "settings": st,
    }

@app.get(
    "/api/settings",
    summary="Get shop and user settings",
)
def get_settings_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    user_id = current_shop["user_id"]
    st = settings_queries.get_settings_by_shop(shop_id)
    if not st:
        user = user_queries.get_user_by_id(user_id) or {}
        shop = shop_queries.get_shop_by_id(shop_id) or {}
        settings_queries.upsert_settings(
            shop_id=shop_id,
            user_id=user_id,
            phone=user.get("phone") or "",
            shop_name=shop.get("shop_name") or current_shop.get("shop_name") or "",
            shop_address=shop.get("address") or "",
        )
        st = settings_queries.get_settings_by_shop(shop_id)
    return {"success": True, "settings": st}

@app.put(
    "/api/settings",
    summary="Update shop and user settings",
)
def update_settings_endpoint(
    request: Request,
    payload: SettingsPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    user_id = current_shop["user_id"]
    try:
        settings_queries.upsert_settings(
            shop_id=shop_id,
            user_id=user_id,
            upi_id=(payload.upi_id or "").strip(),
            upi_pin=(payload.upi_pin or "").strip(),
            phone=(payload.phone or "").strip(),
            shop_name=(payload.shop_name or "").strip(),
            shop_address=(payload.shop_address or "").strip(),
            gstin=(payload.gstin or "").strip(),
            theme=payload.theme or "dark",
            language=payload.language or "hi",
            low_stock_alert=payload.low_stock_alert if payload.low_stock_alert is not None else 1,
        )
        if payload.phone:
            user_queries.update_user(user_id, phone=payload.phone.strip())
        if payload.shop_name or payload.shop_address:
            shop_queries.update_shop(shop_id, shop_name=payload.shop_name.strip() if payload.shop_name else None, address=payload.shop_address.strip() if payload.shop_address else None)
        
        updated = settings_queries.get_settings_by_shop(shop_id)
        return {"success": True, "settings": updated, "message": "Settings saved successfully."}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update settings: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        raise HTTPException(status_code=400, detail="Unable to save settings. Please try again.") from exc

@app.get(
    "/api/notifications",
    summary="Get all notifications for shop",
)
def get_notifications_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    notifs = notification_queries.get_notifications_by_shop(shop_id)
    return {"success": True, "notifications": notifs or []}

@app.post(
    "/api/notifications",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new notification",
)
def create_notification_endpoint(
    request: Request,
    payload: NotificationPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="intent", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    user_id = current_shop["user_id"]
    title = payload.title.strip()
    msg = payload.message.strip()
    forbidden_terms = ["mysql", "postgresql", "sqlite", "database", "schema", "table", "fastapi", "uvicorn", "gunicorn", "backend", "architecture", "endpoint"]
    for term in forbidden_terms:
        if term in title.lower() or term in msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notification content cannot contain internal system or technical architecture terms.",
            )
    nid = notification_queries.create_notification(
        shop_id=shop_id,
        user_id=user_id,
        title=title,
        message=msg,
        notification_type=(payload.type or "info").strip(),
    )
    return {"success": True, "notification_id": nid, "message": "Notification created successfully."}

@app.delete(
    "/api/notifications/{notification_id}",
    summary="Delete a notification",
)
def delete_notification_endpoint(
    notification_id: int,
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    deleted = notification_queries.delete_notification(shop_id, notification_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or already deleted.",
        )
    return {"success": True, "message": "Notification deleted permanently."}

@app.delete(
    "/api/notifications",
    summary="Clear all notifications for shop",
)
def clear_notifications_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    notification_queries.clear_all_notifications(shop_id)
    return {"success": True, "message": "All notifications cleared."}

@app.delete(
    "/api/account",
    summary="Permanently delete merchant account and send final transaction statement to email",
)
async def delete_account_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    user_id = int(current_shop["user_id"])
    shop_id = int(current_shop["shop_id"])

    user = user_queries.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    shop = shop_queries.get_shop_by_id(shop_id) or {"shop_name": current_shop.get("shop_name", "Meri Dukaan")}

    transactions = transaction_queries.get_transactions_by_shop(shop_id)
    financial_summary = transaction_queries.get_shop_financial_summary_in_db(shop_id)

    user_email = user.get("email") or current_shop.get("email")
    owner_name = user.get("name") or "Shop Owner"
    shop_name = shop.get("shop_name") or current_shop.get("shop_name") or "Your Store"

    if user_email and "@" in user_email:
        pdf_bytes = None
        try:
            from backend.services.pdf_generator import generate_final_shop_statement_pdf
            pdf_bytes = generate_final_shop_statement_pdf(
                shop_data=shop,
                user_data=user,
                transactions=transactions,
                summary_info=financial_summary,
            )
        except Exception as pdf_err:
            logger.warning("PDF generation skipped for account deletion email: %s", pdf_err)

        try:
            from backend.services.email_service import send_account_deletion_statement_email
            await asyncio.to_thread(
                send_account_deletion_statement_email,
                to_email=user_email,
                recipient_name=owner_name,
                shop_name=shop_name,
                transactions=transactions,
                summary_info=financial_summary,
                pdf_bytes=pdf_bytes,
            )
        except Exception as mail_err:
            logger.error("Failed to send account deletion statement email: %s", mail_err)

    success = user_queries.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account. Please try again.",
        )

    logger.info("Permanently deleted user %d (shop %d). Statement dispatched to %s", user_id, shop_id, user_email)

    return {
        "success": True,
        "message": "Account and all store data permanently deleted. A final transaction statement has been emailed to you.",
        "archived_transactions": len(transactions),
    }

@app.patch(
    "/api/notifications/{notification_id}/read",
    summary="Mark single notification as read",
)
def mark_single_read_endpoint(
    notification_id: int,
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    notification_queries.mark_notification_read(shop_id, notification_id)
    return {"success": True, "message": "Notification marked as read."}

@app.post(
    "/api/notifications/batch-read",
    summary="High-scale bulk mark notifications as read",
)
def batch_read_notifications_endpoint(
    request: Request,
    payload: NotificationBatchPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    clean_ids = list({int(nid) for nid in payload.notification_ids if isinstance(nid, int) and nid > 0})
    if clean_ids:
        notification_queries.batch_mark_read(shop_id, clean_ids)
    return {"success": True, "updated_count": len(clean_ids)}

@app.post(
    "/api/notifications/batch-dismiss",
    summary="High-scale bulk dismiss notifications",
)
def batch_dismiss_notifications_endpoint(
    request: Request,
    payload: NotificationBatchPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    clean_ids = list({int(nid) for nid in payload.notification_ids if isinstance(nid, int) and nid > 0})
    if clean_ids:
        notification_queries.batch_delete_notifications(shop_id, clean_ids)
    return {"success": True, "dismissed_count": len(clean_ids)}

@app.get("/api/status")
def api_status():
    grpc_server = get_grpc_server_manager()
    llm = get_llm_client()
    return {
        "app": "DukaanAI API",
        "status": "online",
        "voice_model": get_model_info(),
        "grpc_server_running": grpc_server.is_running,
        "groq_configured": llm.is_configured(),
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post(
    "/api/voice/transcribe",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe audio file using Cloud STT API",
)
async def transcribe_audio_endpoint(
    request: Request,
    file: UploadFile = File(..., description="Audio file to transcribe (e.g., .wav, .mp3)"),
    language: Optional[str] = Form(None, description="Language code for transcription (e.g. hi, or, ta, en)"),
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    user_id_str = str(current_shop["user_id"])
    enforce_rate_limit(request, category="transcribe", user_id=user_id_str)

    limiter = get_rate_limiter()
    concurrency_key = f"voice_concurrency:{user_id_str}"
    if not limiter.acquire_concurrency(concurrency_key, MAX_CONCURRENT_VOICE_PER_USER):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many concurrent voice transcriptions in progress. Maximum allowed: {MAX_CONCURRENT_VOICE_PER_USER}.",
        )

    if not file.filename:
        limiter.release_concurrency(concurrency_key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        limiter.release_concurrency(concurrency_key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}",
        )

    if file.content_type:
        raw_mime = file.content_type.split(";")[0].strip().lower()
        if raw_mime not in ALLOWED_AUDIO_MIME_TYPES:
            limiter.release_concurrency(concurrency_key)
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported audio MIME type '{file.content_type}'.",
            )

    temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    temp_path = Path(temp_file.name)

    try:
        total_bytes = 0
        limit_bytes = sec_config.MAX_AUDIO_UPLOAD_BYTES
        try:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > limit_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {limit_bytes // (1024*1024)} MB.",
                    )
                temp_file.write(chunk)
            temp_file.flush()
        finally:
            temp_file.close()

        if total_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded audio file is empty.",
            )

        try:
            target_path = temp_path
            if ext in (".m4a", ".aac", ".webm", ".ogg", ".mp3"):
                import subprocess
                converted_path = temp_path.with_suffix(".wav")
                try:
                    subprocess.run(
                        ["ffmpeg", "-y", "-i", str(temp_path), "-ar", "16000", "-ac", "1", str(converted_path)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        check=True,
                    )
                    target_path = converted_path
                except Exception as conv_err:
                    logger.warning("FFmpeg conversion fallback triggered: %s", conv_err)

            dur = get_audio_duration(target_path)
            if dur is not None and dur > MAX_AUDIO_DURATION_SEC:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Audio duration of {round(dur, 1)}s exceeds limit of {int(MAX_AUDIO_DURATION_SEC)}s.",
                )

            req_lang = (language or "").strip().lower()
            if req_lang in ("auto", "all", "", "null", "undefined"):
                effective_lang = None
            else:
                effective_lang = req_lang

            result = transcribe_audio(target_path, language=effective_lang)
            if target_path != temp_path and target_path.exists():
                try:
                    os.remove(target_path)
                except Exception:
                    pass
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Transcription execution error: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to process your voice request. Please try again.",
            ) from exc

        return TranscriptionResponse(
            success=True,
            transcribed_text=result.text,
            audio_duration_sec=result.audio_duration_sec,
            inference_time_sec=result.inference_time_sec,
            real_time_factor=result.real_time_factor,
            device=result.device,
        )

    finally:
        limiter.release_concurrency(concurrency_key)
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.warning("Failed to remove temporary file %s: %s", temp_path, e)

@app.post(
    "/api/voice/speak",
    status_code=status.HTTP_200_OK,
    summary="Generate speech from text using IndicF5 TTS",
)
async def speak_text_endpoint(
    request: Request,
    payload: SpeakPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="intent", user_id=str(current_shop["user_id"]))
    clean_text = (payload.text or "").strip()
    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty.",
        )
    if len(clean_text) > 280:
        clean_text = clean_text[:280]

    forbidden_terms = ["mysql", "postgresql", "sqlite", "database", "schema", "table", "fastapi", "uvicorn", "gunicorn", "backend", "architecture", "endpoint"]
    for term in forbidden_terms:
        if term in clean_text.lower():
            clean_text = clean_text.replace(term, "")

    try:
        from backend.models.tts import synthesize_speech
        out_file = await asyncio.to_thread(
            synthesize_speech,
            clean_text,
            voice=payload.voice or "Amit",
            lang=payload.lang or None,
        )
        return FileResponse(out_file, media_type="audio/wav", filename="speech.wav")
    except Exception as exc:
        logger.warning("TTS generation fallback: %s", exc)
        from backend.models.tts import generate_fallback_silence_wav
        fd, fallback_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        generate_fallback_silence_wav(fallback_path)
        return FileResponse(fallback_path, media_type="audio/wav", filename="speech.wav", headers={"X-TTS-Fallback": "browser"})

@app.get(
    "/api/voice/samples/{filename}",
    status_code=status.HTTP_200_OK,
    summary="Get generated audio sample for review",
)
async def get_audio_sample_endpoint(filename: str):
    allowed_samples = {"namaste.wav": "namaste.wav", "shubham_udhaar.wav": "shubham_udhaar.wav"}
    if filename not in allowed_samples:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio sample not found.")
    target_file = Path(allowed_samples[filename])
    if not target_file.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample file missing.")
    return FileResponse(str(target_file), media_type="audio/wav", filename=filename)

@app.post(
    "/api/ai/understand-intent",
    response_model=UnderstandIntentResponseModel,
    status_code=status.HTTP_200_OK,
    summary="Understand shopkeeper intent via gRPC LLM Service",
)
def understand_intent_endpoint(
    request: Request,
    payload: UnderstandIntentPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="intent", user_id=str(current_shop["user_id"]))
    clean_text = (payload.text or "").strip()
    silence_artifacts = {
        "", ".", "..", "...", "?", "!", "-", "--", "[silence]",
        "[music]", "[applause]", "thank you", "thank you.", "thank you very much.",
        "thanks", "thanks.", "subtitles by", "subtitles", "you", "you.",
        "null", "undefined", "bye", "goodbye", "amara.org", "mbc",
        "ha", "haan", "haan ji", "haanji", "hmm", "um", "uh", "ok", "okay", "so", "k", "yeah",
        "हाँ", "हाँ।", "हां", "हाँ जी", "हाँजी", "हो", "नमस्ते", "हेलो",
        "चलो", "ठीक है", "बाय", "शुक्रिया", "धन्यवाद", "धन्यवाद।", "जी", "जी हाँ", "जी हां"
    }
    if not clean_text or clean_text.lower() in silence_artifacts or len(clean_text) < 2 or not any(c.isalnum() for c in clean_text):
        return UnderstandIntentResponseModel(
            success=False,
            intent="none",
            action="none",
            parameters={},
            entities={},
            original_text=payload.text or "",
            normalized_text="",
            normalization={},
            confidence=0.0,
            requires_confirmation=False,
            clarification_needed=False,
            clarification_question=None,
            error_message="No voice activity detected",
        )

    try:
        verified_shop_id = current_shop["shop_id"]
        if os.getenv("VERCEL"):
            from backend.models.ai import GroqLLMClient
            llm = GroqLLMClient()
            contract = llm.understand_intent(
                text=payload.text,
                context=payload.context or None,
                shop_id=verified_shop_id,
            )
            return UnderstandIntentResponseModel(
                success=True,
                intent=contract.intent,
                action=contract.action,
                parameters=contract.parameters,
                entities=contract.entities,
                original_text=contract.original_text,
                normalized_text=contract.normalized_text,
                normalization=contract.normalization,
                confidence=float(contract.confidence),
                requires_confirmation=contract.requires_confirmation,
                clarification_needed=contract.clarification_needed,
                clarification_question=contract.clarification_question,
                error_message=None,
            )
        
        # Try local gRPC if available
        try:
            client = get_grpc_client()
            result = client.understand_intent(
                text=payload.text,
                context=payload.context or "",
                shop_id=verified_shop_id,
                timeout=5.0,
            )
            if result.get("success") and result.get("action") not in ("grpc_error", "service_unavailable", "none"):
                return UnderstandIntentResponseModel(**result)
        except Exception as grpc_err:
            logger.warning("Local gRPC unavailable, falling back to direct LLM pipeline: %s", grpc_err)

        # Resilient fallback to GroqLLMClient with local Kirana intent fallback
        from backend.models.ai import GroqLLMClient
        llm = GroqLLMClient()
        contract = llm.understand_intent(
            text=payload.text,
            context=payload.context or None,
            shop_id=verified_shop_id,
        )
        return UnderstandIntentResponseModel(
            success=contract.action not in ("none", "service_unavailable", "parse_error"),
            intent=contract.intent,
            action=contract.action,
            parameters=contract.parameters,
            entities=contract.entities,
            original_text=contract.original_text,
            normalized_text=contract.normalized_text,
            normalization=contract.normalization,
            confidence=float(contract.confidence),
            requires_confirmation=contract.requires_confirmation,
            clarification_needed=contract.clarification_needed,
            clarification_question=contract.clarification_question,
            error_message=None,
        )
    except Exception as exc:
        logger.error("Error in understand_intent_endpoint, falling back to resilient recording: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        try:
            from backend.models.ai import GroqLLMClient
            llm = GroqLLMClient()
            contract = llm._rule_based_fallback(clean_text, shop_id=current_shop.get("shop_id", 1))
            if contract:
                return UnderstandIntentResponseModel(
                    success=True,
                    intent=contract.intent,
                    action=contract.action,
                    parameters=contract.parameters,
                    entities=contract.entities,
                    original_text=contract.original_text,
                    normalized_text=contract.normalized_text,
                    normalization=contract.normalization,
                    confidence=float(contract.confidence),
                    requires_confirmation=contract.requires_confirmation,
                    clarification_needed=contract.clarification_needed,
                    clarification_question=contract.clarification_question,
                    error_message=None,
                )
        except Exception:
            pass
        return UnderstandIntentResponseModel(
            success=True,
            intent="credit_transaction",
            action="request_recorded_pending",
            parameters={"raw_instruction": clean_text, "shop_id": current_shop.get("shop_id", 1), "is_ai_busy": True},
            entities={},
            original_text=clean_text,
            normalized_text=clean_text,
            normalization={},
            confidence=0.9,
            requires_confirmation=False,
            clarification_needed=False,
            clarification_question=None,
            error_message=None,
        )

@app.post(
    "/api/action/execute",
    response_model=ActionExecutionResponseModel,
    status_code=status.HTTP_200_OK,
    summary="Execute validated business logic from intent data with idempotency",
)
def execute_action_endpoint(
    request: Request,
    payload: ExecuteActionPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="execute", user_id=str(current_shop["user_id"]))
    try:
        req_id = payload.request_id or str(uuid.uuid4())
        intent_copy = dict(payload.intent_data)
        intent_copy["shop_id"] = current_shop["shop_id"]
        if "parameters" in intent_copy and isinstance(intent_copy["parameters"], dict):
            intent_copy["parameters"]["shop_id"] = current_shop["shop_id"]
        
        res = IntentExecutor.execute(
            intent_copy,
            confirmed=payload.confirmed or False,
            request_id=req_id,
        )
        return ActionExecutionResponseModel(**res.to_dict())
    except Exception as exc:
        logger.error("Unexpected error in execute_action_endpoint: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service temporarily unavailable. Please try again later.",
        ) from exc

@app.get("/api/customers")
def get_customers_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    customers = customer_queries.get_customers_with_balances_by_shop(shop_id)
    return {"success": True, "data": customers}

@app.get("/api/stats")
def get_shop_stats_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    summary = transaction_queries.get_shop_financial_summary_in_db(current_shop["shop_id"])
    return {"success": True, "data": summary}

@app.get("/api/customers/{customer_id}/transactions")
def get_customer_transactions_endpoint(
    customer_id: int,
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    cust = customer_queries.get_customer_by_id(customer_id, shop_id=current_shop["shop_id"])
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")
    txs = transaction_queries.get_transactions_by_customer(current_shop["shop_id"], customer_id)
    return {"success": True, "data": txs}

@app.post("/api/customers")
def create_customer_endpoint(
    request: Request,
    payload: Dict[str, Any],
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="execute", user_id=str(current_shop["user_id"]))
    name = payload.get("name")
    if not name or not str(name).strip():
        raise HTTPException(status_code=400, detail="Customer name is required.")
    try:
        cust = CustomerService.add_customer(current_shop["shop_id"], str(name).strip(), payload.get("phone"))
        return {"success": True, "data": cust}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to create customer: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        raise HTTPException(status_code=400, detail="Unable to add customer. Please try again.") from exc

@app.get("/api/customers/{customer_id}/invoice.pdf")
def get_customer_invoice_pdf_endpoint(
    customer_id: int,
    request: Request,
    shop_id: Optional[int] = Query(None),
):
    target_shop_id = shop_id
    if not target_shop_id:
        auth_hdr = request.headers.get("Authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            try:
                payload = decode_access_token(auth_hdr.split(" ")[1])
                target_shop_id = payload.get("shop_id")
            except Exception:
                pass
    if not target_shop_id:
        target_shop_id = 1

    cust = customer_queries.get_customer_by_id(customer_id, shop_id=target_shop_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    sh_data = shop_queries.get_shop_by_id(target_shop_id) or {"shop_name": "Meri Dukaan"}
    bal_info = customer_queries.get_customer_balance_in_db(target_shop_id, customer_id) or {}
    txs = transaction_queries.get_transactions_by_customer(target_shop_id, customer_id)
    st_settings = settings_queries.get_settings_by_shop(target_shop_id)
    upi_id = st_settings.get("upi_id") if st_settings else None

    pdf_bytes = generate_customer_ledger_pdf(
        shop_data=sh_data,
        customer_data=cust,
        balance_info=bal_info,
        transactions=txs,
        store_upi_id=upi_id,
    )
    safe_name = cust.get("name", "customer").replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=khata_{safe_name}.pdf"},
    )

@app.get("/api/products")
def get_products_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    products = product_queries.get_products_by_shop(current_shop["shop_id"])
    return {"success": True, "data": products}

@app.post("/api/products")
def create_product_endpoint(
    request: Request,
    payload: Dict[str, Any],
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="execute", user_id=str(current_shop["user_id"]))
    name = payload.get("name")
    price = payload.get("price")
    if not name or price is None:
        raise HTTPException(status_code=400, detail="Product name and price are required.")
    try:
        prod = ProductService.add_product(
            current_shop["shop_id"],
            str(name).strip(),
            price,
            payload.get("unit"),
            payload.get("quantity", 0),
            payload.get("low_stock_limit", 5),
        )
        return {"success": True, "data": prod}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to create product: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        raise HTTPException(status_code=400, detail="Unable to add product. Please try again.") from exc

@app.post("/api/inventory/deduplicate")
def deduplicate_inventory_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="execute", user_id=str(current_shop["user_id"]))
    from backend.services.product_normalizer import merge_duplicate_products
    res = merge_duplicate_products(int(current_shop["shop_id"]))
    return {"success": True, "data": res}

@app.get("/api/transactions")
def get_transactions_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    txs = TransactionService.get_shop_transactions(current_shop["shop_id"])
    return {"success": True, "data": txs}

@app.get("/api/inventory")
def get_inventory_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    inv = InventoryService.get_stock(current_shop["shop_id"])
    return {"success": True, "data": inv}

@app.get("/api/suppliers")
def get_suppliers_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    sups = supplier_queries.get_suppliers_by_shop(current_shop["shop_id"])
    return {"success": True, "data": sups}

@app.post("/api/suppliers")
def create_supplier_endpoint(
    request: Request,
    payload: Dict[str, Any],
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="execute", user_id=str(current_shop["user_id"]))
    s_name = payload.get("name")
    if not s_name:
        raise HTTPException(status_code=400, detail="Supplier name is required.")
    try:
        s_id = supplier_queries.create_supplier(
            shop_id=current_shop["shop_id"],
            name=s_name,
            category=payload.get("category", "general"),
            phone=payload.get("phone"),
        )
        new_sup = supplier_queries.get_supplier_by_id(s_id, current_shop["shop_id"])
        return {"success": True, "data": new_sup}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to create supplier: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        raise HTTPException(status_code=400, detail="Unable to add supplier. Please try again.") from exc

@app.delete("/api/suppliers/{supplier_id}")
def delete_supplier_endpoint(
    supplier_id: int,
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="execute", user_id=str(current_shop["user_id"]))
    supplier_queries.delete_supplier(supplier_id, current_shop["shop_id"])
    return {"success": True, "message": "Supplier deleted successfully."}

@app.get("/api/market-price")
def get_market_price_endpoint(
    request: Request,
    product: str = Query(..., min_length=1, max_length=100),
    unit: Optional[str] = Query(None, max_length=20),
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    price_info = get_market_price(product, unit)
    return {"success": True, "data": price_info}

@app.get("/api/payments/qr-code")
def generate_qr_code_endpoint(
    request: Request,
    data: str = Query(..., min_length=1, max_length=1000, description="Payload or UPI URI to encode into QR code"),
):
    import io
    import qrcode

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )
