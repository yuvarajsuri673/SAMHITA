import logging
from typing import Dict
from app.agents.topic_fetch_agent import TopicFetchAgent
from app.agents.research_agent import ResearchAgent
from app.agents.content_generator_agent import ContentGeneratorAgent
from app.agents.publishing_agent import PublishingAgent
from app.database.connection import Database

logger = logging.getLogger("pipeline")

class ContentPipeline:
    def __init__(self, sector: str = None, limit: int = 2):
        """
        Orchestrates the agents in sequence. Supports dynamic sector categorization
        by mapping sectors to free RSS feeds.
        """
        # Mapping categories to standard free RSS Feeds
        sector_feeds = {
            "technology": [
                "https://techcrunch.com/feed/",
                "https://news.ycombinator.com/rss"
            ],
            "science": [
                "https://phys.org/rss-feed/",
                "https://www.nasa.gov/rss/dyn/breaking_news.rss"
            ],
            "business": [
                "https://www.cnbc.com/id/10001147/device/rss/rss.html",
                "https://feeds.feedburner.com/entrepreneur/latest"
            ],
            "health": [
                "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml",
                "https://www.medicinenet.com/rss/dailyhealth.xml"
            ],
            "movies": [
                "https://screenrant.com/feed/",
                "https://rss.imdb.com/news/ni/"
            ]
        }
        
        self.sector = sector.lower() if sector and sector.lower() in sector_feeds else "technology"
        feed_urls = None
        if sector and sector.lower() in sector_feeds:
            feed_urls = sector_feeds[sector.lower()]
            logger.info(f"Pipeline running for sector: {sector}. Feeds: {feed_urls}")
        else:
            logger.info("Pipeline running for default configured feeds.")
            
        self.limit = limit
        self.topic_fetcher = TopicFetchAgent(feed_urls=feed_urls)
        self.researcher = ResearchAgent()
        self.generator = ContentGeneratorAgent()
        self.publisher = PublishingAgent()

    async def run(self) -> Dict:
        """
        Orchestrates the agentic content creation pipeline.
        Returns execution statistics and list of generated posts.
        """
        logger.info("Initializing Content Pipeline Run...")
        
        # Step 1: Topic Fetch Agent
        topics = await self.topic_fetcher.run()
        if not topics:
            logger.info("No topics found. Terminating pipeline run.")
            return {
                "status": "success",
                "message": "No new topics found in RSS feeds.",
                "metrics": {"total_fetched": 0, "processed": 0, "created": 0, "skipped": 0, "failed": 0},
                "created_posts": []
            }

        posts_col = Database.get_posts_collection()
        
        processed_count = 0
        created_count = 0
        skipped_count = 0
        failed_count = 0
        new_posts = []

        # Limit to created posts per run based on configured limit
        max_creations = self.limit

        for topic in topics:
            if created_count >= max_creations:
                logger.info(f"Reached generation cap of {max_creations} articles. Stopping execution loop.")
                break

            source_url = topic.get("link", "")
            title = topic.get("title", "No Title")
            description = topic.get("description", "")

            # Check if this source link has already been processed and saved
            if posts_col is not None:
                existing = await posts_col.find_one({"source_url": source_url})
                if existing:
                    logger.info(f"Duplicate article skipped: {title} ({source_url})")
                    skipped_count += 1
                    continue

            processed_count += 1
            logger.info(f"Processing new topic: {title}")

            try:
                # Step 2: Research Agent
                research_text = await self.researcher.run(source_url, fallback_text=description)

                # Step 3: Content Generator Agent
                generated_blog = await self.generator.run(research_text, topic_title=title, sector=self.sector)

                # Ensure Title exists in generated content
                if not generated_blog.get("title") or generated_blog.get("title") == "Untitled Post":
                    generated_blog["title"] = f"AI Update: {title}"

                # Step 4: Publishing Agent
                pub_result = await self.publisher.run(generated_blog, source_url, sector=self.sector)

                if pub_result.get("status") == "success":
                    created_count += 1
                    new_posts.append({
                        "id": pub_result.get("id"),
                        "title": generated_blog.get("title"),
                        "summary": generated_blog.get("summary")
                    })
                else:
                    failed_count += 1
                    logger.error(f"Failed to publish post '{title}': {pub_result.get('message')}")
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed pipeline processing for item '{title}': {str(e)}")

        logger.info(f"Pipeline completed. Created {created_count} new posts, skipped {skipped_count} duplicates.")
        return {
            "status": "success",
            "metrics": {
                "total_fetched": len(topics),
                "processed": processed_count,
                "created": created_count,
                "skipped": skipped_count,
                "failed": failed_count
            },
            "created_posts": new_posts
        }
