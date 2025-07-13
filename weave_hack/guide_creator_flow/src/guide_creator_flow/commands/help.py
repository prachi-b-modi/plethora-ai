"""
Help command handler.
"""
from typing import Optional
from .base import BaseHandler, CommandResult


class HelpHandler(BaseHandler):
    """Handler for help command."""
    
    def __init__(self, router):
        super().__init__()
        self.router = router
    
    @property
    def command(self) -> str:
        return "help"
    
    @property
    def description(self) -> str:
        return "Show available commands and usage"
    
    def get_help(self, subcommand: Optional[str] = None) -> str:
        """Get help text."""
        # If asking for help on a specific command
        if subcommand and subcommand in self.router.handlers:
            handler = self.router.handlers[subcommand]
            return handler.get_help()
        
        # General help
        commands = self.router.get_all_commands()
        
        help_text = "🚀 **Universal Command Center**\n\nAvailable commands:\n\n"
        
        for cmd, desc in sorted(commands.items()):
            help_text += f"• **{cmd}** - {desc}\n"
        
        help_text += "\n💡 **Tips:**\n"
        help_text += "• Type `/help [command]` for detailed help on a specific command\n"
        help_text += "• Commands without a slash default to AI chat conversation\n"
        help_text += "• Use `/web` for web searches, `/memory` for knowledge base\n"
        
        return help_text
    
    async def handle(self, args: str) -> CommandResult:
        """Handle help command."""
        # Check if asking for help on specific command
        command = args.strip().lower()
        
        return CommandResult(
            success=True,
            data=self.get_help(command),
            metadata={"command": "help", "subcommand": command if command else None}
        ) 