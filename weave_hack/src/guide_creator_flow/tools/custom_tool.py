from typing import Type
import os
from datetime import datetime, timedelta

from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from exa_py import Exa
import weave


class ExaSearchInput(BaseModel):
    """Input schema for ExaSearchTool."""

    query: str = Field(..., description="The search query to find relevant web content.")


class ExaSearchTool(BaseTool):
    name: str = "Exa Web Search"
    description: str = (
        "Search the web using Exa's semantic search engine to find high-quality, relevant content. "
        "This tool is perfect for finding recent articles, research papers, news, and other web content "
        "based on the meaning of your query, not just keywords."
    )
    args_schema: Type[BaseModel] = ExaSearchInput

    @weave.op()
    def _run(self, query: str) -> str:
        """
        Perform web search using Exa and return formatted results with content.
        """
        try:
            # Get API key from environment
            exa_api_key = os.getenv("EXA_API_KEY")
            if not exa_api_key:
                return "Error: EXA_API_KEY environment variable not set. Please set your Exa API key."
            
            # Initialize Exa client
            exa = Exa(exa_api_key)
            
            # Set date filter to get recent content (last week)
            one_week_ago = datetime.now() - timedelta(days=7)
            date_cutoff = one_week_ago.strftime("%Y-%m-%d")
            
            # Perform search with content retrieval
            response = exa.search_and_contents(
                query,
                type="neural",  # Use semantic search
                num_results=3,
                start_published_date=date_cutoff,
                text={
                    "max_characters": 1000,
                    "include_html_tags": False
                },
                highlights={
                    "num_sentences": 3,
                    "highlights_per_url": 2,
                    "query": "key insights and main points"
                }
            )
            
            # Format results for better readability
            formatted_results = []
            for i, result in enumerate(response.results, 1):
                formatted_result = f"""
**Result {i}:**
- **Title:** {result.title}
- **URL:** {result.url}
- **Published:** {result.published_date or 'Unknown'}
- **Content Preview:** {result.text[:500] if result.text else 'No content available'}...
- **Key Highlights:** {' | '.join(result.highlights) if result.highlights else 'No highlights available'}

---
"""
                formatted_results.append(formatted_result)
            
            # Create summary of all results
            search_summary = f"""
**Search Results for: "{query}"**
Found {len(response.results)} relevant sources from the past week.

{''.join(formatted_results)}

**Search completed using Exa's semantic search engine.**
"""
            
            return search_summary
            
        except Exception as e:
            return f"Error performing search: {str(e)}"


# Keep the old tool for backward compatibility but rename it
class MyCustomToolInput(BaseModel):
    """Input schema for MyCustomTool."""

    argument: str = Field(..., description="Description of the argument.")


class MyCustomTool(BaseTool):
    name: str = "Name of my tool"
    description: str = (
        "Clear description for what this tool is useful for, your agent will need this information to use it."
    )
    args_schema: Type[BaseModel] = MyCustomToolInput

    def _run(self, argument: str) -> str:
        # Implementation goes here
        return "this is an example of a tool output, ignore it and move along."
