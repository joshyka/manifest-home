import sys
from pathlib import Path

# Project root is 3 levels up from frontend/api/index.py
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.main import app
