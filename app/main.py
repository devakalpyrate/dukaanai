import uuid
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import tempfile
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.authentication.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.grpc_service.server import close_grpc_resources, get_grpc_client, get_grpc_server_manager
from app.models.ai import get_llm_client
from app.models.voice import get_model_info, load_model, transcribe_audio
from app.queries import shops as shop_queries
from app.queries import user as user_queries
from app.services.intent_executor import IntentExecutor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("dukaanai")

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac", ".webm", ".weba"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DukaanAI Backend...")

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
    description="Backend API for DukaanAI Smart Shop Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/assistant")
def assistant_ui():
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
    email: str = Field(..., max_length=150)
    password: str = Field(..., min_length=6, max_length=128)
    shop_name: str = Field(..., min_length=2, max_length=100)

class LoginPayload(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    success: bool
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    shop_id: int
    shop_name: str

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_shop(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {exc}",
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
def register_endpoint(payload: RegisterPayload):
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
def login_endpoint(payload: LoginPayload):
    clean_email = payload.email.strip().lower()
    user = user_queries.get_user_credentials_by_email(clean_email)
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    
    user_id = user["id"]
    shops = shop_queries.get_shops_by_owner(user_id)
    if not shops:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shop found for this shopkeeper account.",
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
def get_current_user_profile(current_shop: Dict[str, Any] = Depends(get_current_shop)):
    user = user_queries.get_user_by_id(current_shop["user_id"])
    return {
        "success": True,
        "user": user,
        "shop": {
            "id": current_shop["shop_id"],
            "name": current_shop["shop_name"],
        },
    }

@app.get("/")
def root():
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
    file: UploadFile = File(..., description="Audio file to transcribe (e.g., .wav, .mp3)"),
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}",
        )

    temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    temp_path = Path(temp_file.name)

    try:
        total_bytes = 0
        while chunk := await file.read(1024 * 1024):
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
                )
            temp_file.write(chunk)
        temp_file.flush()
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
            result = transcribe_audio(target_path)
            if target_path != temp_path and target_path.exists():
                try:
                    os.remove(target_path)
                except Exception:
                    pass
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
    payload: UnderstandIntentPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process intent via gRPC service.",
        ) from exc

@app.post(
    "/api/action/execute",
    response_model=ActionExecutionResponseModel,
    status_code=status.HTTP_200_OK,
    summary="Execute validated business logic from intent data with idempotency",
)
def execute_action_endpoint(
    payload: ExecuteActionPayload,
    current_shop: Dict[str, Any] = Depends(get_current_shop),
):
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
