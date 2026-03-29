import sys
from pathlib import Path

# Project root is 1 level up from api/index.py
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.main import app
