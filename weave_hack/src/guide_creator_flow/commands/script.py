"""
Script handler for generating JavaScript code based on user prompts using CrewAI.
"""
import asyncio
from typing import Optional
from .base import BaseHandler, CommandResult
from ..crews.script_crew import ScriptCrew


class ScriptHandler(BaseHandler):
    """Handler for script generation commands using CrewAI."""
    
    def __init__(self):
        """Initialize the script handler with CrewAI crew."""
        super().__init__()
        self._crew = None
        self._browser_context = None
    
    def set_browser_context(self, context):
        """Set browser context from router."""
        self._browser_context = context
    
    @property
    def crew(self) -> ScriptCrew:
        """Lazy initialization of the ScriptCrew."""
        if self._crew is None:
            self._crew = ScriptCrew()
        return self._crew
    
    @property
    def command(self) -> str:
        return "script"
    
    @property  
    def description(self) -> str:
        return "Generate JavaScript code using AI based on your description"
    
    async def handle(self, args: str) -> CommandResult:
        """Handle script generation requests."""
        if not args.strip():
            return CommandResult(
                success=False,
                data="❌ Please provide a description of the script you want to generate.\n\nExample: /script create a red background overlay",
                error="Empty script description"
            )
        
        try:
            # Check if we have browser automation context
            browser_context = self._extract_browser_context()
            if browser_context:
                print("🌐 Using browser context for script generation")
                # Enhance the prompt with context
                enhanced_description = f"{args.strip()}\n\nBrowser Context:\n{browser_context}"
            else:
                enhanced_description = args.strip()
            
            # Show that we're using AI now
            print("🤖 Using CrewAI to generate JavaScript code...")  # For server logs
            
            # Run the crew in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            js_code = await loop.run_in_executor(
                None, 
                self.crew.generate_script, 
                enhanced_description
            )
            
            # Clean up the output - remove any markdown formatting if present
            js_code = js_code.strip()
            if js_code.startswith("```javascript"):
                js_code = js_code[13:]  # Remove ```javascript
            if js_code.startswith("```"):
                js_code = js_code[3:]  # Remove ```
            if js_code.endswith("```"):
                js_code = js_code[:-3]  # Remove trailing ```
            js_code = js_code.strip()
            
            # Check if there was an error
            if js_code.startswith("// Error"):
                return CommandResult(
                    success=False,
                    data=f"❌ AI generation failed:\n{js_code}",
                    error="AI generation error"
                )
            
            # Return the AI-generated JavaScript code
            context_note = " (using page context)" if browser_context else ""
            return CommandResult(
                success=True,
                data=f"✅ AI-Generated JavaScript code{context_note}:\n\n```javascript\n{js_code}\n```\n\n💡 **How to use:**\n1. Copy the code above\n2. Open your browser's Developer Console (F12)\n3. Paste and press Enter\n4. Or save it as a bookmarklet or userscript\n\n🤖 *Generated using CrewAI with OpenAI*",
                metadata={
                    "command": "script",
                    "description": args.strip(),
                    "js_code": js_code,
                    "ai_generated": True,
                    "used_browser_context": bool(browser_context)
                }
            )
            
        except Exception as e:
            return CommandResult(
                success=False,
                data=f"❌ Script generation failed: {str(e)}\n\nMake sure you have:\n1. OpenAI API key configured (OPENAI_API_KEY)\n2. CrewAI installed and configured properly",
                error=str(e),
                metadata={
                    "command": "script",
                    "description": args.strip()
                }
            )
    
    def _extract_browser_context(self) -> str:
        """Extract browser context from the current request if available."""
        if not self._browser_context:
            return None
            
        # Format the browser context for the AI prompt
        context_parts = []
        
        if 'url' in self._browser_context:
            context_parts.append(f"Current URL: {self._browser_context['url']}")
        
        if 'title' in self._browser_context:
            context_parts.append(f"Page Title: {self._browser_context['title']}")
        
        if 'selected_text' in self._browser_context and self._browser_context['selected_text'] != 'none':
            context_parts.append(f"Selected Text: {self._browser_context['selected_text']}")
        
        if 'dom_elements' in self._browser_context and self._browser_context['dom_elements']:
            context_parts.append("Available elements on page:")
            for elem in self._browser_context['dom_elements'][:5]:  # Limit to 5 most relevant
                if 'selector' in elem and 'text' in elem:
                    context_parts.append(f"  - {elem['selector']}: '{elem['text'][:50]}...' ")
                elif 'selector' in elem:
                    context_parts.append(f"  - {elem['selector']}")
        
        return "\n".join(context_parts) if context_parts else None
    
    def get_help(self, subcommand: Optional[str] = None) -> str:
        """Get help text for the script command."""
        return """
🎭 **AI-Powered Script Generator**

Generate JavaScript code using CrewAI and OpenAI based on your description.

**Usage:**
`/script [description]`

**Examples:**
• `/script create a modal with a contact form`
• `/script add a particle effect background`
• `/script make a countdown timer to New Year`
• `/script create an animated navigation menu`
• `/script build a glass overlay with blur effect`
• `/script add floating bubbles animation`

**Features:**
• AI-powered code generation using CrewAI
• Creates custom JavaScript based on your exact needs
• Generates modern, vanilla JavaScript
• Includes proper error handling and best practices
• Beautiful glass-morphism and modern UI effects

**How to use the generated code:**
1. Copy the JavaScript code
2. Open browser Developer Console (F12)
3. Paste and press Enter
4. Or save as a bookmarklet/userscript

The AI script generator creates custom JavaScript tailored to your specific requirements.
""" 