from bson import ObjectId
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.connection import Database
from app.database.models import PostUpdate
from app.services.ai_service import AIService
from app.routes.auth import get_current_user
import logging
from typing import List, Dict

logger = logging.getLogger("posts_route")

router = APIRouter(prefix="/api/posts", tags=["posts"])

def serialize_doc(doc) -> Dict:
    """Helper to convert MongoDB BSON document into JSON-serializable dictionary."""
    if not doc:
        return {}
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

@router.get("", response_model=List[Dict])
async def get_posts():
    """Retrieve all posts sorted by creation date (descending)."""
    posts_col = Database.get_posts_collection()
    if posts_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection is unavailable"
        )
    
    cursor = posts_col.find().sort("created_at", -1)
    results = await cursor.to_list(length=100)
    return [serialize_doc(doc) for doc in results]

@router.get("/{post_id}", response_model=Dict)
async def get_post(post_id: str):
    """Retrieve a single post by ID."""
    posts_col = Database.get_posts_collection()
    if posts_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection is unavailable"
        )
        
    try:
        doc = await posts_col.find_one({"_id": ObjectId(post_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Post not found")
        return serialize_doc(doc)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail="Invalid post ID format")

@router.put("/{post_id}", response_model=Dict)
async def update_post(post_id: str, post_update: PostUpdate):
    """Update post fields (title, content, tags, keywords, status, etc.)."""
    posts_col = Database.get_posts_collection()
    if posts_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection is unavailable"
        )

    # Filter out None fields from request
    update_data = {k: v for k, v in post_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    try:
        result = await posts_col.update_one(
            {"_id": ObjectId(post_id)}, 
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
            
        doc = await posts_col.find_one({"_id": ObjectId(post_id)})
        return serialize_doc(doc)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail="Invalid post ID or bad update payload")

@router.delete("/{post_id}")
async def delete_post(post_id: str):
    """Delete a post by ID."""
    posts_col = Database.get_posts_collection()
    if posts_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection is unavailable"
        )

    try:
        result = await posts_col.delete_one({"_id": ObjectId(post_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"status": "success", "message": "Post successfully deleted"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail="Invalid post ID format")

@router.post("/{post_id}/rewrite", response_model=Dict)
async def rewrite_post(post_id: str):
    """Triggers the AI Rewrite Agent on a post to update title and content using Gemini."""
    posts_col = Database.get_posts_collection()
    if posts_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection is unavailable"
        )

    try:
        # 1. Fetch current post
        doc = await posts_col.find_one({"_id": ObjectId(post_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Post not found")

        current_title = doc.get("title", "")
        current_content = doc.get("content", "")

        # 2. Call AI Service to edit/rewrite
        rewritten_data = await AIService.rewrite_post(current_title, current_content)

        # 3. Save rewritten details back to MongoDB
        await posts_col.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {
                "title": rewritten_data.get("title", current_title),
                "content": rewritten_data.get("content", current_content)
            }}
        )

        updated_doc = await posts_col.find_one({"_id": ObjectId(post_id)})
        return serialize_doc(updated_doc)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Rewrite failed: {str(e)}")

@router.delete("")
async def delete_all_posts():
    """Delete all posts in the collection."""
    posts_col = Database.get_posts_collection()
    if posts_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection is unavailable"
        )

    try:
        result = await posts_col.delete_many({})
        return {
            "status": "success",
            "message": f"Successfully deleted {result.deleted_count} posts"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete all posts: {str(e)}"
        )

@router.post("/{post_id}/publish/linkedin", response_model=Dict)
async def publish_post_to_linkedin(post_id: str, current_user: Dict = Depends(get_current_user)):
    """
    Publishes a post directly to LinkedIn feed using the user's stored OAuth credentials.
    """
    posts_col = Database.get_posts_collection()
    if posts_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection is unavailable"
        )
        
    # 1. Check if LinkedIn is connected for this user
    connected = current_user.get("linkedin_connected", False)
    access_token = current_user.get("linkedin_access_token")
    author_urn = current_user.get("linkedin_member_id")
    
    if not connected or not access_token or not author_urn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LinkedIn account is not connected. Please connect your LinkedIn account first."
        )
        
    # 2. Fetch post
    try:
        post = await posts_col.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
    except Exception:
         raise HTTPException(status_code=400, detail="Invalid post ID format")

    # 3. Publish to LinkedIn API v2
    import httpx
    linkedin_url = "https://api.linkedin.com/v2/posts"
    
    payload = {
        "author": author_urn,
        "commentary": post.get("content", ""),
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": []
        },
        "lifecycleState": "PUBLISHED"
    }
    
    headers = {
        "Authorization": f"Bearer {access_token.strip()}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(linkedin_url, json=payload, headers=headers)
            
            if response.status_code not in [200, 201]:
                logger.error(f"LinkedIn posting failed: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"LinkedIn API error: {response.text}"
                )
                
            # 4. Update status of post to published
            await posts_col.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": {"status": "published"}}
            )
            
            # Fetch updated post
            updated_doc = await posts_col.find_one({"_id": ObjectId(post_id)})
            return serialize_doc(updated_doc)
            
    except httpx.RequestError as e:
         raise HTTPException(
             status_code=status.HTTP_502_BAD_GATEWAY,
             detail=f"HTTP request to LinkedIn failed: {str(e)}"
         )

