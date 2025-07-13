#!/usr/bin/env python3
"""
AI-Powered Overlay Generator using Google ADK Agent
"""

import asyncio
from google.adk.runner import InMemoryRunner
from overlay_agent import root_agent

async def get_ai_generated_js(prompt: str) -> str:
    """
    Use the actual ADK agent to generate JavaScript code with AI.
    
    Args:
        prompt: Description of the desired overlay or website modification
        
    Returns:
        AI-generated JavaScript code as a string
    """
    # Create a runner for the agent
    runner = InMemoryRunner(agent=root_agent)
    
    # Run the agent with the prompt
    result = await runner.run(prompt)
    
    # Extract the generated JavaScript from the response
    return result.content

def get_ai_js_code_sync(prompt: str) -> str:
    """
    Synchronous wrapper for the async AI generation.
    """
    return asyncio.run(get_ai_generated_js(prompt))

if __name__ == "__main__":
    # Test the AI-powered generation
    import sys
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
        print("Generating with AI (this will take a moment)...")
        js_code = get_ai_js_code_sync(prompt)
        print(js_code)
    else:
        print("Usage: python ai_powered_generator.py 'your prompt here'") 