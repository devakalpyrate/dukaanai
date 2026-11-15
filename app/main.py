import random
import time
import uuid
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import tempfile
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.authentication.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.grpc_service.server import close_grpc_resources, get_grpc_client, get_grpc_server_manager
from app.models.ai import get_llm_client
from app.models.voice import get_model_info, load_model, transcribe_audio
from app.queries import customer as customer_queries
from app.queries import notification as notification_queries
from app.queries import product as product_queries
from app.queries import settings as settings_queries
from app.queries import shops as shop_queries
from app.queries import supplier as supplier_queries
from app.queries import transaction as transaction_queries
from app.queries import user as user_queries
from app.services.business_logic import CustomerService, InventoryService, ProductService, TransactionService
from app.services.intent_executor import IntentExecutor
from app.services.pdf_generator import generate_customer_ledger_pdf
from app.services.price_discovery import get_market_price
from app.services.email_service import mask_email, send_otp_email

from app.security import config as sec_config
from app.security.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    ALLOWED_AUDIO_MIME_TYPES,
    CORS_ALLOWED_ORIGINS,
    MAX_AUDIO_DURATION_SEC,
    MAX_CONCURRENT_VOICE_PER_USER,
)
from app.security.dependencies import enforce_rate_limit
from app.security.exceptions import (
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.security.logger import StructuredLogFormatter
from app.security.middleware import SecurityHeadersMiddleware
from app.security.rate_limiter import get_rate_limiter

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

    grpc_server = get_grpc_server_manager()
    try:
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
    close_grpc_resources()
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
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

static_dir = Path(__file__).resolve().parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
assets_dir = static_dir / "assets"
assets_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

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
        return FileResponse(ui_file)
    return {"message": "DukaanAI Voice Assistant UI"}

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

class SpeakPayload(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Text to synthesize to speech")

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
    if not shop or shop["owner_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized shop access.",
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

    import random
    code = f"{random.randint(100000, 999999)}"
    now = time.time()
    ACTIVE_OTPS[clean_phone] = {"code": code, "email": target_email, "created_at": now}
    digits = "".join(c for c in clean_phone if c.isdigit())
    if len(digits) >= 10:
        ACTIVE_OTPS[digits[-10:]] = {"code": code, "email": target_email, "created_at": now}
    if target_email:
        ACTIVE_OTPS[target_email] = {"code": code, "phone": clean_phone, "created_at": now}

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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to log in. Check your credentials and try again.",
        )
    
    if payload.password:
        if not verify_password(payload.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to log in. Check your credentials and try again.",
            )

    if not payload.otp:
        if not payload.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password or OTP is required to log in.",
            )
        import random
        code = f"{random.randint(100000, 999999)}"
        now = time.time()
        user_email = (user.get("email") or "").lower()
        user_phone = user.get("phone") or ""
        if user_email:
            ACTIVE_OTPS[user_email] = {"code": code, "phone": user_phone, "created_at": now}
        if user_phone:
            ACTIVE_OTPS[user_phone] = {"code": code, "email": user_email, "created_at": now}
        digits = "".join(c for c in user_phone if c.isdigit())
        if len(digits) >= 10:
            ACTIVE_OTPS[digits[-10:]] = {"code": code, "email": user_email, "created_at": now}
        ACTIVE_OTPS[clean_identifier] = {"code": code, "email": user_email, "created_at": now}
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

    submitted_otp = payload.otp.strip()
    matched = False
    user_phone = user.get("phone") or ""
    user_email = (user.get("email") or "").lower()
    digits = "".join(c for c in user_phone if c.isdigit())
    last10 = digits[-10:] if len(digits) >= 10 else digits
    if user_phone and ACTIVE_OTPS.get(user_phone) and ACTIVE_OTPS[user_phone]["code"] == submitted_otp:
        matched = True
    elif last10 and ACTIVE_OTPS.get(last10) and ACTIVE_OTPS[last10]["code"] == submitted_otp:
        matched = True
    elif user_email and ACTIVE_OTPS.get(user_email) and ACTIVE_OTPS[user_email]["code"] == submitted_otp:
        matched = True
    elif ACTIVE_OTPS.get(raw_identifier) and ACTIVE_OTPS[raw_identifier]["code"] == submitted_otp:
        matched = True
    if not matched:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
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

            import soundfile as sf
            try:
                snd_info = sf.info(str(target_path))
                if snd_info.duration > MAX_AUDIO_DURATION_SEC:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Audio duration of {round(snd_info.duration, 1)}s exceeds limit of {int(MAX_AUDIO_DURATION_SEC)}s.",
                    )
            except HTTPException:
                raise
            except Exception as meta_err:
                logger.warning("Soundfile audio duration pre-check: %s", meta_err)

            result = transcribe_audio(target_path)
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
    clean_text = payload.text.strip()
    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty.",
        )
    if len(clean_text) > 300:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text exceeds maximum store speech confirmation limit of 300 characters.",
        )
    forbidden_terms = ["mysql", "postgresql", "sqlite", "database", "schema", "table", "fastapi", "uvicorn", "gunicorn", "backend", "architecture", "endpoint"]
    for term in forbidden_terms:
        if term in clean_text.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Store speech content cannot contain internal system or technical architecture terms.",
            )
    try:
        from app.models.tts import synthesize_speech
        out_file = synthesize_speech(clean_text)
        return FileResponse(out_file, media_type="audio/wav", filename="speech.wav")
    except Exception as exc:
        logger.error("TTS generation error: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process your voice request. Please try again.",
        ) from exc

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
    client = get_grpc_client()
    try:
        verified_shop_id = current_shop["shop_id"]
        result = client.understand_intent(
            text=payload.text,
            context=payload.context or "",
            shop_id=verified_shop_id,
            timeout=25.0,
        )
        return UnderstandIntentResponseModel(**result)
    except Exception as exc:
        logger.error("Unhandled error calling gRPC client: %s", exc, exc_info=True, extra={"correlation_id": getattr(request.state, "correlation_id", None)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable. Please try again later.",
        ) from exc

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
