import time
import torch
from transformers import AutoModel

MODEL_ID ="ARTPARK-IISc/SraVaani-1.0"
AUDIO_PATH ="recording_test.wav"

device ="cuda"if torch .cuda .is_available ()else "cpu"

print ("Device:",device )

start =time .perf_counter ()

model =AutoModel .from_pretrained (
MODEL_ID ,
trust_remote_code =True ,
local_files_only =True
).to (device ).eval ()

if device =="cuda":
    torch .cuda .synchronize ()

print ("Model loading:",round (time .perf_counter ()-start ,2 ),"sec")

start =time .perf_counter ()

with torch .inference_mode ():
    result =model .transcribe (
    AUDIO_PATH ,
    return_hypotheses =True
    )

if device =="cuda":
    torch .cuda .synchronize ()

inference_time =time .perf_counter ()-start

print ("\nTranscription:",result [0 ].text )
print ("Inference time:",round (inference_time ,2 ),"sec")
print ("Audio duration: 13.08 sec")
print ("Real-time factor:",round (inference_time /13.08 ,3 ))
