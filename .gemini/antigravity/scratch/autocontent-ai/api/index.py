import sys
import os

# Get absolute path of project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Append backend folder to python path
sys.path.append(os.path.join(project_root, "backend"))

from backend.main import app
