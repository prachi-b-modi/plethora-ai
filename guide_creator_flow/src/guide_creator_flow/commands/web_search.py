"""
Web search command handler using Exa AI.
"""
import time
from typing import Optional
import weave
from .base import BaseHandler, CommandResult
from guide_creator_flow.crews.poem_crew.poem_crew import SearchCrew


class WebSearchHandler(BaseHandler):
    """Handler for web search commands using Exa AI."""
    
    @property
    def command(self) -> str:
        return "web"
    
    @property
    def description(self) -> str:
        return "Search the web using Exa AI's semantic search engine"
    
    def get_help(self, subcommand: Optional[str] = None) -> str:
        """Get help text for web search command."""
        return """🔍 **Web Search Command**

Search the web using Exa AI's powerful semantic search engine.

**Usage:** `/web [search query]` or just `[search query]`

**Examples:**
• `/web latest AI developments`
• `/web sustainable energy trends 2024`
• `/web how does quantum computing work`
• `latest breakthroughs in biotechnology` (without /web prefix)

💡 **Tips:**
• Exa AI uses semantic search - it understands meaning, not just keywords
• Focuses on high-quality, recent content
• Results include comprehensive summaries with source citations
"""
    
    async def handle(self, args: str) -> CommandResult:
        """Handle web search command."""
        if not args:
            return CommandResult(
                success=False,
                data="❌ Search query cannot be empty.",
                error="Please provide a search query"
            )
        
        start_time = time.time()
        
        try:
            # Initialize and run the search crew
            search_crew = SearchCrew()
            result = search_crew.execute_search(args)
            
            processing_time = time.time() - start_time
            
            return CommandResult(
                success=True,
                data=result.raw,
                metadata={
                    "command": "web",
                    "query": args,
                    "processing_time": round(processing_time, 2),
                    "source": "exa_ai"
                }
            )
            
        except Exception as e:
            return CommandResult(
                success=False,
                data=f"❌ Search failed: {str(e)}",
                error=str(e),
                metadata={
                    "command": "web",
                    "query": args,
                    "processing_time": round(time.time() - start_time, 2)
                }
            ) 