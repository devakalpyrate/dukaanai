import os
import sys
from pathlib import Path
import uvicorn

# Ensure repository root is in sys.path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.main import app as fastapi_app

app = fastapi_app

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    is_cloud = bool(os.getenv("VERCEL") or os.getenv("PORT"))
    host = "0.0.0.0" if is_cloud else "127.0.0.1"
    reload = False if is_cloud else True
    uvicorn.run("backend.main:app", host=host, port=port, reload=reload)
