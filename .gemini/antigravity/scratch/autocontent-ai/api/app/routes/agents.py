from fastapi import APIRouter, HTTPException, status
from app.agents.pipeline import ContentPipeline
import logging

from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("agents_route")
router = APIRouter(prefix="/api/agents", tags=["agents"])

class RunPipelineRequest(BaseModel):
    sector: Optional[str] = None
    limit: Optional[int] = 2

@router.post("/run")
async def run_pipeline(request: Optional[RunPipelineRequest] = None):
    """
    Triggers the content generation pipeline.
    This fetches RSS feeds, scrapes articles, generates blog content via Gemini, and saves them.
    Supports an optional 'sector' parameter and a 'limit' parameter in the JSON payload.
    """
    sector = request.sector if request else None
    limit = request.limit if request else 2
    logger.info(f"Manual pipeline trigger received via API for sector: {sector}, limit: {limit}")
    try:
        pipeline = ContentPipeline(sector=sector, limit=limit)
        result = await pipeline.run()
        return result
    except Exception as e:
        logger.error(f"Error executing agentic pipeline: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline execution failed: {str(e)}"
        )


class RunPromptRequest(BaseModel):
    prompt: str

@router.post("/prompt")
async def run_prompt_pipeline(request: RunPromptRequest):
    """
    Triggers the prompt-based agent posting flow.
    Parses the prompt, crawls optional web sources, generates platform-specific content, 
    saves to database as draft, and returns intent + post data.
    """
    logger.info(f"Prompt agent pipeline trigger received: {request.prompt}")
    try:
        from app.agents.prompt_agent import PromptAgent
        agent = PromptAgent()
        result = await agent.run(request.prompt)
        return result
    except Exception as e:
        logger.error(f"Error executing prompt pipeline: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prompt execution failed: {str(e)}"
        )

