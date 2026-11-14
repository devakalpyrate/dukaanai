from concurrent import futures
import json
import logging
import os
import threading
from typing import Optional

import grpc

from app .grpc_service import intent_pb2 ,intent_pb2_grpc
from app .models .ai import GroqLLMClient ,StructuredIntent ,get_llm_client

logger =logging .getLogger (__name__ )

DEFAULT_GRPC_PORT =50051

class LLMServiceServicer (intent_pb2_grpc .LLMServiceServicer ):

    def __init__ (self ,llm_client :Optional [GroqLLMClient ]=None ):
        self .llm_client =llm_client or get_llm_client ()

    def UnderstandIntent (self ,request ,context ):
        try :
            shop_id =request .shop_id if request .shop_id >0 else None
            structured :StructuredIntent =self .llm_client .understand_intent (
            text =request .text ,
            context =request .context or None ,
            shop_id =shop_id ,
            )
            return intent_pb2 .UnderstandIntentResponse (
            success =True ,
            intent =structured .intent ,
            action =structured .action ,
            parameters_json =json .dumps (structured .parameters ,ensure_ascii =False ),
            entities_json =json .dumps (structured .entities ,ensure_ascii =False ),
            requires_confirmation =structured .requires_confirmation ,
            clarification_needed =structured .clarification_needed ,
            clarification_question =structured .clarification_question or "",
            error_message ="",
            )
        except ValueError as exc :

            logger .warning ("Groq configuration error in gRPC service: %s",exc )
            return intent_pb2 .UnderstandIntentResponse (
            success =False ,
            intent ="unknown",
            action ="unconfigured",
            parameters_json ="{}",
            entities_json ="{}",
            requires_confirmation =False ,
            clarification_needed =True ,
            clarification_question ="AI service is not configured with an active API key.",
            error_message ="LLM service unconfigured",
            )
        except Exception as exc :

            logger .error ("Internal error in gRPC UnderstandIntent: %s",exc )
            return intent_pb2 .UnderstandIntentResponse (
            success =False ,
            intent ="unknown",
            action ="error",
            parameters_json ="{}",
            entities_json ="{}",
            requires_confirmation =False ,
            clarification_needed =True ,
            clarification_question ="AI seva me samasya aayi hai, kripya dobara prayas karein.",
            error_message ="Internal LLM processing error",
            )

class DukaanAIGrpcServerManager :

    def __init__ (self ,port :int =DEFAULT_GRPC_PORT ,llm_client :Optional [GroqLLMClient ]=None ):
        self .port =port
        self .llm_client =llm_client
        self ._server :Optional [grpc .Server ]=None
        self ._lock =threading .Lock ()
        self ._is_running =False

    def start (self )->None :
        with self ._lock :
            if self ._is_running and self ._server :
                return

            self ._server =grpc .server (futures .ThreadPoolExecutor (max_workers =5 ))
            intent_pb2_grpc .add_LLMServiceServicer_to_server (
            LLMServiceServicer (llm_client =self .llm_client ),
            self ._server ,
            )
            self ._server .add_insecure_port (f"127.0.0.1:{self.port}")
            self ._server .start ()
            self ._is_running =True
            logger .info ("gRPC LLM Server started on port %d",self .port )

    def stop (self ,grace :float =2.0 )->None :
        with self ._lock :
            if not self ._is_running or not self ._server :
                return

            logger .info ("Stopping gRPC LLM Server...")
            stopped_event =self ._server .stop (grace =grace )
            stopped_event .wait (timeout =grace +1.0 )
            self ._server =None
            self ._is_running =False
            logger .info ("gRPC LLM Server stopped cleanly.")

    @property
    def is_running (self )->bool :
        return self ._is_running

class LLMGrpcClient :

    def __init__ (self ,target :str =f"127.0.0.1:{DEFAULT_GRPC_PORT}"):
        self .target =target
        self .channel =grpc .insecure_channel (target )
        self .stub =intent_pb2_grpc .LLMServiceStub (self .channel )

    def understand_intent (self ,text :str ,context :str ="",shop_id :int =1 ,timeout :float =25.0 )->dict :
        req =intent_pb2 .UnderstandIntentRequest (
        text =text ,
        context =context ,
        shop_id =shop_id ,
        )
        try :
            res :intent_pb2 .UnderstandIntentResponse =self .stub .UnderstandIntent (req ,timeout =timeout )
            return {
            "success":res .success ,
            "intent":res .intent ,
            "action":res .action ,
            "parameters":json .loads (res .parameters_json or "{}"),
            "entities":json .loads (res .entities_json or "{}"),
            "requires_confirmation":res .requires_confirmation ,
            "clarification_needed":res .clarification_needed ,
            "clarification_question":res .clarification_question if res .clarification_needed else None ,
            "error_message":res .error_message if not res .success else None ,
            }
        except grpc .RpcError as exc :
            code =exc .code ()
            logger .warning ("gRPC RPC error (%s): %s",code ,exc .details ())
            return {
            "success":False ,
            "intent":"unknown",
            "action":"grpc_error",
            "parameters":{},
            "entities":{},
            "requires_confirmation":False ,
            "clarification_needed":True ,
            "clarification_question":"gRPC communication failed or timed out.",
            "error_message":f"gRPC call failed with status: {code.name if hasattr(code, 'name') else str(code)}",
            }

    def close (self ):
        try :
            self .channel .close ()
        except Exception :
            pass

_server_manager :Optional [DukaanAIGrpcServerManager ]=None
_client_instance :Optional [LLMGrpcClient ]=None
_lifecycle_lock =threading .Lock ()

def get_grpc_server_manager (port :int =DEFAULT_GRPC_PORT )->DukaanAIGrpcServerManager :
    global _server_manager
    with _lifecycle_lock :
        if _server_manager is None :
            _server_manager =DukaanAIGrpcServerManager (port =port )
        return _server_manager

def get_grpc_client (target :str =f"127.0.0.1:{DEFAULT_GRPC_PORT}")->LLMGrpcClient :
    global _client_instance
    with _lifecycle_lock :
        if _client_instance is None :
            _client_instance =LLMGrpcClient (target =target )
        return _client_instance

def close_grpc_resources ():
    global _server_manager ,_client_instance
    with _lifecycle_lock :
        if _client_instance is not None :
            _client_instance .close ()
            _client_instance =None
        if _server_manager is not None :
            _server_manager .stop ()
            _server_manager =None
