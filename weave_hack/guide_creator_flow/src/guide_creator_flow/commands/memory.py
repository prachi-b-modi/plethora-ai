"""
Memory command handler for storing and retrieving information.
"""
import json
import os
import base64
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from crewai import Agent, Task, Crew, Process
import weave
from .base import BaseHandler, CommandResult


class MemoryHandler(BaseHandler):
    """Handler for memory-related commands."""
    
    def __init__(self):
        super().__init__()
        self.data_dir = Path("data")
        self.memory_file = self.data_dir / "memories.json"
        self._ensure_data_dir()
    
    def _ensure_data_dir(self):
        """Ensure data directory and memory file exist."""
        self.data_dir.mkdir(exist_ok=True)
        if not self.memory_file.exists():
            self._save_memories([])
    
    def _load_memories(self) -> List[Dict[str, Any]]:
        """Load memories from JSON file."""
        try:
            with open(self.memory_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _save_memories(self, memories: List[Dict[str, Any]]):
        """Save memories to JSON file."""
        with open(self.memory_file, 'w') as f:
            json.dump(memories, f, indent=2, default=str)
    
    def _generate_id(self) -> str:
        """Generate a unique ID for a memory."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"mem_{timestamp}"
    
    @property
    def command(self) -> str:
        return "memory"
    
    @property
    def description(self) -> str:
        return "Store and retrieve information from local knowledge base"
    
    def get_help(self, subcommand: Optional[str] = None) -> str:
        """Get help text for the memory command."""
        if subcommand == "save":
            return """📝 **Memory Save Command**
            
Usage: `/memory save [content]`

Saves information to your local knowledge base.

Examples:
• `/memory save API key for service X is ABC123`
• `/memory save Meeting notes: Discussed project timeline...`
• `/memory save Python snippet for data processing: def process()...`
"""
        elif subcommand == "search":
            return """🔍 **Memory Search Command**
            
Usage: `/memory search [query]`

Uses AI to intelligently search your knowledge base.

Examples:
• `/memory search API key`
• `/memory search meeting notes`
• `/memory search python data processing`
"""
        elif subcommand == "list":
            return """📋 **Memory List Command**
            
Usage: `/memory list [limit]`

Lists all memories or the most recent ones.

Examples:
• `/memory list` - Show all memories
• `/memory list 10` - Show 10 most recent memories
"""
        elif subcommand == "delete":
            return """🗑️ **Memory Delete Command**
            
Usage: `/memory delete [id]`

Deletes a memory by its ID.

Examples:
• `/memory delete mem_20240112143022`
"""
        elif subcommand == "save_page":
            return """🌐 **Memory Save Page Command**
            
Usage: `/memory save_page [url] [content]`

Saves a web page with AI-generated summary.

**Note:** This command is designed for API usage. Your browser extension should send:
- URL of the page
- Page content (HTML or text)

The AI will analyze the content and save a summary with the URL.

Examples:
• `/memory save_page https://example.com "Page content here..."`
"""
        else:
            return """💾 **Memory Command**

Store and retrieve information from your local knowledge base.

**Available subcommands:**
• `/memory save [content]` - Save new information
• `/memory save_page [url] [content]` - Save web page with AI summary
• `/memory search [query]` - AI-powered search through memories
• `/memory list [limit]` - List all or recent memories  
• `/memory delete [id]` - Delete a memory by ID

**Examples:**
• `/memory save Important note about project X`
• `/memory save_page https://example.com "Page content..."`
• `/memory search project notes`
• `/memory list 5`
• `/memory delete mem_20240112143022`

💡 **Tips:**
• Memories are stored locally in JSON format
• Search uses AI to understand context and meaning
• Each memory has a unique ID and timestamp
• save_page analyzes content and stores URL + summary
"""
    
    async def handle(self, args: str) -> CommandResult:
        """Handle memory command."""
        parts = args.strip().split(maxsplit=1)
        
        if not parts:
            return CommandResult(
                success=True,
                data=self.get_help(),
                metadata={"command": "memory", "subcommand": "help"}
            )
        
        subcommand = parts[0].lower()
        content = parts[1] if len(parts) > 1 else ""
        
        if subcommand == "save":
            return await self._handle_save(content)
        elif subcommand == "save_page":
            return await self._handle_save_page(content)
        elif subcommand == "search":
            return await self._handle_search(content)
        elif subcommand == "list":
            return await self._handle_list(content)
        elif subcommand == "delete":
            return await self._handle_delete(content)
        else:
            # If no valid subcommand, treat the whole input as a search query
            return await self._handle_search(args)
    
    async def _handle_save(self, content: str) -> CommandResult:
        """Save a new memory."""
        if not content:
            return CommandResult(
                success=False,
                data="❌ No content provided to save.",
                error="Please provide content after `/memory save`"
            )
        
        memories = self._load_memories()
        
        new_memory = {
            "id": self._generate_id(),
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        memories.append(new_memory)
        self._save_memories(memories)
        
        return CommandResult(
            success=True,
            data=f"✅ **Memory Saved!**\n\nID: `{new_memory['id']}`\nContent: {content[:100]}{'...' if len(content) > 100 else ''}",
            metadata={
                "command": "memory",
                "subcommand": "save",
                "memory_id": new_memory['id']
            }
        )
    
    async def _handle_save_page(self, args: str) -> CommandResult:
        """Save a web page with AI-generated summary."""
        if not args:
            return CommandResult(
                success=False,
                data="❌ No URL or content provided.",
                error="Please provide URL and content: `/memory save_page [url] [content]`"
            )
        
        # Parse URL and content
        parts = args.split(maxsplit=1)
        if len(parts) < 2:
            return CommandResult(
                success=False,
                data="❌ Missing content. Format: `/memory save_page [url] [content]`",
                error="Both URL and content are required"
            )
        
        url = parts[0]
        page_content = parts[1]
        
        # Use CrewAI to analyze and summarize the page content
        try:
            # Create an analysis agent
            analyzer_agent = Agent(
                role="Web Content Analyzer",
                goal="Analyze web page content and create a comprehensive summary",
                backstory="""You are an expert at analyzing web content and extracting key information.
                You can identify main topics, important details, and create concise summaries that capture
                the essence of web pages. You focus on factual information and key takeaways.""",
                verbose=False,
                allow_delegation=False
            )
            
            # Create analysis task
            analysis_task = Task(
                description=f"""Analyze the following web page content from {url} and create a summary:
                
                Content:
                {page_content[:3000]}{'...' if len(page_content) > 3000 else ''}
                
                Create a comprehensive summary that includes:
                1. Main topic or purpose of the page
                2. Key points or information
                3. Any important data, facts, or insights
                4. Overall takeaway
                
                Keep the summary informative but concise.""",
                expected_output="A comprehensive summary of the web page content",
                agent=analyzer_agent
            )
            
            # Create and run the crew
            crew = Crew(
                agents=[analyzer_agent],
                tasks=[analysis_task],
                process=Process.sequential,
                verbose=False
            )
            
            summary = crew.kickoff()
            
            # Load existing memories
            memories = self._load_memories()
            
            # Create new memory with URL and summary
            new_memory = {
                "id": self._generate_id(),
                "type": "webpage",
                "url": url,
                "content": f"URL: {url}\n\nSummary:\n{summary.raw}",
                "original_content_preview": page_content[:500] + "..." if len(page_content) > 500 else page_content,
                "timestamp": datetime.now().isoformat(),
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            memories.append(new_memory)
            self._save_memories(memories)
            
            return CommandResult(
                success=True,
                data=f"✅ **Web Page Saved!**\n\n**URL:** {url}\n**ID:** `{new_memory['id']}`\n\n**Summary:**\n{summary.raw[:500]}{'...' if len(str(summary.raw)) > 500 else ''}",
                metadata={
                    "command": "memory",
                    "subcommand": "save_page",
                    "memory_id": new_memory['id'],
                    "url": url
                }
            )
            
        except Exception as e:
            # Fallback: save without AI summary
            memories = self._load_memories()
            
            new_memory = {
                "id": self._generate_id(),
                "type": "webpage",
                "url": url,
                "content": f"URL: {url}\n\nContent Preview:\n{page_content[:1000]}...",
                "timestamp": datetime.now().isoformat(),
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            memories.append(new_memory)
            self._save_memories(memories)
            
            return CommandResult(
                success=True,
                data=f"✅ **Web Page Saved (without AI summary)!**\n\n**URL:** {url}\n**ID:** `{new_memory['id']}`\n\n*Note: AI summarization failed, saved content preview instead.*",
                metadata={
                    "command": "memory",
                    "subcommand": "save_page",
                    "memory_id": new_memory['id'],
                    "url": url,
                    "error": str(e)
                }
            )
    
    async def _handle_save_page_image(self, url: str, screenshot_base64: str, title: Optional[str] = None) -> CommandResult:
        """Save a web page from screenshot with AI-generated summary."""
        try:
            # Create a vision-capable analysis agent
            analyzer_agent = Agent(
                role="Visual Web Content Analyzer",
                goal="Analyze web page screenshots and create comprehensive summaries",
                backstory="""You are an expert at analyzing web page screenshots and extracting key information.
                You can read text from images, understand layouts, identify important elements, and create 
                detailed summaries of what you see. You focus on the main content, key information, and 
                overall purpose of the web page.""",
                verbose=False,
                allow_delegation=False
            )
            
            # Create analysis task with image
            analysis_task = Task(
                description=f"""Analyze this screenshot of a web page from {url} and create a comprehensive summary.
                
                {f"Page Title: {title}" if title else ""}
                
                Look at the screenshot and:
                1. Identify the main topic or purpose of the page
                2. Extract key text content you can see
                3. Note important visual elements (images, layouts, etc.)
                4. Summarize the overall content and purpose
                5. Extract any important data, facts, or insights visible
                
                Create a detailed summary of what you observe in the screenshot.
                
                Image: data:image/png;base64,{screenshot_base64[:100]}...[truncated for task description]
                """,
                expected_output="A comprehensive summary of the web page content visible in the screenshot",
                agent=analyzer_agent
            )
            
            # For vision tasks, we need to pass the image differently
            # Since CrewAI might not directly support images, let's use OpenAI directly
            import openai
            
            # Use OpenAI vision API directly
            client = openai.OpenAI()
            
            # Debug: Check image data
            print(f"DEBUG: Screenshot base64 length: {len(screenshot_base64)}")
            print(f"DEBUG: First 100 chars of base64: {screenshot_base64[:100]}")
            print(f"DEBUG: URL: {url}")
            print(f"DEBUG: Title: {title}")
            
            # Verify base64 is valid and save to file
            try:
                # Remove data URL prefix if present for decoding
                if screenshot_base64.startswith('data:image'):
                    # Extract base64 part after the comma
                    base64_only = screenshot_base64.split(',', 1)[1]
                    print(f"DEBUG: Stripped data URL prefix")
                else:
                    base64_only = screenshot_base64
                
                image_data = base64.b64decode(base64_only)
                print(f"DEBUG: Decoded image size: {len(image_data)} bytes")
                
                # Save screenshot to file for debugging
                screenshots_dir = Path("screenshots")
                screenshots_dir.mkdir(exist_ok=True)
                
                # Generate filename from timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                screenshot_filename = screenshots_dir / f"screenshot_{timestamp}.png"
                
                with open(screenshot_filename, "wb") as f:
                    f.write(image_data)
                
                print(f"DEBUG: Screenshot saved to: {screenshot_filename}")
                print(f"DEBUG: File size: {screenshot_filename.stat().st_size} bytes")
                
            except Exception as e:
                print(f"DEBUG: Base64 decode error: {str(e)}")
                return CommandResult(
                    success=False,
                    data=f"❌ Invalid image data: {str(e)}",
                    error="Invalid base64 image"
                )
            
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"""Analyze this screenshot of a web page from {url} and create a comprehensive summary.
                                    
                                    {f"Page Title: {title}" if title else ""}
                                    
                                    Please:
                                    1. Identify the main topic or purpose of the page
                                    2. Extract key text content you can see
                                    3. Note important visual elements
                                    4. Summarize the overall content and purpose
                                    5. Extract any important data, facts, or insights visible
                                    
                                    Provide a detailed summary of what you observe."""
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{screenshot_base64}" if not screenshot_base64.startswith('data:') else screenshot_base64
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=1000
                )
                
                summary = response.choices[0].message.content
                print(f"DEBUG: Successfully got summary from OpenAI")
                
            except Exception as api_error:
                print(f"DEBUG: OpenAI API error: {str(api_error)}")
                print(f"DEBUG: Error type: {type(api_error)}")
                if hasattr(api_error, 'response'):
                    print(f"DEBUG: Response status: {getattr(api_error.response, 'status_code', 'N/A')}")
                    print(f"DEBUG: Response body: {getattr(api_error.response, 'text', 'N/A')}")
                raise api_error
            
            # Load existing memories
            memories = self._load_memories()
            
            # Create new memory with URL and visual summary
            new_memory = {
                "id": self._generate_id(),
                "type": "webpage_screenshot",
                "url": url,
                "title": title or "Untitled Page",
                "content": f"URL: {url}\n{f'Title: {title}' if title else ''}\n\nVisual Summary:\n{summary}",
                "has_screenshot": True,
                "timestamp": datetime.now().isoformat(),
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            memories.append(new_memory)
            self._save_memories(memories)
            
            return CommandResult(
                success=True,
                data=f"✅ **Web Page Saved from Screenshot!**\n\n**URL:** {url}\n{f'**Title:** {title}' if title else ''}\n**ID:** `{new_memory['id']}`\n\n**Visual Summary:**\n{summary[:500]}{'...' if len(summary) > 500 else ''}",
                metadata={
                    "command": "memory",
                    "subcommand": "save_page_image",
                    "memory_id": new_memory['id'],
                    "url": url,
                    "method": "vision_analysis"
                }
            )
            
        except Exception as e:
            # Fallback: save with basic info
            memories = self._load_memories()
            
            new_memory = {
                "id": self._generate_id(),
                "type": "webpage_screenshot",
                "url": url,
                "title": title or "Untitled Page",
                "content": f"URL: {url}\n{f'Title: {title}' if title else ''}\n\n*Screenshot saved but analysis failed*",
                "has_screenshot": True,
                "timestamp": datetime.now().isoformat(),
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            memories.append(new_memory)
            self._save_memories(memories)
            
            return CommandResult(
                success=True,
                data=f"✅ **Web Page Saved (without AI analysis)!**\n\n**URL:** {url}\n**ID:** `{new_memory['id']}`\n\n*Note: Screenshot analysis failed: {str(e)}*",
                metadata={
                    "command": "memory",
                    "subcommand": "save_page_image",
                    "memory_id": new_memory['id'],
                    "url": url,
                    "error": str(e)
                }
            )
    
    async def _handle_search(self, query: str) -> CommandResult:
        """Search memories using AI."""
        if not query:
            return CommandResult(
                success=False,
                data="❌ No search query provided.",
                error="Please provide a search term after `/memory search`"
            )
        
        memories = self._load_memories()
        
        if not memories:
            return CommandResult(
                success=True,
                data="📭 No memories found. Start saving some with `/memory save`!",
                metadata={"command": "memory", "subcommand": "search", "query": query}
            )
        
        # Use CrewAI to search through memories
        try:
            # Create a search agent
            search_agent = Agent(
                role="Knowledge Assistant",
                goal=f"Answer the user's question using relevant information from stored memories",
                backstory="""You are a helpful assistant that can access a personal knowledge base. 
                Your job is to find relevant information and provide a clear, direct answer to the user's question. 
                Only include information that actually helps answer the question. If no relevant information 
                is found, say so clearly.""",
                verbose=False,
                allow_delegation=False
            )
            
            # Format memories for the agent (without IDs, focus on content)
            memories_text = "\n\n".join([
                f"Memory from {mem['created_at']}:\n{mem['content']}"
                for mem in memories
            ])
            
            # Create a search task
            search_task = Task(
                description=f"""The user is asking: "{query}"
                
                Here are the stored memories to search through:
                
                {memories_text}
                
                Your task:
                1. Review all the memories carefully and completely
                2. Find any information that helps answer the user's question
                3. If you find relevant information, provide a clear, helpful answer
                4. If no memories contain relevant information, say "I don't have any relevant information about that in your saved memories."
                5. Only include information that actually answers the question - don't mention irrelevant memories
                6. Present the answer naturally, like you're having a conversation
                
                Focus on being helpful and direct. Don't list memory IDs or technical details.""",
                expected_output="A clear, helpful answer to the user's question based on relevant memories, or a statement that no relevant information was found",
                agent=search_agent
            )
            
            # Create and run the crew
            crew = Crew(
                agents=[search_agent],
                tasks=[search_task],
                process=Process.sequential,
                verbose=False
            )
            
            result = crew.kickoff()
            
            # Return the natural response from the AI
            output = result.raw
            
            return CommandResult(
                success=True,
                data=output,
                metadata={
                    "command": "memory",
                    "subcommand": "search",
                    "query": query,
                    "method": "ai_search"
                }
            )
            
        except Exception as e:
            # Fallback to simple search if AI fails
            results = []
            for memory in memories:
                if query.lower() in memory['content'].lower():
                    results.append(memory)
            
            if not results:
                return CommandResult(
                    success=True,
                    data=f"I don't have any relevant information about '{query}' in your saved memories.",
                    metadata={"command": "memory", "subcommand": "search", "query": query}
                )
            
            # Format results naturally (without IDs)
            if len(results) == 1:
                output = f"Here's what I found about '{query}':\n\n{results[0]['content']}"
            else:
                output = f"I found {len(results)} memories related to '{query}':\n\n"
                for i, memory in enumerate(results[:5], 1):  # Limit to top 5 for readability
                    output += f"**{i}.** {memory['content']}\n\n"
                
                if len(results) > 5:
                    output += f"*({len(results) - 5} more memories available)*"
            
            return CommandResult(
                success=True,
                data=output,
                metadata={
                    "command": "memory",
                    "subcommand": "search",
                    "query": query,
                    "results_count": len(results),
                    "method": "fallback_search"
                }
            )
    
    async def _handle_list(self, limit_str: str) -> CommandResult:
        """List memories."""
        memories = self._load_memories()
        
        if not memories:
            return CommandResult(
                success=True,
                data="📭 No memories stored yet. Start saving some with `/memory save`!",
                metadata={"command": "memory", "subcommand": "list"}
            )
        
        # Parse limit
        limit = None
        if limit_str:
            try:
                limit = int(limit_str)
            except ValueError:
                pass
        
        # Sort by timestamp (newest first)
        memories.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Apply limit if specified
        display_memories = memories[:limit] if limit else memories
        
        # Format output
        output = f"📋 **Stored Memories**\n\n"
        output += f"Total: {len(memories)} memor{'y' if len(memories) == 1 else 'ies'}"
        if limit and limit < len(memories):
            output += f" (showing {limit} most recent)"
        output += "\n\n"
        
        for memory in display_memories:
            output += f"**ID:** `{memory['id']}`\n"
            output += f"**Date:** {memory['created_at']}\n"
            output += f"**Content:** {memory['content'][:150]}{'...' if len(memory['content']) > 150 else ''}\n"
            output += "---\n"
        
        return CommandResult(
            success=True,
            data=output,
            metadata={
                "command": "memory",
                "subcommand": "list",
                "total_count": len(memories),
                "displayed_count": len(display_memories)
            }
        )
    
    async def _handle_delete(self, memory_id: str) -> CommandResult:
        """Delete a memory by ID."""
        if not memory_id:
            return CommandResult(
                success=False,
                data="❌ No memory ID provided.",
                error="Please provide a memory ID to delete"
            )
        
        memories = self._load_memories()
        original_count = len(memories)
        
        # Filter out the memory with the given ID
        memories = [m for m in memories if m['id'] != memory_id]
        
        if len(memories) == original_count:
            return CommandResult(
                success=False,
                data=f"❌ Memory with ID `{memory_id}` not found.",
                error="Memory not found"
            )
        
        self._save_memories(memories)
        
        return CommandResult(
            success=True,
            data=f"✅ Memory `{memory_id}` deleted successfully.",
            metadata={
                "command": "memory",
                "subcommand": "delete",
                "deleted_id": memory_id
            }
        ) 