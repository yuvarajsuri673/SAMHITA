import sys
import os

# Add the 'api' directory to the path so python can find 'app' package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
