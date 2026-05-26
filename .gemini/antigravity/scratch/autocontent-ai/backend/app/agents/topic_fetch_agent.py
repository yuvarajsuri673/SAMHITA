import logging
from typing import List, Dict
from app.services.news_service import NewsService
from app.config import settings

logger = logging.getLogger("topic_fetch_agent")

class TopicFetchAgent:
    def __init__(self, feed_urls: List[str] = None):
        self.feed_urls = feed_urls or settings.rss_feed_list

    async def run(self) -> List[Dict]:
        """
        Runs the Topic Fetch Agent to gather raw topics.
        """
        logger.info("Topic Fetch Agent started running...")
        all_topics = []
        
        for url in self.feed_urls:
            # Fetch top 3 items from each feed to prevent bloating
            items = NewsService.fetch_rss_items(url, limit=3)
            for item in items:
                # Add source feed identifier
                item["source_feed"] = url
                all_topics.append(item)
                
        logger.info(f"Topic Fetch Agent completed. Found {len(all_topics)} raw topics.")
        return all_topics
