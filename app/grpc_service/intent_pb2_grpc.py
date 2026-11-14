import grpc
import warnings

try :
    from app .grpc_service import intent_pb2 as intent__pb2
except ImportError :
    import intent_pb2 as intent__pb2

GRPC_GENERATED_VERSION ='1.85.1'
GRPC_VERSION =grpc .__version__
_version_not_supported =False

try :
    from grpc ._utilities import first_version_is_lower
    _version_not_supported =first_version_is_lower (GRPC_VERSION ,GRPC_GENERATED_VERSION )
except ImportError :
    _version_not_supported =True

if _version_not_supported :
    raise RuntimeError (
    f'The grpc package installed is at version {GRPC_VERSION},'
    +' but the generated code in intent_pb2_grpc.py depends on'
    +f' grpcio>={GRPC_GENERATED_VERSION}.'
    +f' Please upgrade your grpc module to grpcio>={GRPC_GENERATED_VERSION}'
    +f' or downgrade your generated code using grpcio-tools<={GRPC_VERSION}.'
    )

class LLMServiceStub :

    def __init__ (self ,channel ):

        self .UnderstandIntent =channel .unary_unary (
        '/dukaanai.llm.LLMService/UnderstandIntent',
        request_serializer =intent__pb2 .UnderstandIntentRequest .SerializeToString ,
        response_deserializer =intent__pb2 .UnderstandIntentResponse .FromString ,
        _registered_method =True )

class LLMServiceServicer :

    def UnderstandIntent (self ,request ,context ):

        context .set_code (grpc .StatusCode .UNIMPLEMENTED )
        context .set_details ('Method not implemented!')
        raise NotImplementedError ('Method not implemented!')

def add_LLMServiceServicer_to_server (servicer ,server ):
    rpc_method_handlers ={
    'UnderstandIntent':grpc .unary_unary_rpc_method_handler (
    servicer .UnderstandIntent ,
    request_deserializer =intent__pb2 .UnderstandIntentRequest .FromString ,
    response_serializer =intent__pb2 .UnderstandIntentResponse .SerializeToString ,
    ),
    }
    generic_handler =grpc .method_handlers_generic_handler (
    'dukaanai.llm.LLMService',rpc_method_handlers )
    server .add_generic_rpc_handlers ((generic_handler ,))
    server .add_registered_method_handlers ('dukaanai.llm.LLMService',rpc_method_handlers )

class LLMService :

    @staticmethod
    def UnderstandIntent (request ,
    target ,
    options =(),
    channel_credentials =None ,
    call_credentials =None ,
    insecure =False ,
    compression =None ,
    wait_for_ready =None ,
    timeout =None ,
    metadata =None ):
        return grpc .experimental .unary_unary (
        request ,
        target ,
        '/dukaanai.llm.LLMService/UnderstandIntent',
        intent__pb2 .UnderstandIntentRequest .SerializeToString ,
        intent__pb2 .UnderstandIntentResponse .FromString ,
        options ,
        channel_credentials ,
        insecure ,
        call_credentials ,
        compression ,
        wait_for_ready ,
        timeout ,
        metadata ,
        _registered_method =True )
