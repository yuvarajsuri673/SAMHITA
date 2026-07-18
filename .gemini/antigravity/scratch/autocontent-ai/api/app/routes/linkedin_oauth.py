from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import RedirectResponse
from app.config import settings
from app.database.connection import Database
from app.routes.auth import get_current_user
import httpx
import logging
from datetime import datetime
from bson import ObjectId
from typing import Dict

logger = logging.getLogger("linkedin_oauth")
router = APIRouter(prefix="/api/auth/linkedin", tags=["linkedin"])

@router.get("/login")
async def linkedin_login(token: str = Query(...)):
    """
    Generates the LinkedIn OAuth authorization URL.
    We pass the session token as the 'state' parameter so we can identify
    the user when LinkedIn redirects back to our callback endpoint.
    """
    client_id = settings.LINKEDIN_CLIENT_ID.strip() if settings.LINKEDIN_CLIENT_ID else ""
    redirect_uri = settings.LINKEDIN_REDIRECT_URI.strip() if settings.LINKEDIN_REDIRECT_URI else ""
    
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="LinkedIn Client ID not configured on server"
        )
        
    scope = "openid profile email w_member_social"
    auth_url = (
        "https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&state={token}"
        f"&scope={scope}"
    )
    return {"url": auth_url}

@router.get("/callback")
async def linkedin_callback(code: str = None, state: str = None, error: str = None, error_description: str = None):
    """
    Callback endpoint called by LinkedIn after user authorization.
    Exchanges the auth code for an access token, fetches profile userinfo,
    saves the tokens under the user session user_id in MongoDB, and redirects back to dashboard.
    """
    if error:
        logger.error(f"LinkedIn authorization error: {error} - {error_description}")
        return RedirectResponse(url="https://autocontent-ai-mu.vercel.app/assistant?linkedin_error=auth_denied")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing required code or state parameters")

    Database.get_posts_collection()
    db = Database.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is unavailable")

    # The state parameter is the session token of the user
    session = await db["sessions"].find_one({"token": state})
    if not session:
         return RedirectResponse(url="https://autocontent-ai-mu.vercel.app/assistant?linkedin_error=invalid_session")

    user_id = session["user_id"]

    try:
        # 1. Exchange code for access token
        client_id = settings.LINKEDIN_CLIENT_ID.strip() if settings.LINKEDIN_CLIENT_ID else ""
        client_secret = settings.LINKEDIN_CLIENT_SECRET.strip() if settings.LINKEDIN_CLIENT_SECRET else ""
        redirect_uri = settings.LINKEDIN_REDIRECT_URI.strip() if settings.LINKEDIN_REDIRECT_URI else ""
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": client_id,
                    "client_secret": client_secret
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if token_response.status_code != 200:
                logger.error(f"Failed to fetch LinkedIn access token: {token_response.text}")
                return RedirectResponse(url="https://autocontent-ai-mu.vercel.app/assistant?linkedin_error=token_exchange_failed")
                
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            # 2. Fetch UserInfo (Member URN ID)
            userinfo_response = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if userinfo_response.status_code != 200:
                logger.error(f"Failed to fetch LinkedIn user info: {userinfo_response.text}")
                return RedirectResponse(url="https://autocontent-ai-mu.vercel.app/assistant?linkedin_error=profile_fetch_failed")
                
            userinfo = userinfo_response.json()
            sub = userinfo.get("sub") # This is the unique LinkedIn person identifier
            name = userinfo.get("name", "LinkedIn User")
            
            # 3. Store LinkedIn credentials in user document
            await db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "linkedin_connected": True,
                    "linkedin_access_token": access_token,
                    "linkedin_member_id": f"urn:li:person:{sub}",
                    "linkedin_name": name,
                    "linkedin_connected_at": datetime.utcnow() if "datetime" in globals() else None
                }}
            )
            
            logger.info(f"Successfully linked LinkedIn account for user {user_id}. Name: {name}")
            return RedirectResponse(url="https://autocontent-ai-mu.vercel.app/assistant?linkedin_success=true")
            
    except Exception as e:
        logger.error(f"Error during LinkedIn OAuth process: {str(e)}")
        return RedirectResponse(url="https://autocontent-ai-mu.vercel.app/assistant?linkedin_error=internal_error")

@router.get("/status")
async def get_linkedin_status(current_user: Dict = Depends(get_current_user)):
    """
    Returns the connection status of the user's LinkedIn profile.
    """
    return {
        "connected": current_user.get("linkedin_connected", False),
        "name": current_user.get("linkedin_name", "")
    }

@router.post("/disconnect")
async def disconnect_linkedin(current_user: Dict = Depends(get_current_user)):
    """
    Unlinks the LinkedIn profile from the user account.
    """
    Database.get_posts_collection()
    db = Database.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is unavailable")
        
    await db["users"].update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "linkedin_connected": False,
            "linkedin_access_token": None,
            "linkedin_member_id": None,
            "linkedin_name": None
        }}
    )
    return {"status": "success", "message": "LinkedIn disconnected successfully"}
