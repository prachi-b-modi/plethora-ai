"""Tab Analyzer Handler - Analyze multiple browser tab screenshots with AI."""

import base64
from typing import List, Dict, Any
from pathlib import Path
from datetime import datetime

import openai

from .base import BaseHandler, CommandResult
from ..tools.youtube_transcript import YouTubeTranscriptExtractor


class TabAnalyzerHandler(BaseHandler):
    """Handler for analyzing multiple browser tab screenshots."""
    
    def __init__(self):
        self.client = openai.OpenAI()
        self.youtube_extractor = YouTubeTranscriptExtractor()
    
    @property
    def command(self) -> str:
        return "analyze_tabs"
    
    @property
    def description(self) -> str:
        return "Analyze multiple browser tab screenshots with AI"
    
    def get_help(self, subcommand: str = None) -> str:
        return """
**Tab Analyzer** - Analyze multiple browser tabs with AI

This feature allows you to send multiple screenshots of browser tabs along with a question,
and the AI will analyze all images together to provide an answer.

**Usage via API:**
```
POST /analyze_tabs
{
    "images": [
        "data:image/png;base64,...",  // Screenshot 1
        "data:image/png;base64,...",  // Screenshot 2
        // ... more screenshots
    ],
    "query": "Which tab contains pricing information?"
}
```

**Example queries:**
- "Which tabs mention machine learning?"
- "Compare the main topics across these tabs"
- "Find the tab with contact information"
- "What's the common theme between all tabs?"
- "Summarize the key points from all tabs"
"""
    
    async def handle(self, args: str) -> CommandResult:
        """This handler is primarily used via API, not command line."""
        return CommandResult(
            success=False,
            data="This feature is designed to be used via the API endpoint /analyze_tabs",
            error="Use the API endpoint instead"
        )
    
    async def analyze_tabs(self, images: List[str], query: str, tab_urls: List[str] = None) -> CommandResult:
        """Analyze multiple tab screenshots with a user query."""
        try:
            print(f"\n{'='*80}")
            print(f"DEBUG: Starting tab analysis")
            print(f"DEBUG: Query: {query}")
            print(f"DEBUG: Number of images received: {len(images)}")
            print(f"DEBUG: Tab URLs: {tab_urls}")
            print(f"{'='*80}\n")
            
            # Check for YouTube URLs and extract transcripts
            youtube_transcripts = []
            if tab_urls:
                for i, url in enumerate(tab_urls):
                    if url and self.youtube_extractor.is_youtube_url(url):
                        print(f"🎥 Detected YouTube URL in tab {i+1}: {url}")
                        transcript_result = self.youtube_extractor.get_transcript(url)
                        if transcript_result['success']:
                            youtube_transcripts.append({
                                'tab_index': i + 1,
                                'url': url,
                                'transcript': transcript_result['transcript'],
                                'video_id': transcript_result['video_id']
                            })
                            print(f"✅ Successfully extracted transcript for tab {i+1}")
                        else:
                            print(f"❌ Failed to extract transcript for tab {i+1}: {transcript_result['error']}")
            
            # Prepare messages for OpenAI
            system_prompt = """You are a helpful assistant that analyzes browser screenshots and provides direct, conversational answers. 
Be concise and focus only on answering the user's specific question. Don't add unnecessary structure or formatting.
If analyzing multiple tabs, only mention relationships between them if it's relevant to the question.
Skip meta-commentary about the analysis process itself."""
            
            # Enhanced user prompt with transcript information
            if youtube_transcripts:
                transcript_info = "\n\nAdditional context from YouTube video transcripts:\n"
                for yt in youtube_transcripts:
                    transcript_preview = yt['transcript'][:1000] + "..." if len(yt['transcript']) > 1000 else yt['transcript']
                    transcript_info += f"Tab {yt['tab_index']} Transcript: {transcript_preview}\n"
                
                user_prompt = f"""Looking at {'this screenshot' if len(images) == 1 else f'these {len(images)} screenshots'}, {query}

{transcript_info}

Provide a direct, conversational answer without sections or bullet points unless specifically helpful for the answer. If the question is about video content, prioritize information from the transcript over what's visible in the screenshot."""
            else:
                user_prompt = f"""Looking at {'this screenshot' if len(images) == 1 else f'these {len(images)} screenshots'}, {query}

Provide a direct, conversational answer without sections or bullet points unless specifically helpful for the answer."""
            
            print(f"DEBUG: System prompt:\n{system_prompt}\n")
            print(f"DEBUG: User prompt:\n{user_prompt}\n")
            
            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt
                        }
                    ]
                }
            ]
            
            # Add each image to the message
            for i, image_data in enumerate(images, 1):
                print(f"DEBUG: Processing image {i}")
                print(f"DEBUG: Image data preview (first 100 chars): {image_data[:100]}...")
                
                # Handle data URL prefix
                if image_data.startswith('data:image'):
                    # Image already has the data URL format
                    image_url = image_data
                    print(f"DEBUG: Image {i} already has data URL format")
                else:
                    # Add the data URL prefix
                    image_url = f"data:image/png;base64,{image_data}"
                    print(f"DEBUG: Image {i} - added data URL prefix")
                
                messages[1]["content"].append({
                    "type": "text",
                    "text": f"\n\nTab {i}:"
                })
                messages[1]["content"].append({
                    "type": "image_url",
                    "image_url": {
                        "url": image_url
                    }
                })
            
            print(f"\nDEBUG: Final message structure has {len(messages[1]['content'])} content items")
            
            # Optional: Save screenshots for debugging
            if len(images) <= 5:  # Only save if reasonable number of images
                screenshots_dir = Path("screenshots/tab_analysis")
                screenshots_dir.mkdir(parents=True, exist_ok=True)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                
                for i, image_data in enumerate(images, 1):
                    try:
                        # Strip data URL prefix if present
                        base64_data = image_data
                        if base64_data.startswith('data:image'):
                            base64_data = base64_data.split(',', 1)[1]
                        
                        # Decode and save
                        image_bytes = base64.b64decode(base64_data)
                        filename = screenshots_dir / f"{timestamp}_tab_{i}.png"
                        with open(filename, "wb") as f:
                            f.write(image_bytes)
                        print(f"DEBUG: Saved tab {i} screenshot to {filename}")
                    except Exception as e:
                        print(f"DEBUG: Failed to save tab {i} screenshot: {e}")
            
            # Call OpenAI Vision API
            print(f"\nDEBUG: Sending {len(images)} images to OpenAI Vision API")
            print(f"DEBUG: Using model: gpt-4o")
            print(f"DEBUG: Max tokens: 2000")
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=2000  # Increased for comprehensive analysis
            )
            
            analysis = response.choices[0].message.content
            print(f"\nDEBUG: Successfully received analysis from OpenAI")
            print(f"DEBUG: Analysis length: {len(analysis)} characters")
            print(f"DEBUG: Analysis preview:\n{analysis[:500]}...\n")
            
            # Format the response
            output = f"**{query}**\n\n"
            output += analysis
            
            # Add YouTube transcript info if used
            if youtube_transcripts:
                output += f"\n\n🎥 *Enhanced with YouTube transcript data from {len(youtube_transcripts)} video(s)*"
            
            print(f"DEBUG: Final formatted output length: {len(output)} characters")
            print(f"DEBUG: Final output preview:\n{output[:300]}...\n")
            print(f"{'='*80}\n")
            
            return CommandResult(
                success=True,
                data=output,
                metadata={
                    "command": "analyze_tabs",
                    "query": query,
                    "tab_count": len(images),
                    "youtube_transcripts_used": len(youtube_transcripts),
                    "timestamp": datetime.now().isoformat()
                }
            )
            
        except Exception as e:
            print(f"\n{'='*80}")
            print(f"ERROR in analyze_tabs: {str(e)}")
            print(f"ERROR type: {type(e).__name__}")
            print(f"{'='*80}\n")
            import traceback
            traceback.print_exc()
            
            return CommandResult(
                success=False,
                data=f"❌ Failed to analyze tabs: {str(e)}",
                error=str(e),
                metadata={
                    "command": "analyze_tabs",
                    "query": query,
                    "tab_count": len(images),
                    "error_type": type(e).__name__
                }
            ) 