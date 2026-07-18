import os
import sys
import asyncio

# Add the 'api' directory to the path so python can find 'app' package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure stdout to handle emojis in Windows console
if sys.platform.startswith("win"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from app.agents.prompt_agent import PromptAgent
from app.database.connection import Database

async def test_mock_fallback():
    print("==================================================")
    print("TESTING MOCK FALLBACK MODE WITH DETAILED ASPECTS")
    print("==================================================")
    
    agent = PromptAgent()
    # Force mock mode by unconfiguring Gemini
    agent._configured = False
    
    prompts = [
        "write a post on memoryOS for linkedin",
        "write a science post for linkedin",
        "write a post about ai for twitter",
        "write a post on technology for instagram",
        "write a post about business for general",
        "write a post about general operations",
        "write a post about Hardik Pandya for linkedin"
    ]
    
    for prompt in prompts:
        print(f"\n[Prompt]: {prompt}")
        res = await agent.run(prompt)
        print(f"Status: {res['status']}")
        print(f"Intent: {res['intent']}")
        print(f"Title: {res['post']['title']}")
        print(f"Summary: {res['post']['summary']}")
        print(f"Tags: {res['post']['tags']}")
        print("Content:")
        print(res['post']['content'])
        print("-" * 50)

async def test_gemini_generation():
    print("\n==================================================")
    print("TESTING GEMINI RELEVANCE MODIFICATIONS (IF KEY IS OK)")
    print("==================================================")
    
    agent = PromptAgent()
    agent._configure()
    
    if not agent._configured:
        print("Gemini API key is not valid or configured. Skipping Gemini live test.")
        return
        
    prompts = [
        "write a science article for linkedin",
        "write a post about AI automation"
    ]
    
    for prompt in prompts:
        print(f"\n[Gemini Prompt]: {prompt}")
        try:
            res = await agent.run(prompt)
            print(f"Status: {res['status']}")
            print(f"Title: {res['post']['title']}")
            print(f"Summary: {res['post']['summary']}")
            print("Content:")
            print(res['post']['content'])
        except Exception as e:
            print(f"Gemini live test failed: {e}")
        print("-" * 50)

async def main():
    # Initialize DB (will switch to fallback JSON if offline)
    await Database.connect_db()
    
    await test_mock_fallback()
    await test_gemini_generation()
    
    # Close database client
    await Database.disconnect_db()

if __name__ == "__main__":
    asyncio.run(main())
