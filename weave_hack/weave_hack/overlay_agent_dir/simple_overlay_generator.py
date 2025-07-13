#!/usr/bin/env python3
"""
Simple Overlay Generator - Direct function usage without ADK server
"""

import sys
import os

# Add the current directory to the path so we can import overlay_agent
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from overlay_agent import generate_website_overlay_js

def get_js_code(prompt: str) -> str:
    """
    Simple function that takes a string and returns JavaScript code.
    
    Args:
        prompt: Description of the desired overlay or website modification
        
    Returns:
        JavaScript code as a string, or error message if something goes wrong
    """
    result = generate_website_overlay_js(prompt)
    
    if result["status"] == "success":
        return result["js_code"]
    else:
        return f"// Error: {result['error_message']}"

def main():
    """
    Command line interface for testing
    """
    if len(sys.argv) < 2:
        print("Usage: python simple_overlay_generator.py 'your prompt here'")
        print("Example: python simple_overlay_generator.py 'Create a red background overlay'")
        return
    
    prompt = " ".join(sys.argv[1:])
    js_code = get_js_code(prompt)
    print(js_code)

if __name__ == "__main__":
    main() 