import logging
import certifi
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger("database")

class LocalFallbackCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, key, direction=1):
        reverse = (direction == -1)
        def sort_key(doc):
            val = doc.get(key)
            if isinstance(val, datetime):
                return val.isoformat()
            if val is None:
                return ""
            return val
        try:
            self.docs = sorted(self.docs, key=sort_key, reverse=reverse)
        except Exception:
            pass
        return self

    async def to_list(self, length=100):
        return self.docs[:length]

class LocalFallbackCollection:
    def __init__(self, name):
        self.name = name
        # Place JSON database files in the workspace root (above backend/) to avoid uvicorn reloading loops
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        workspace_dir = os.path.dirname(backend_dir)
        self.filepath = os.path.join(workspace_dir, f"local_db_{name}.json")

    def _load(self):
        if not os.path.exists(self.filepath):
            return []
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Parse datetime strings back into datetime objects
                for doc in data:
                    for k, v in list(doc.items()):
                        if k in ("created_at", "expires_at") and isinstance(v, str):
                            try:
                                doc[k] = datetime.fromisoformat(v)
                            except:
                                pass
                return data
        except Exception:
            return []

    def _save(self, docs):
        try:
            serialized = []
            for doc in docs:
                s_doc = doc.copy()
                for k, v in s_doc.items():
                    if isinstance(v, datetime):
                        s_doc[k] = v.isoformat()
                    elif isinstance(v, ObjectId):
                        s_doc[k] = str(v)
                serialized.append(s_doc)
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(serialized, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving fallback database file {self.name}: {e}")

    def _matches(self, doc, filter_dict):
        if not filter_dict:
            return True
        for k, v in filter_dict.items():
            doc_val = doc.get(k)
            # Normalize IDs to string comparison
            if k == "_id":
                if str(doc_val) != str(v):
                    return False
            elif str(doc_val) != str(v):
                return False
        return True

    def find(self, filter_dict=None):
        docs = self._load()
        if filter_dict:
            matched = [d for d in docs if self._matches(d, filter_dict)]
        else:
            matched = docs
        return LocalFallbackCursor(matched)

    async def find_one(self, filter_dict):
        docs = self._load()
        for doc in docs:
            if self._matches(doc, filter_dict):
                return doc
        return None

    async def insert_one(self, doc):
        docs = self._load()
        if "_id" not in doc:
            doc["_id"] = str(ObjectId())
        elif isinstance(doc["_id"], ObjectId):
            doc["_id"] = str(doc["_id"])
            
        docs.append(doc)
        self._save(docs)
        
        class InsertOneResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertOneResult(doc["_id"])

    async def update_one(self, filter_dict, update_dict):
        docs = self._load()
        matched = False
        matched_count = 0
        
        set_data = update_dict.get("$set", {})
        for doc in docs:
            if self._matches(doc, filter_dict):
                matched = True
                matched_count = 1
                for k, v in set_data.items():
                    if k == "_id" and isinstance(v, ObjectId):
                        doc[k] = str(v)
                    else:
                        doc[k] = v
                break
                
        if matched:
            self._save(docs)
            
        class UpdateResult:
            def __init__(self, matched_count):
                self.matched_count = matched_count
        return UpdateResult(matched_count)

    async def delete_one(self, filter_dict):
        docs = self._load()
        deleted_count = 0
        for i, doc in enumerate(docs):
            if self._matches(doc, filter_dict):
                docs.pop(i)
                deleted_count = 1
                break
        if deleted_count > 0:
            self._save(docs)
            
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        return DeleteResult(deleted_count)

    async def delete_many(self, filter_dict=None):
        docs = self._load()
        if not filter_dict:
            deleted_count = len(docs)
            docs = []
        else:
            original_len = len(docs)
            docs = [d for d in docs if not self._matches(d, filter_dict)]
            deleted_count = original_len - len(docs)
            
        self._save(docs)
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        return DeleteResult(deleted_count)

    async def count_documents(self, filter_dict=None):
        docs = self._load()
        if filter_dict:
            return len([d for d in docs if self._matches(d, filter_dict)])
        return len(docs)

class LocalFallbackDatabase:
    def __getitem__(self, name):
        return LocalFallbackCollection(name)

class Database:
    client: AsyncIOMotorClient = None
    db = None
    use_fallback = False

    @classmethod
    async def connect_db(cls):
        """
        Pings the database during startup using a temporary client to verify config,
        and seeds a welcome post if the collection is empty.
        If it fails, automatically switches to a local file-based database store fallback.
        """
        try:
            temp_client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                tlsCAFile=certifi.where(),
                tlsAllowInvalidCertificates=True,
                serverSelectionTimeoutMS=3000
            )
            
            # Ping test
            await temp_client.admin.command('ping')
            logger.info("MongoDB connection ping successful. Using Atlas Cloud Database.")
            
            # Parse DB name from URI
            parts = settings.MONGODB_URI.split("/")
            db_name = "autocontent"
            if len(parts) > 3:
                last_part = parts[-1].split("?")[0]
                if last_part:
                    db_name = last_part
                    
            temp_db = temp_client[db_name]
            temp_col = temp_db["posts"]
            
            # Seeding check
            count = await temp_col.count_documents({})
            if count == 0:
                logger.info("Database posts collection is empty. Seeding initial welcome article...")
                await cls._seed_welcome(temp_col)
                
            temp_client.close()
        except Exception as e:
            logger.info("⚠️ MongoDB Atlas connection failed (restrictive network). Enabling local database fallback.")
            cls.use_fallback = True
            cls.db = LocalFallbackDatabase()
            
            # Seed local fallback if empty
            posts_col = cls.db["posts"]
            count = await posts_col.count_documents({})
            if count == 0:
                logger.info("Local database collection is empty. Seeding welcome article locally...")
                await cls._seed_welcome(posts_col)

    @classmethod
    def get_posts_collection(cls):
        """
        Retrieves the posts collection. Lazily connects to MongoDB if fallback is inactive.
        """
        if cls.use_fallback:
            return cls.db["posts"]

        if cls.client is None:
            try:
                logger.info("Initializing lazy MongoDB connection pool...")
                cls.client = AsyncIOMotorClient(
                    settings.MONGODB_URI,
                    tlsCAFile=certifi.where(),
                    tlsAllowInvalidCertificates=True
                )
                
                parts = settings.MONGODB_URI.split("/")
                db_name = "autocontent"
                if len(parts) > 3:
                    last_part = parts[-1].split("?")[0]
                    if last_part:
                        db_name = last_part
                cls.db = cls.client[db_name]
            except Exception as e:
                logger.error(f"Lazy MongoDB connection failed. Falling back to local JSON database: {str(e)}")
                cls.use_fallback = True
                cls.db = LocalFallbackDatabase()
                return cls.db["posts"]
                
        return cls.db["posts"]

    @classmethod
    async def disconnect_db(cls):
        """
        Closes the active MongoDB client connection if it is open.
        """
        if cls.client is not None:
            try:
                cls.client.close()
                logger.info("MongoDB connection closed.")
            except Exception as e:
                logger.error(f"Error closing MongoDB connection: {e}")
            finally:
                cls.client = None

    @classmethod
    async def _seed_welcome(cls, collection):
        welcome_post = {
            "title": "Introducing AutoContent AI: Automated Agent Workflows",
            "content": (
                "# The Era of AI-Driven Content Automation\n\n"
                "Welcome to **AutoContent AI**! This lightweight dashboard demonstrates a "
                "practical full-stack implementation of a sequential **Agentic AI Workflow**.\n\n"
                "### The Modular Agents:\n"
                "1. **Topic Fetch Agent**: Scans RSS feed sources dynamically to find new items.\n"
                "2. **Research Agent**: Fetches the webpage content, stripping HTML tags, scripts, and sidebar clutter.\n"
                "3. **Content Generator Agent**: Prompts the Gemini API using structured schemas to write the article, summary, and keywords.\n"
                "4. **Publishing Agent**: Saves the validated outputs directly into MongoDB Atlas.\n\n"
                "### Getting Started\n"
                "To test the automation, head over to the **Dashboard** and click **Run Content Pipeline**. "
                "The system will fetch real-world posts, write them in markdown formatting, and populate your feed in drafts status."
            ),
            "summary": "An introduction to the AutoContent AI system demonstrating how four custom AI agents automate content writing.",
            "source_url": "https://github.com/google-gemini",
            "tags": ["AI Agents", "FastAPI", "MongoDB"],
            "seo_keywords": ["content generator", "agentic workflow", "fastapi backend"],
            "social_caption": "Say hello to AutoContent AI! Powering content automation pipelines autonomously #AI #Innovation",
            "sector": "technology",
            "status": "published",
            "created_at": datetime.utcnow()
        }
        await collection.insert_one(welcome_post)
        logger.info("Seeding complete.")
