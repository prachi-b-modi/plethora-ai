"""
YouTube transcript extraction tool
"""
import re
from typing import Optional, Dict, Any
from urllib.parse import urlparse, parse_qs

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    YOUTUBE_API_AVAILABLE = True
except ImportError:
    YOUTUBE_API_AVAILABLE = False


class YouTubeTranscriptExtractor:
    """Extract transcripts from YouTube videos"""
    
    def __init__(self):
        self.youtube_url_pattern = r'(?:https?://)(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})'
    
    def is_youtube_url(self, url: str) -> bool:
        """Check if URL is a YouTube video"""
        return bool(re.search(self.youtube_url_pattern, url))
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        match = re.search(self.youtube_url_pattern, url)
        return match.group(1) if match else None
    
    def get_transcript(self, url: str) -> Dict[str, Any]:
        """Get transcript from YouTube video"""
        if not YOUTUBE_API_AVAILABLE:
            return {
                "success": False,
                "error": "youtube-transcript-api not installed. Run: pip install youtube-transcript-api"
            }
        
        if not self.is_youtube_url(url):
            return {
                "success": False,
                "error": "Not a valid YouTube URL"
            }
        
        try:
            video_id = self.extract_video_id(url)
            if not video_id:
                return {
                    "success": False,
                    "error": "Could not extract video ID from URL"
                }
            
            # Get transcript
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Format transcript
            full_text = ' '.join([item['text'] for item in transcript_list])
            
            # Get video info from URL
            video_info = self._get_video_info(url)
            
            return {
                "success": True,
                "transcript": full_text,
                "video_id": video_id,
                "url": url,
                "video_info": video_info,
                "transcript_length": len(full_text),
                "segments": len(transcript_list)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get transcript: {str(e)}"
            }
    
    def _get_video_info(self, url: str) -> Dict[str, str]:
        """Extract basic video info from URL"""
        try:
            parsed_url = urlparse(url)
            query_params = parse_qs(parsed_url.query)
            
            return {
                "video_id": query_params.get('v', [''])[0],
                "timestamp": query_params.get('t', [''])[0],
                "playlist": query_params.get('list', [''])[0]
            }
        except:
            return {}
    
    def format_transcript_for_chat(self, transcript_result: Dict[str, Any]) -> str:
        """Format transcript result for chat context"""
        if not transcript_result["success"]:
            return f"❌ YouTube transcript error: {transcript_result['error']}"
        
        transcript = transcript_result["transcript"]
        video_id = transcript_result["video_id"]
        
        # Truncate if too long (keep first 2000 chars)
        if len(transcript) > 2000:
            transcript = transcript[:2000] + "..."
        
        return f"""
🎥 YouTube Video Transcript (ID: {video_id}):
---
{transcript}
---
(Transcript length: {transcript_result['transcript_length']} chars, {transcript_result['segments']} segments)
""" 