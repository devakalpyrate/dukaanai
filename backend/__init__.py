"""DukaanAI backend application package."""
import sys

from backend.main import app

# Backwards compatibility alias for any remaining 'app' module imports
sys.modules["app"] = sys.modules[__name__]

__all__ = ["app"]
