import logging
from app.services.ai_service import AIService

logger = logging.getLogger("content_generator_agent")

class ContentGeneratorAgent:
    async def run(self, research_text: str, topic_title: str = None, sector: str = None) -> dict:
        """
        Generates blog article content, SEO keywords, tags, and caption using Gemini.
        """
        logger.info("Content Generator Agent running...")
        
        if not research_text or len(research_text.strip()) < 10:
            logger.warning("Very short research text provided. Generating blog from general prompt.")
            research_text = "Emerging technology trends, AI agents, and web automation software development."

        generated_data = await AIService.generate_blog_content(research_text, topic_title=topic_title, sector=sector)
        
        logger.info("Content Generator Agent completed generation successfully.")
        return generated_data
