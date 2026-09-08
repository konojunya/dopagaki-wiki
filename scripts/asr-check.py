"""Optional independent local transcription; no audio is sent to a service."""
import json, sys
import mlx_whisper
result = mlx_whisper.transcribe(sys.argv[1], path_or_hf_repo='mlx-community/whisper-small-mlx', language='ja', condition_on_previous_text=False, verbose=False)
with open(sys.argv[2], 'w') as f:
    json.dump({'model':'mlx-community/whisper-small-mlx','text':result['text'],'segments':[{k:s[k] for k in ('start','end','text')} for s in result['segments']]},f,ensure_ascii=False,indent=2)
print('Saved',sys.argv[2])
