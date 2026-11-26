import sys

from backend.main import app

sys.modules["app"] = sys.modules[__name__]

__all__ = ["app"]
