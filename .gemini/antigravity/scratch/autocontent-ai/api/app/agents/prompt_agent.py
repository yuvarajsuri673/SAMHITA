import google.generativeai as genai
from app.config import settings
from app.agents.research_agent import ResearchAgent
from app.agents.publishing_agent import PublishingAgent
import json
import logging
import asyncio
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger("prompt_agent")

class PromptAgent:
    def __init__(self):
        self.researcher = ResearchAgent()
        self.publisher = PublishingAgent()
        self._configured = False

    def _configure(self):
        if not self._configured:
            api_key = settings.GEMINI_API_KEY
            if api_key and api_key != "YOUR_GEMINI_API_KEY_HERE" and len(api_key) > 10:
                try:
                    genai.configure(api_key=api_key)
                    self._configured = True
                    logger.info("PromptAgent: Gemini API successfully configured.")
                except Exception as e:
                    logger.error(f"PromptAgent: Failed to configure Gemini: {e}")
                    self._configured = False
            else:
                logger.warning("PromptAgent: Gemini API key not set. Using mock fallback.")
                self._configured = False

    async def run(self, user_prompt: str) -> dict:
        self._configure()
        
        # Fallback to mock if Gemini is not configured
        if not self._configured:
            logger.info("PromptAgent: Running in mock mode due to unconfigured API key.")
            await asyncio.sleep(1) # Simulate API latency
            mock_res = self._mock_run(user_prompt)
            # Attempt to save mock to MongoDB
            pub_result = await self.publisher.run(mock_res["post"], source_url="Mock User Prompt", sector="general")
            if pub_result.get("status") == "success":
                mock_res["post_id"] = pub_result.get("id")
                mock_res["post"] = pub_result.get("post")
            return mock_res

        try:
            # Step 1: Parse the user prompt intent using Gemini
            parsed = await self._parse_intent(user_prompt)
            logger.info(f"PromptAgent: Parsed intent: {parsed}")
            
            # Step 2: Research (scrape URL if provided)
            scraped_context = ""
            url = parsed.get("url", "")
            if url:
                try:
                    scraped_context = await self.researcher.run(url)
                except Exception as e:
                    logger.error(f"PromptAgent: Scraping failed for URL '{url}': {e}")
            
            # Step 3: Generate the tailored post content
            generated_post = await self._generate_post(parsed, scraped_context)
            
            # Step 4: Publish to MongoDB
            source_url = url if url else "User Prompt"
            pub_result = await self.publisher.run(generated_post, source_url=source_url, sector="general")
            
            if pub_result.get("status") == "success":
                return {
                    "status": "success",
                    "intent": parsed,
                    "post_id": pub_result.get("id"),
                    "post": pub_result.get("post")
                }
            else:
                return {
                    "status": "partial_success",
                    "intent": parsed,
                    "post": generated_post,
                    "message": f"Content generated successfully but failed to write to database: {pub_result.get('message')}"
                }
                
        except Exception as e:
            logger.error(f"PromptAgent: Error during prompt execution: {str(e)}")
            # Fallback to mock if API fails
            mock_res = self._mock_run(user_prompt)
            pub_result = await self.publisher.run(mock_res["post"], source_url="User Prompt Fallback", sector="general")
            if pub_result.get("status") == "success":
                mock_res["post_id"] = pub_result.get("id")
                mock_res["post"] = pub_result.get("post")
            return mock_res

    async def _parse_intent(self, user_prompt: str) -> dict:
        prompt_parser_prompt = f"""
        You are an AI assistant parsing a user's instruction.
        The user wants to write a social media post.
        
        User Prompt: "{user_prompt}"
        
        Parse this instruction and return a JSON object with:
        1. "topic": the main topic or subject of the post (e.g. "memoryOS")
        2. "url": any URL explicitly mentioned in the prompt (return empty string "" if none)
        3. "platform": the target social media platform (strictly one of: "linkedin", "twitter", "instagram", or "general")
        4. "instructions": any special formatting/writing instructions (e.g. "with key points", "make it informal", etc.)
        
        Return ONLY the raw JSON string. Do not wrap in ```json or ``` markdown blocks.
        """
        def call_gemini():
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt_parser_prompt)
            return response.text

        response_text = await run_in_threadpool(call_gemini)
        response_text = self._clean_json_response(response_text)
        return json.loads(response_text)

    async def _generate_post(self, parsed: dict, scraped_context: str) -> dict:
        generation_prompt = f"""
        You are an expert social media manager.
        The user wants to write a post on the topic: "{parsed.get('topic')}" for the platform: "{parsed.get('platform')}".
        Special instructions: "{parsed.get('instructions')}".
        
        Scraped Source Context (if any):
        {scraped_context}
        
        Generate a high-quality post tailored to the platform:
        - "linkedin": Professional, formatted with line breaks, paragraphs, key points/bullet points if requested, and 3 relevant hashtags at the bottom.
        - "twitter": Extremely concise, engaging, fits within 280 characters, and 1-2 hashtags.
        - "instagram": Creative hook, engaging description, paragraph breaks, and a block of 5-8 relevant hashtags.
        - "general": A standard engaging blog post format.
        
        Return the response STRICTLY as a raw JSON object with the following schema:
        {{
            "title": "A short catchy title for this post",
            "content": "The actual post content to be shared/posted",
            "summary": "A 1-2 sentence summary of this post",
            "tags": ["tag1", "tag2"],
            "seo_keywords": ["keyword1", "keyword2"],
            "social_caption": "An alternate short social teaser caption"
        }}
        Return ONLY the raw JSON string. Do not wrap in ```json or ``` markdown blocks.
        """
        def call_gemini():
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(generation_prompt)
            return response.text

        response_text = await run_in_threadpool(call_gemini)
        response_text = self._clean_json_response(response_text)
        return json.loads(response_text)

    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    def _mock_run(self, user_prompt: str) -> dict:
        words = user_prompt.lower().split()
        platform = "general"
        if "linkedin" in words:
            platform = "linkedin"
        elif "twitter" in words or "x" in words:
            platform = "twitter"
        elif "instagram" in words:
            platform = "instagram"
            
        topic = "Trending Topic"
        # Simple extraction logic for mock topic
        for prep in ["on", "about"]:
            if prep in words:
                idx = words.index(prep)
                if idx + 1 < len(words):
                    topic = " ".join(words[idx+1:idx+3]).strip(",.?! ")
                    break
                    
        # Grab any URL in prompt
        url = ""
        for word in words:
            if word.startswith(("http://", "https://", "www.")):
                url = word
                break

        if platform == "linkedin":
            content = f"### Key Insights on {topic.capitalize()}\n\nI recently analyzed the trends surrounding {topic} and here are the top key points:\n\n1. **High Efficiency**: Streamlined operations are now standard.\n2. **AI-Driven Growth**: Leveraging agentic workflows is vital.\n3. **Modern UI/UX**: User responsiveness drives engagement.\n\nWhat are your thoughts on this? Let's discuss!\n\n#Learning #{topic.replace(' ', '')} #Innovation"
        elif platform == "twitter":
            content = f"Exploring the latest trends in #{topic.replace(' ', '')}! The impact of modern agentic automation and AI is transforming how we operate. High efficiency & zero friction. What do you think? 🚀💡"
        elif platform == "instagram":
            content = f"✨ Deep Dive into {topic.capitalize()} ✨\n\nAre you ready for the next wave of AI automation? We are looking at streamlined workflows, AI-driven content generation, and sleek responsive panels.\n\n👉 Follow us for more tech insights!\n\n#Tech #{topic.replace(' ', '')} #Workflow #AI #Innovation #Design"
        else:
            content = f"Here is a brief review of {topic.capitalize()}. It represents a significant shift towards modular systems, automation, and user-centered design. By building custom pipelines, teams can scale rapidly."

        post = {
            "title": f"Review: {topic.capitalize()}",
            "content": content,
            "summary": f"A mock review of {topic.capitalize()} for {platform}.",
            "tags": ["AI", "Innovation", platform.capitalize()],
            "seo_keywords": [topic, "tech trends"],
            "social_caption": f"My thoughts on {topic.capitalize()}!"
        }
        
        return {
            "status": "success",
            "intent": {"topic": topic, "url": url, "platform": platform, "instructions": "mock fallback"},
            "post_id": "mock_id",
            "post": post
        }
