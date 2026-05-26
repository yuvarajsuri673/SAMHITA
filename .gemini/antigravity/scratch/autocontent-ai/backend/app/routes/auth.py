from datetime import datetime, timedelta
import secrets
import hashlib
import os
import re
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Header, Depends
from app.database.connection import Database
from app.database.models import UserRegister, UserLogin, UserResponse, SessionResponse
from typing import Dict

router = APIRouter(prefix="/api/auth", tags=["auth"])

def hash_password(password: str) -> str:
    """Generates a random salt and hashes the password using PBKDF2-HMAC (SHA-256)."""
    salt = os.urandom(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}:{pwdhash.hex()}"

def verify_password(stored_password: str, provided_password: str) -> bool:
    """Verifies a password against the stored salt and PBKDF2 hash."""
    try:
        salt_hex, hash_hex = stored_password.split(":")
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        pwdhash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
        return pwdhash == expected_hash
    except Exception:
        return False

async def get_current_user(authorization: str = Header(None)) -> Dict:
    """FastAPI dependency to extract and validate the session token from headers."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is missing or invalid"
        )
    
    token = authorization.split(" ")[1]
    
    # Ensure lazy database client is initialized
    Database.get_posts_collection()
    db = Database.db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable"
        )

    session = await db["sessions"].find_one({"token": token})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or session has expired"
        )

    # Check expiry
    if session.get("expires_at") and isinstance(session["expires_at"], datetime):
        if session["expires_at"] < datetime.utcnow():
            await db["sessions"].delete_one({"token": token})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired"
            )

    user = await db["users"].find_one({"_id": ObjectId(session["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with session not found"
        )

    user["id"] = str(user["_id"])
    return user

@router.post("/register", response_model=UserResponse)
async def register(payload: UserRegister):
    """Registers a new user account."""
    username = payload.username.strip()
    email = payload.email.strip().lower()
    password = payload.password
    
    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Username, email and password are required")
        
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
    # Basic email regex validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    Database.get_posts_collection()
    db = Database.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is unavailable")

    # Check duplicate email
    existing_email = await db["users"].find_one({"email": email})
    if existing_email:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    # Check duplicate username
    existing_username = await db["users"].find_one({"username": username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username is already taken")

    # Create user
    user_doc = {
        "username": username,
        "email": email,
        "password": hash_password(password),
        "created_at": datetime.utcnow()
    }
    
    result = await db["users"].insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    return {
        "id": user_id,
        "username": username,
        "email": email,
        "created_at": user_doc["created_at"]
    }

@router.post("/login", response_model=SessionResponse)
async def login(payload: UserLogin):
    """Authenticates user credentials and returns a session token."""
    email = payload.email.strip().lower()
    password = payload.password

    Database.get_posts_collection()
    db = Database.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is unavailable")

    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not verify_password(user["password"], password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # Generate session token
    token = secrets.token_hex(32)
    session_doc = {
        "token": token,
        "user_id": str(user["_id"]),
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    }
    
    await db["sessions"].insert_one(session_doc)
    
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "created_at": user.get("created_at") or datetime.utcnow()
        }
    }

@router.post("/logout")
async def logout(authorization: str = Header(None)):
    """Revokes the current session token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Access token is missing or invalid")
    
    token = authorization.split(" ")[1]
    
    Database.get_posts_collection()
    db = Database.db
    if db is not None:
        await db["sessions"].delete_one({"token": token})
        
    return {"status": "success", "message": "Session successfully revoked"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Returns the current authenticated user's details."""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "created_at": current_user.get("created_at") or datetime.utcnow()
    }
