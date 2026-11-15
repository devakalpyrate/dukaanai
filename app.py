import os
import sys
from pathlib import Path
import uvicorn

# Ensure repository root is in sys.path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

try:
    from app.main import app
except Exception:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse
    err_tb = traceback.format_exc()
    app = FastAPI()

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all(path_name: str = ""):
        return HTMLResponse(f"<h1>Startup Error on Vercel</h1><pre>{err_tb}</pre>", status_code=500)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    is_cloud = bool(os.getenv("VERCEL") or os.getenv("PORT"))
    host = "0.0.0.0" if is_cloud else "127.0.0.1"
    reload = False if is_cloud else True
    uvicorn.run("app:app", host=host, port=port, reload=reload)
