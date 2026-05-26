import httpx
from bs4 import BeautifulSoup
import logging
import asyncio

logger = logging.getLogger("research_agent")

class ResearchAgent:
    def __init__(self):
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/114.0.0.0 Safari/537.36"
            )
        }

    async def run(self, url: str, fallback_text: str = "") -> str:
        """
        Scrapes raw article text from a URL. If scraping fails, returns the fallback description.
        """
        if not url:
            logger.warning("Empty URL provided to Research Agent, utilizing fallback text.")
            return fallback_text

        logger.info(f"Research Agent starting research on URL: {url}")
        
        try:
            # Fetch webpage html with httpx (with timeout)
            async with httpx.AsyncClient(follow_redirects=True, headers=self.headers, timeout=10.0) as client:
                response = await client.get(url)
                
            if response.status_code != 200:
                logger.warning(f"Scraper returned status code {response.status_code}. Using fallback.")
                return self._clean_fallback(fallback_text)

            # Parse html using BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Remove script, style, head, nav, footer, iframe elements
            for element in soup(["script", "style", "head", "header", "footer", "nav", "aside", "iframe"]):
                element.decompose()
                
            # Extract paragraphs text
            paragraphs = soup.find_all("p")
            text_blocks = [p.get_text().strip() for p in paragraphs if p.get_text().strip()]
            cleaned_text = "\n\n".join(text_blocks)
            
            # If the scraped text is very short, it probably failed or hit a cookie wall
            if len(cleaned_text) < 200:
                logger.warning("Scraped content is too short or blocked. Reverting to fallback description.")
                return self._clean_fallback(fallback_text)
                
            logger.info(f"Research Agent scraped successfully. Extracted {len(cleaned_text)} characters.")
            return cleaned_text[:3000]  # Limit to 3000 chars to avoid overloading Gemini free-tier tokens
            
        except Exception as e:
            logger.error(f"Error during scraping research: {str(e)}. Reverting to fallback.")
            return self._clean_fallback(fallback_text)

    def _clean_fallback(self, text: str) -> str:
        # Strip HTML tags from RSS description if any
        if not text:
            return "No source text description available."
        soup = BeautifulSoup(text, "html.parser")
        return soup.get_text().strip()
