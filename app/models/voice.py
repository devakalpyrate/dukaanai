from dataclasses import dataclass
import logging
import os
from pathlib import Path
import threading
import time
from typing import Any

import soundfile as sf
import torch
from transformers import AutoModel

logger =logging .getLogger (__name__ )

MODEL_ID :str ="ARTPARK-IISc/SraVaani-1.0"

_model :Any =None
_device :str |None =None
_load_time_sec :float |None =None
_model_lock =threading .Lock ()

@dataclass
class TranscriptionResult :
    text :str
    inference_time_sec :float
    audio_duration_sec :float |None =None
    real_time_factor :float |None =None
    device :str ="unknown"

def get_device ()->str :

    return "cuda"if torch .cuda .is_available ()else "cpu"

def load_model (model_id :str =MODEL_ID )->Any :

    global _model ,_device ,_load_time_sec

    if _model is not None :
        return _model

    with _model_lock :
        if _model is not None :
            return _model

        _device =get_device ()
        logger .info ("Initializing SraVaani STT model on %s...",_device )

        start_time =time .perf_counter ()
        try :
            loaded_model =AutoModel .from_pretrained (
            model_id ,
            trust_remote_code =True ,
            local_files_only =True ,
            ).to (_device ).eval ()

            if _device =="cuda":
                torch .cuda .synchronize ()

            _load_time_sec =round (time .perf_counter ()-start_time ,2 )
            _model =loaded_model
            logger .info ("SraVaani model loaded successfully in %.2f seconds.",_load_time_sec )
            return _model

        except Exception as exc :
            logger .error ("Failed to load SraVaani model from local cache: %s",exc )
            raise RuntimeError (
            f"Failed to load SraVaani model '{model_id}' from local cache: {exc}"
            )from exc

def get_model_info ()->dict [str ,Any ]:

    return {
    "model_id":MODEL_ID ,
    "is_loaded":_model is not None ,
    "device":_device ,
    "load_time_sec":_load_time_sec ,
    }

def transcribe_audio (audio_path :str |Path )->TranscriptionResult :

    path =Path (audio_path )
    if not path .is_file ():
        raise FileNotFoundError (f"Audio file not found: {path.resolve()}")

    try :
        info =sf .info (str (path ))
        audio_duration =float (info .duration )
    except Exception as exc :
        logger .warning ("Could not read audio metadata for %s: %s",path ,exc )
        audio_duration =None

    model =load_model ()
    device =_device or get_device ()

    start_time =time .perf_counter ()
    try :
        with torch .inference_mode ():
            result =model .transcribe (str (path ),return_hypotheses =True )

        if device =="cuda":
            torch .cuda .synchronize ()

        inference_time =time .perf_counter ()-start_time

        if not result or len (result )==0 :
            recognized_text =""
        else :
            hypo =result [0 ]
            recognized_text =getattr (hypo ,"text",str (hypo ))

        rtf =(
        round (inference_time /audio_duration ,3 )
        if audio_duration and audio_duration >0
        else None
        )

        return TranscriptionResult (
        text =recognized_text .strip (),
        inference_time_sec =round (inference_time ,3 ),
        audio_duration_sec =round (audio_duration ,2 )if audio_duration else None ,
        real_time_factor =rtf ,
        device =device ,
        )

    except Exception as exc :
        logger .error ("Transcription failed for audio %s: %s",path ,exc )
        raise RuntimeError (f"Transcription failed for '{path}': {exc}")from exc

if __name__ =="__main__":
    import sys

    target_audio =sys .argv [1 ]if len (sys .argv )>1 else "recording_test.wav"
    print (f"Testing DukaanAI Voice STT Module with '{target_audio}'...")

    try :
        res =transcribe_audio (target_audio )
        print ("\n--- Transcription Result ---")
        print (f"Device:            {res.device}")
        print (f"Text:              {res.text}")
        print (f"Audio Duration:    {res.audio_duration_sec} sec")
        print (f"Inference Time:    {res.inference_time_sec} sec")
        print (f"Real-Time Factor:  {res.real_time_factor}")
    except Exception as e :
        print (f"Error: {e}")
        sys .exit (1 )
