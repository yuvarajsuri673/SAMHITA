from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, BeforeValidator
from typing_extensions import Annotated

# Validator to map MongoDB ObjectId to string
PyObjectId = Annotated[str, BeforeValidator(str)]

class PostBase(BaseModel):
    title: str
    content: str
    summary: str
    source_url: str
    tags: List[str] = Field(default_factory=list)
    seo_keywords: List[str] = Field(default_factory=list)
    social_caption: str
    sector: str = "technology"  # E.g. technology, science, business, health, movies
    status: str = "draft"  # "draft" or "published"
    likes: int = 0
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    seo_keywords: Optional[List[str]] = None
    social_caption: Optional[str] = None
    sector: Optional[str] = None
    status: Optional[str] = None
    likes: Optional[int] = None
    views: Optional[int] = None

class PostResponse(PostBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "60c72b2f9b1d8b2a1c8b4567",
                "title": "Unlocking the Power of Agentic AI Workflow",
                "content": "Full article content in markdown format...",
                "summary": "A brief overview of how agentic AI systems collaborate...",
                "source_url": "https://techcrunch.com/article",
                "tags": ["AI", "Tech", "Automation"],
                "seo_keywords": ["agentic ai", "generative ai", "workflow automation"],
                "social_caption": "Check out this article on Agentic AI! #AI #Tech",
                "status": "draft",
                "created_at": "2026-05-25T12:00:00"
            }
        }
        arbitrary_types_allowed = True

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime

class SessionResponse(BaseModel):
    token: str
    user: UserResponse
