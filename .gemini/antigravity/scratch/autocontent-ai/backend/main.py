from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import Database
from app.routes import posts, agents, auth
from datetime import datetime
import logging

# Configure system logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("main")

app = FastAPI(
    title="SAMHITA AI API",
    description="Backend API for the lightweight SAMHITA AI automation system.",
    version="1.0.0"
)

# Enable CORS for student frontend localhost port 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for simplified local development
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(agents.router)

@app.on_event("startup")
async def startup_db_client():
    """Initializes the database connection and seeds initial post if database is empty."""
    await Database.connect_db()

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleans up DB connections on shutdown."""
    await Database.disconnect_db()

@app.get("/")
def read_root():
    """Service status checking endpoint."""
    return {
        "status": "healthy",
        "service": "SAMHITA AI API",
        "docs_url": "/docs"
    }
