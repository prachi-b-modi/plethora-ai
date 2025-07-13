#!/usr/bin/env python3
"""
ADK Agent for Website Overlay Generation

This agent generates JavaScript code to create website overlays based on user prompts.
"""

import os
import json
from google.adk.agents import Agent
from google.adk.tools import FunctionTool

def generate_website_overlay_js(prompt: str) -> dict:
    """
    Generate JavaScript code for website overlays based on a user prompt.
    
    Use this tool when a user asks you to create an overlay, modify a website, 
    add functionality to a webpage, or change the background/appearance of a website.
    
    Args:
        prompt: The user's description of the desired overlay or website modification
        
    Returns:
        A dictionary containing the generated JavaScript code and status information.
        On success: {'status': 'success', 'js_code': 'JavaScript code...', 'description': 'Brief description'}
        On error: {'status': 'error', 'error_message': 'Error description'}
    """
    
    try:
        # Simple JavaScript generator for common overlay requests
        js_code = ""
        
        # Handle background color changes
        if "background" in prompt.lower() and "red" in prompt.lower():
            js_code = """
// Change background to red
(function() 
{
    document.body.style.backgroundColor = 'red';
    console.log('Background changed to red');
})();
"""
        elif "background" in prompt.lower():
            # Extract color if mentioned
            color = "lightblue"  # default
            if "blue" in prompt.lower():
                color = "blue"
            elif "green" in prompt.lower():
                color = "green"
            elif "yellow" in prompt.lower():
                color = "yellow"
            elif "purple" in prompt.lower():
                color = "purple"
            
            js_code = f"""
// Change background color
(function() 
{{
    document.body.style.backgroundColor = '{color}';
    console.log('Background changed to {color}');
}})();
"""
        
        # Handle overlay creation
        elif "overlay" in prompt.lower():
            js_code = """
// Create Apple-style glass overlay
(function() 
{
    // Remove existing overlay if present
    const existingOverlay = document.getElementById('glass-overlay');
    if (existingOverlay) 
    {
        existingOverlay.remove();
    }
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'glass-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        height: 300px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #333;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    `;
    
    // Add content
    overlay.innerHTML = `
        <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Glass Overlay</h2>
        <p style="margin: 0 0 20px 0; text-align: center; line-height: 1.4;">This is a beautiful Apple-style glass overlay!</p>
        <button onclick="this.parentElement.remove()" style="
            background: rgba(0, 122, 255, 0.8);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.2s;
        ">Close</button>
    `;
    
    // Add to page
    document.body.appendChild(overlay);
    
    console.log('Glass overlay created successfully');
})();
"""
        
        # Handle note/message display
        elif "note" in prompt.lower() or "message" in prompt.lower():
            js_code = """
// Create floating note
(function() 
{
    const note = document.createElement('div');
    note.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        padding: 15px;
        max-width: 300px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        color: #333;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease-out;
    `;
    
    note.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">📝 Note</div>
        <div>This is a floating note overlay!</div>
        <button onclick="this.remove()" style="
            background: none;
            border: none;
            color: #007AFF;
            cursor: pointer;
            font-size: 12px;
            margin-top: 10px;
            text-decoration: underline;
        ">Dismiss</button>
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn 
        {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(note);
    
    console.log('Note overlay created');
})();
"""
        
        else:
            # Generic overlay for other requests
            js_code = f"""
// Generic website modification
(function() 
{{
    // Create notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
    `;
    
    notification.textContent = 'Website modified: {prompt[:50]}...';
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => notification.remove(), 3000);
    
    console.log('Website modification applied');
}})();
"""
        
        return {
            "status": "success",
            "js_code": js_code.strip(),
            "description": f"Generated JavaScript code for: {prompt[:100]}..."
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error_message": f"Failed to generate JavaScript code: {str(e)}"
        }

# Define the ADK agent following the repository examples
root_agent = Agent(
    name="overlay_generator",
    model="gemini-1.5-flash",
    description="An agent that generates JavaScript overlay code for websites using vanilla JS and Apple-style glass UI.",
    instruction="""You are a helpful assistant that generates JavaScript code for website overlays and modifications.

When a user asks you to create an overlay, modify a website, add functionality to a webpage, or change the background/appearance of a website, you MUST use the generate_website_overlay_js tool with their exact request as the prompt parameter.

After getting the JavaScript code from the tool, return ONLY the raw JavaScript code from the 'js_code' field without any additional formatting, explanations, or instructions. Just output the pure JavaScript code that can be directly added to a website.""",
    tools=[FunctionTool(generate_website_overlay_js)]
)
