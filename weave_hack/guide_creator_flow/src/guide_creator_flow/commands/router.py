"""
Command router for handling different command types.
"""
from typing import Dict, Optional
from .base import BaseHandler, CommandResult
from .web_search import WebSearchHandler
from .help import HelpHandler
from .memory import MemoryHandler
from .chat import ChatHandler
from .script import ScriptHandler


class CommandRouter:
    """Routes commands to appropriate handlers."""
    
    def __init__(self):
        self.handlers: Dict[str, BaseHandler] = {}
        self._browser_context: Optional[Dict] = None  # Store browser context
        self._register_handlers()
    
    def _register_handlers(self):
        """Register all available command handlers."""
        handlers = [
            WebSearchHandler(),
            HelpHandler(self),
            MemoryHandler(),
            ChatHandler(),
            ScriptHandler(),
        ]
        
        for handler in handlers:
            self.handlers[handler.command] = handler
    
    async def route(self, query: str) -> CommandResult:
        """Route a query to the appropriate handler."""
        original_query = query.strip()
        
        # Extract actual command from browser automation context if present
        query = self._extract_command_from_context(original_query)
        
        # Check if it's a command (starts with /)
        if query.startswith('/'):
            parts = query[1:].split(maxsplit=1)
            if not parts:
                # Just "/" - show help
                return await self.handlers['help'].handle("")
            
            command = parts[0].lower()
            args = parts[1] if len(parts) > 1 else ""
            
            # Route to appropriate handler
            if command in self.handlers:
                # Pass browser context to handlers that support it
                if hasattr(self.handlers[command], 'set_browser_context'):
                    self.handlers[command].set_browser_context(self._browser_context)
                
                return await self.handlers[command].handle(args)
            else:
                return CommandResult(
                    success=False,
                    data=f"❌ Unknown command: /{command}\n\nUse /help to see available commands.",
                    error=f"Unknown command: {command}"
                )
        else:
            # No slash - default to chat conversation
            # Pass browser context to chat handler
            if hasattr(self.handlers['chat'], 'set_browser_context'):
                self.handlers['chat'].set_browser_context(self._browser_context)
            
            return await self.handlers['chat'].handle(query)
    
    def _extract_command_from_context(self, query: str) -> str:
        """Extract the actual command from browser automation context."""
        # Reset browser context
        self._browser_context = None
        
        # Check if this looks like browser automation context
        if "You are a browser automation assistant" in query or "User Request:" in query:
            # Store the full browser context
            self._browser_context = self._parse_browser_context(query)
            
            # Try to extract the user request
            import re
            
            # Look for "User Request: /command ..." pattern
            match = re.search(r"User Request:\s*(/\w+.*?)(?:\n|$)", query)
            if match:
                extracted_command = match.group(1).strip()
                print(f"🔍 Extracted command from browser context: '{extracted_command}'")
                return extracted_command
        
        return query
    
    def _parse_browser_context(self, query: str) -> Dict:
        """Parse browser automation context into structured data."""
        import re
        import json
        
        context = {}
        
        # Extract URL
        url_match = re.search(r"Current URL:\s*(.+)", query)
        if url_match:
            context['url'] = url_match.group(1).strip()
        
        # Extract page title
        title_match = re.search(r"Page Title:\s*(.+)", query)
        if title_match:
            context['title'] = title_match.group(1).strip()
        
        # Extract selected text
        text_match = re.search(r"Selected Text:\s*(.+)", query)
        if text_match:
            context['selected_text'] = text_match.group(1).strip()
        
        # Extract DOM elements (this is more complex)
        dom_match = re.search(r"Available DOM elements:\s*(\[.+\])", query, re.DOTALL)
        if dom_match:
            try:
                dom_json = dom_match.group(1)
                # Clean up escaped quotes
                dom_json = dom_json.replace('\\"', '"').replace('\\\\', '\\')
                dom_elements = json.loads(dom_json)
                context['dom_elements'] = dom_elements[:10]  # Limit to first 10 elements
            except json.JSONDecodeError:
                context['dom_elements'] = []
        
        return context
    
    def get_all_commands(self) -> Dict[str, str]:
        """Get all available commands and their descriptions."""
        return {
            f"/{cmd}": handler.description 
            for cmd, handler in self.handlers.items()
        } 