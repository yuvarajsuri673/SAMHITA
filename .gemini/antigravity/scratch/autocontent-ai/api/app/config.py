import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load env variables from backend directory .env file if it exists
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017/autocontent"
    GEMINI_API_KEY: str = ""
    # Defaults to a comma-separated list of feeds
    RSS_FEEDS: str = "https://techcrunch.com/feed/,https://news.ycombinator.com/rss"
    PORT: int = 8000

    # LinkedIn OAuth
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    LINKEDIN_REDIRECT_URI: str = ""

    @property
    def rss_feed_list(self) -> list[str]:
        return [url.strip() for url in self.RSS_FEEDS.split(",") if url.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
