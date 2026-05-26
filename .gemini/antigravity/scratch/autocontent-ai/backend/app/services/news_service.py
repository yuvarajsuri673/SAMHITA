import feedparser
import logging
from typing import List, Dict

logger = logging.getLogger("news_service")

class NewsService:
    @staticmethod
    def fetch_rss_items(feed_url: str, limit: int = 5) -> List[Dict]:
        """
        Fetch items from a single RSS feed URL.
        Returns a list of dicts with title, link, description, and published date.
        """
        try:
            logger.info(f"Fetching RSS feed from: {feed_url}")
            feed = feedparser.parse(feed_url)
            
            # Check parsing errors (bozo is set to 1 if the feed is XML-malformed, 
            # but we still want to read it if entries exist)
            if feed.bozo and not feed.entries:
                logger.warning(f"Failed to parse RSS feed or feed is empty: {feed_url}")
                return []

            items = []
            for entry in feed.entries[:limit]:
                items.append({
                    "title": entry.get("title", "No Title"),
                    "link": entry.get("link", ""),
                    "description": entry.get("summary", "") or entry.get("description", ""),
                    "published": entry.get("published", "") or entry.get("pubDate", "Unknown date")
                })
            
            logger.info(f"Successfully fetched {len(items)} items from feed: {feed_url}")
            return items
        except Exception as e:
            logger.error(f"Error while fetching RSS items from {feed_url}: {str(e)}")
            return []
