"""
Base handler class for all command handlers.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class CommandResult:
    """Standard result format for all commands."""
    success: bool
    data: Any
    error: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class BaseHandler(ABC):
    """Abstract base class for all command handlers."""
    
    @property
    @abstractmethod
    def command(self) -> str:
        """The command name this handler responds to."""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Short description of what this command does."""
        pass
    
    @abstractmethod
    async def handle(self, args: str) -> CommandResult:
        """
        Handle the command with the given arguments.
        
        Args:
            args: The arguments passed to the command
            
        Returns:
            CommandResult with the execution results
        """
        pass
    
    @abstractmethod
    def get_help(self, subcommand: Optional[str] = None) -> str:
        """
        Get help text for this command.
        
        Args:
            subcommand: Optional subcommand to get specific help for
            
        Returns:
            Help text describing the command usage
        """
        pass
    
    def validate_query(self, query: str) -> bool:
        """
        Validate if the query is appropriate for this handler
        Override in subclasses for custom validation
        
        Args:
            query: The user's input to validate
            
        Returns:
            True if valid, False otherwise
        """
        return True 