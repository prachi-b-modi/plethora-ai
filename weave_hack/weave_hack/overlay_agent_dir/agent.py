#!/usr/bin/env python3
"""
ADK Agent Entry Point for Website Overlay Generator
"""

from .overlay_agent import root_agent

# Export the agent as root_agent so ADK can find it
__all__ = ["root_agent"] 