from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import tempfile
from typing import Any ,Dict ,Optional

from fastapi import FastAPI ,File ,HTTPException ,UploadFile ,status
from fastapi .middleware .cors import CORSMiddleware
from pydantic import BaseModel ,Field

from app .grpc_service .server import close_grpc_resources ,get_grpc_client ,get_grpc_server_manager
from app .models .ai import get_llm_client
from app .models .voice import get_model_info ,load_model ,transcribe_audio

logging .basicConfig (
level =logging .INFO ,
format ="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger =logging .getLogger ("dukaanai")

ALLOWED_AUDIO_EXTENSIONS ={".wav",".mp3",".ogg",".flac",".m4a",".aac"}
MAX_FILE_SIZE_BYTES =50 *1024 *1024

@asynccontextmanager
async def lifespan (app :FastAPI ):

    logger .info ("Starting DukaanAI Backend...")

    grpc_server =get_grpc_server_manager ()
    try :
        grpc_server .start ()
    except Exception as exc :
        logger .error ("Failed to start gRPC LLM Service: %s",exc )

    try :
        load_model ()
        logger .info ("Voice STT model warmed up successfully.")
    except Exception as exc :
        logger .error ("Error pre-warming STT model on startup: %s",exc )

    yield

    logger .info ("Shutting down DukaanAI Backend & gRPC services...")
    close_grpc_resources ()
    logger .info ("DukaanAI Backend shutdown completed.")

app =FastAPI (
title ="DukaanAI API",
description ="Backend API for DukaanAI Smart Shop Assistant",
version ="1.0.0",
lifespan =lifespan ,
)

app .add_middleware (
CORSMiddleware ,
allow_origins =["*"],
allow_credentials =True ,
allow_methods =["*"],
allow_headers =["*"],
)

class TranscriptionResponse (BaseModel ):
    success :bool
    transcribed_text :str
    audio_duration_sec :float |None =None
    inference_time_sec :float
    real_time_factor :float |None =None
    device :str

class UnderstandIntentPayload (BaseModel ):
    text :str =Field (...,description ="Recognized speech text or manual shopkeeper instruction")
    context :Optional [str ]=Field (default ="",description ="Previous dialogue context or history")
    shop_id :Optional [int ]=Field (default =1 ,description ="Active shop identifier")

class UnderstandIntentResponseModel (BaseModel ):
    success :bool
    intent :str
    action :str
    parameters :Dict [str ,Any ]=Field (default_factory =dict )
    entities :Dict [str ,Any ]=Field (default_factory =dict )
    requires_confirmation :bool =False
    clarification_needed :bool =False
    clarification_question :Optional [str ]=None
    error_message :Optional [str ]=None

@app .get ("/")
def root ():
    grpc_server =get_grpc_server_manager ()
    llm =get_llm_client ()
    return {
    "app":"DukaanAI API",
    "status":"online",
    "voice_model":get_model_info (),
    "grpc_server_running":grpc_server .is_running ,
    "groq_configured":llm .is_configured (),
    }

@app .get ("/health")
def health_check ():
    return {"status":"ok"}

@app .post (
"/api/voice/transcribe",
response_model =TranscriptionResponse ,
status_code =status .HTTP_200_OK ,
summary ="Transcribe audio file using SraVaani STT",
)
async def transcribe_audio_endpoint (
file :UploadFile =File (...,description ="Audio file to transcribe (e.g., .wav, .mp3)")
):
    if not file .filename :
        raise HTTPException (
        status_code =status .HTTP_400_BAD_REQUEST ,
        detail ="Uploaded file must have a valid filename.",
        )

    ext =Path (file .filename ).suffix .lower ()
    if ext not in ALLOWED_AUDIO_EXTENSIONS :
        raise HTTPException (
        status_code =status .HTTP_400_BAD_REQUEST ,
        detail =f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}",
        )

    temp_file =tempfile .NamedTemporaryFile (suffix =ext ,delete =False )
    temp_path =Path (temp_file .name )

    try :
        total_bytes =0
        while chunk :=await file .read (1024 *1024 ):
            total_bytes +=len (chunk )
            if total_bytes >MAX_FILE_SIZE_BYTES :
                raise HTTPException (
                status_code =status .HTTP_413_REQUEST_ENTITY_TOO_LARGE ,
                detail =f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
                )
            temp_file .write (chunk )
        temp_file .flush ()
        temp_file .close ()

        if total_bytes ==0 :
            raise HTTPException (
            status_code =status .HTTP_400_BAD_REQUEST ,
            detail ="Uploaded audio file is empty.",
            )

        try :
            result =transcribe_audio (temp_path )
        except Exception as exc :
            logger .error ("Transcription execution error: %s",exc )
            raise HTTPException (
            status_code =status .HTTP_500_INTERNAL_SERVER_ERROR ,
            detail ="Failed to transcribe audio. Please verify the audio file format.",
            )from exc

        return TranscriptionResponse (
        success =True ,
        transcribed_text =result .text ,
        audio_duration_sec =result .audio_duration_sec ,
        inference_time_sec =result .inference_time_sec ,
        real_time_factor =result .real_time_factor ,
        device =result .device ,
        )

    finally :
        if temp_path .exists ():
            try :
                os .remove (temp_path )
            except Exception as e :
                logger .warning ("Failed to remove temporary file %s: %s",temp_path ,e )

@app .post (
"/api/ai/understand-intent",
response_model =UnderstandIntentResponseModel ,
status_code =status .HTTP_200_OK ,
summary ="Understand shopkeeper intent via gRPC LLM Service",
)
def understand_intent_endpoint (payload :UnderstandIntentPayload ):

    client =get_grpc_client ()
    try :
        result =client .understand_intent (
        text =payload .text ,
        context =payload .context or "",
        shop_id =payload .shop_id or 1 ,
        timeout =25.0 ,
        )
        return UnderstandIntentResponseModel (**result )
    except Exception as exc :
        logger .error ("Unhandled error calling gRPC client: %s",exc )
        raise HTTPException (
        status_code =status .HTTP_500_INTERNAL_SERVER_ERROR ,
        detail ="Failed to process intent via gRPC service.",
        )from exc
