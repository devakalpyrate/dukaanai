from google .protobuf import descriptor as _descriptor
from google .protobuf import descriptor_pool as _descriptor_pool
from google .protobuf import runtime_version as _runtime_version
from google .protobuf import symbol_database as _symbol_database
from google .protobuf .internal import builder as _builder
_runtime_version .ValidateProtobufRuntimeVersion (
_runtime_version .Domain .PUBLIC ,
7 ,
35 ,
1 ,
'',
'intent.proto'
)

_sym_db =_symbol_database .Default ()

DESCRIPTOR =_descriptor_pool .Default ().AddSerializedFile (b'\n\x0cintent.proto\x12\x0c\x64ukaanai.llm\"I\n\x17UnderstandIntentRequest\x12\x0c\n\x04text\x18\x01 \x01(\t\x12\x0f\n\x07\x63ontext\x18\x02 \x01(\t\x12\x0f\n\x07shop_id\x18\x03 \x01(\x05\"\xef\x01\n\x18UnderstandIntentResponse\x12\x0f\n\x07success\x18\x01 \x01(\x08\x12\x0e\n\x06intent\x18\x02 \x01(\t\x12\x0e\n\x06\x61\x63tion\x18\x03 \x01(\t\x12\x17\n\x0fparameters_json\x18\x04 \x01(\t\x12\x15\n\rentities_json\x18\x05 \x01(\t\x12\x1d\n\x15requires_confirmation\x18\x06 \x01(\x08\x12\x1c\n\x14\x63larification_needed\x18\x07 \x01(\x08\x12\x1e\n\x16\x63larification_question\x18\x08 \x01(\t\x12\x15\n\rerror_message\x18\t \x01(\t2o\n\nLLMService\x12\x61\n\x10UnderstandIntent\x12%.dukaanai.llm.UnderstandIntentRequest\x1a&.dukaanai.llm.UnderstandIntentResponseb\x06proto3')

_globals =globals ()
_builder .BuildMessageAndEnumDescriptors (DESCRIPTOR ,_globals )
_builder .BuildTopDescriptorsAndMessages (DESCRIPTOR ,'intent_pb2',_globals )
if not _descriptor ._USE_C_DESCRIPTORS :
  DESCRIPTOR ._loaded_options =None
  _globals ['_UNDERSTANDINTENTREQUEST']._serialized_start =30
  _globals ['_UNDERSTANDINTENTREQUEST']._serialized_end =103
  _globals ['_UNDERSTANDINTENTRESPONSE']._serialized_start =106
  _globals ['_UNDERSTANDINTENTRESPONSE']._serialized_end =345
  _globals ['_LLMSERVICE']._serialized_start =347
  _globals ['_LLMSERVICE']._serialized_end =458
