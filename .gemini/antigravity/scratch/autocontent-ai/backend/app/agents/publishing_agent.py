from datetime import datetime
import logging
from app.database.connection import Database
from app.database.models import PostCreate

logger = logging.getLogger("publishing_agent")

class PublishingAgent:
    async def run(self, post_data: dict, source_url: str, sector: str = "technology") -> dict:
        """
        Validates post data and inserts it into MongoDB.
        """
        logger.info(f"Publishing Agent started running for sector '{sector}'...")
        
        posts_col = Database.get_posts_collection()
        if posts_col is None:
            err_msg = "Database not initialized. Cannot publish post."
            logger.error(err_msg)
            return {"status": "error", "message": err_msg}

        try:
            # Create a Post model to validate parameters
            post = PostCreate(
                title=post_data.get("title", "Untitled Post"),
                content=post_data.get("content", "No content generated."),
                summary=post_data.get("summary", "No summary generated."),
                source_url=source_url,
                tags=post_data.get("tags", []),
                seo_keywords=post_data.get("seo_keywords", []),
                social_caption=post_data.get("social_caption", ""),
                sector=sector,
                status="draft",
                created_at=datetime.utcnow()
            )
            
            # Save to MongoDB
            post_dict = post.model_dump()
            result = await posts_col.insert_one(post_dict)
            post_id = str(result.inserted_id)
            
            logger.info(f"Publishing Agent successfully saved post to database. ID: {post_id}")
            return {"status": "success", "id": post_id, "post": post_dict}
        except Exception as e:
            logger.error(f"Error during database save: {str(e)}")
            return {"status": "error", "message": str(e)}
