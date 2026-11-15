import os
import sys
import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    is_cloud = bool(os.getenv("VERCEL") or os.getenv("PORT"))
    host = "0.0.0.0" if is_cloud else "127.0.0.1"
    reload = False if is_cloud else True
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
