import os
import sys
import subprocess

venv_py = os.path.join(os.path.dirname(__file__), ".venv-voice", "Scripts", "python.exe")
if os.path.exists(venv_py) and os.path.normcase(sys.executable) != os.path.normcase(venv_py):
    ret = subprocess.run([venv_py] + sys.argv)
    sys.exit(ret.returncode)

import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=True)
