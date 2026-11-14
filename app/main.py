import uuid
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import tempfile
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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
from app.queries import product as product_queries
from app.queries import shops as shop_queries
from app.queries import transaction as transaction_queries
from app.queries import user as user_queries
from app.services.business_logic import CustomerService, InventoryService, ProductService, TransactionService
from app.services.intent_executor import IntentExecutor

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
    lifespan=lifespan,
    docs_url=None if os.getenv("ENVIRONMENT") == "production" else "/docs",
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
def serve_ui():
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

class LoginPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=1, max_length=128)

class AuthResponse(BaseModel):
    success: bool
    access_token: str
    user_id: int
    name: str
    email: str
    shop_id: int
    shop_name: str

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
    "/api/auth/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Shop Owner and store",
)
def register_endpoint(request: Request, payload: RegisterPayload):
    enforce_rate_limit(request, category="login")
    clean_email = payload.email.strip().lower()
    existing = user_queries.get_user_by_email(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered. Please log in.",
        )
    
    hashed_pwd = hash_password(payload.password)
    user_id = user_queries.create_user(
        name=payload.name.strip(),
        email=clean_email,
        password_hash=hashed_pwd,
    )
    
    shop_id = shop_queries.create_shop(
        owner_id=user_id,
        shop_name=payload.shop_name.strip(),
    )
    
    token = create_access_token({
        "sub": user_id,
        "shop_id": shop_id,
        "email": clean_email,
    })
    
    return AuthResponse(
        success=True,
        access_token=token,
        user_id=user_id,
        name=payload.name.strip(),
        email=clean_email,
        shop_id=shop_id,
        shop_name=payload.shop_name.strip(),
    )

@app.post(
    "/api/auth/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in as a Shop Owner",
)
def login_endpoint(request: Request, payload: LoginPayload):
    clean_email = payload.email.strip().lower()
    enforce_rate_limit(request, category="login", user_id=clean_email)
    
    user = user_queries.get_user_credentials_by_email(clean_email)
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    
    user_id = user["id"]
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
        "email": clean_email,
    })
    
    return AuthResponse(
        success=True,
        access_token=token,
        user_id=user_id,
        name=user["name"],
        email=clean_email,
        shop_id=primary_shop["id"],
        shop_name=primary_shop["shop_name"],
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
    return {
        "success": True,
        "user": user,
        "shop": {
            "id": current_shop["shop_id"],
            "name": current_shop["shop_name"],
        },
    }

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
    summary="Transcribe audio file using SraVaani STT",
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
            logger.error("Transcription execution error: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to transcribe audio. Please verify the audio file format.",
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
        logger.error("Unhandled error calling gRPC client: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Intent understanding service is temporarily unavailable. Please retry in a moment.",
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
        logger.error("Unexpected error in execute_action_endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Business logic execution failed.",
        ) from exc

@app.get("/api/customers")
def get_customers_endpoint(
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    shop_id = current_shop["shop_id"]
    customers = customer_queries.get_customers_by_shop(shop_id)
    txs = transaction_queries.get_transactions_by_shop(shop_id)
    tx_by_cust: Dict[int, Dict[str, Any]] = {}
    for t in txs:
        cid = t.get("customer_id")
        if cid not in tx_by_cust:
            tx_by_cust[cid] = {"total_credit": 0.0, "total_paid": 0.0, "count": 0, "last_tx": None}
        amt = float(t.get("amount") or 0.0)
        ttype = t.get("type")
        if ttype == "credit":
            tx_by_cust[cid]["total_credit"] += amt
        elif ttype == "payment":
            tx_by_cust[cid]["total_paid"] += amt
        tx_by_cust[cid]["count"] += 1
        if not tx_by_cust[cid]["last_tx"]:
            tx_by_cust[cid]["last_tx"] = str(t.get("created_at") or "")

    enriched = []
    for c in customers:
        cid = c["id"]
        agg = tx_by_cust.get(cid, {"total_credit": 0.0, "total_paid": 0.0, "count": 0, "last_tx": None})
        c_dict = dict(c)
        c_dict["total_credit"] = round(agg["total_credit"], 2)
        c_dict["total_paid"] = round(agg["total_paid"], 2)
        c_dict["balance"] = round(agg["total_credit"] - agg["total_paid"], 2)
        c_dict["transaction_count"] = agg["count"]
        c_dict["last_transaction"] = agg["last_tx"] or "Recently registered"
        enriched.append(c_dict)
    return {"success": True, "data": enriched}

@app.get("/api/customers/{customer_id}/transactions")
def get_customer_transactions_endpoint(
    customer_id: int,
    request: Request,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    enforce_rate_limit(request, category="lookup", user_id=str(current_shop["user_id"]))
    cust = customer_queries.get_customer_by_id(customer_id)
    if not cust or cust["shop_id"] != current_shop["shop_id"]:
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
    if not name:
        raise HTTPException(status_code=400, detail="Customer name is required.")
    cust = CustomerService.add_customer(current_shop["shop_id"], name, payload.get("phone"))
    return {"success": True, "data": cust}

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
    prod = ProductService.add_product(current_shop["shop_id"], name, price, payload.get("unit"))
    return {"success": True, "data": prod}

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
