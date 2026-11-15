import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

try:
    from backend.main import app
except Exception:
    try:
        from app import app
    except Exception as exc:
        import traceback
        from fastapi import FastAPI
        from fastapi.responses import HTMLResponse
        err_tb = traceback.format_exc()
        app = FastAPI()
        @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
        async def catch_all(path_name: str):
            return HTMLResponse(f"<h1>Startup Error on Vercel</h1><pre>{err_tb}</pre>", status_code=500)
