"""
Chat handler for conversational LLM interactions.
"""
import os
import re
from typing import Optional
from crewai import Agent, Task, Crew
from .base import BaseHandler, CommandResult
from ..tools.youtube_transcript import YouTubeTranscriptExtractor


class ChatHandler(BaseHandler):
    """Handler for conversational LLM interactions."""
    
    def __init__(self):
        super().__init__()
        self.youtube_extractor = YouTubeTranscriptExtractor()
        self._browser_context = None
    
    def set_browser_context(self, context):
        """Set browser context from router."""
        self._browser_context = context
    
    @property
    def command(self) -> str:
        return "chat"
    
    @property
    def description(self) -> str:
        return "Have a conversation with an AI assistant"
    
    async def handle(self, args: str) -> CommandResult:
        """Handle chat requests."""
        if not args.strip():
            return CommandResult(
                success=False,
                data="Please provide a message to chat about.",
                error="Empty message"
            )
        
        try:
            # Check for @tab reference and extract YouTube transcript if needed
            enhanced_message = await self._process_tab_references(args)
            
            # Create a conversational agent
            chat_agent = Agent(
                role='AI Assistant',
                goal='Have helpful, informative conversations with users',
                backstory="""You are a knowledgeable and friendly AI assistant. 
                You can help with a wide variety of topics including answering questions, 
                providing explanations, offering suggestions, and engaging in thoughtful discussion. 
                You aim to be helpful, accurate, and conversational.""",
                verbose=False,
                allow_delegation=False
            )
            
            # Create a simple conversation task
            chat_task = Task(
                description=f"Respond to this user message: {enhanced_message}",
                expected_output="A helpful, conversational response",
                agent=chat_agent
            )
            
            # Create and run the crew
            crew = Crew(
                agents=[chat_agent],
                tasks=[chat_task],
                verbose=False
            )
            
            result = crew.kickoff()
            
            return CommandResult(
                success=True,
                data=str(result),
                metadata={"type": "chat", "query": args}
            )
            
        except Exception as e:
            return CommandResult(
                success=False,
                data=f"Chat error: {str(e)}",
                error=str(e)
            )
    
    def get_help(self, subcommand: Optional[str] = None) -> str:
        """Get help for the chat command."""
        return """💬 **Chat Command**

Have a natural conversation with an AI assistant.

**Usage:**
- `/chat [your message]` - Start a conversation with a specific command
- `[your message]` - Just type without a slash for direct chat (default behavior)

**Examples:**
- `What is quantum computing?`
- `Help me write a Python function`
- `Explain the theory of relativity`
- `/chat Tell me a joke`

The AI assistant can help with:
- Answering questions
- Explaining concepts
- Writing assistance
- Problem solving
- General conversation

**Special Features:**
- Use `@tab` to reference the current browser tab
- Automatically extracts YouTube transcripts when referencing YouTube videos
- Supports follow-up questions and context
"""
    
    async def _process_tab_references(self, message: str) -> str:
        """Process @tab references in the message and extract YouTube transcripts if needed."""
        # Check if message contains @tab reference
        if '@tab' not in message.lower():
            return message
        
        # Check if we have browser context available
        if not self._browser_context:
            return message
        
        # Get the URL from browser context
        current_url = self._browser_context.get('url', '')
        if not current_url:
            return message
        
        # Check if it's a YouTube URL
        if not self.youtube_extractor.is_youtube_url(current_url):
            return message
        
        try:
            # Extract transcript
            transcript_result = self.youtube_extractor.get_transcript(current_url)
            
            if transcript_result['success']:
                # Format transcript for chat
                transcript_text = self.youtube_extractor.format_transcript_for_chat(transcript_result)
                
                # Replace @tab with the transcript
                enhanced_message = message.replace('@tab', f'this YouTube video:\n\n{transcript_text}')
                
                print(f"🎥 YouTube transcript extracted from {current_url}")
                print(f"📝 Transcript length: {transcript_result['transcript_length']} characters")
                
                return enhanced_message
            else:
                # If transcript extraction failed, just replace @tab with URL info
                page_title = self._browser_context.get('title', 'YouTube video')
                enhanced_message = message.replace('@tab', f'this YouTube video: {page_title} ({current_url})')
                
                print(f"⚠️ YouTube transcript extraction failed: {transcript_result['error']}")
                
                return enhanced_message
                
        except Exception as e:
            print(f"❌ Error processing YouTube transcript: {str(e)}")
            
            # Fallback: replace @tab with basic page info
            page_title = self._browser_context.get('title', 'current tab')
            enhanced_message = message.replace('@tab', f'this page: {page_title} ({current_url})')
            
            return enhanced_message