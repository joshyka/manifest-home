import sys
import os
from pathlib import Path

# Add project root so backend/ and utils/ are importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.main import app
