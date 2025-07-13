#!/usr/bin/env python3
"""
Test script for YouTube transcript extraction
"""
import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from guide_creator_flow.tools.youtube_transcript import YouTubeTranscriptExtractor

def test_youtube_transcript():
    """Test YouTube transcript extraction"""
    extractor = YouTubeTranscriptExtractor()
    
    # Test with a short YouTube video URL
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll - short video
    
    print(f"Testing YouTube transcript extraction...")
    print(f"URL: {test_url}")
    print(f"Is YouTube URL: {extractor.is_youtube_url(test_url)}")
    print(f"Video ID: {extractor.extract_video_id(test_url)}")
    
    # Try to get transcript
    result = extractor.get_transcript(test_url)
    
    if result['success']:
        print("✅ Transcript extraction successful!")
        print(f"Transcript length: {result['transcript_length']} characters")
        print(f"Segments: {result['segments']}")
        print(f"First 200 chars: {result['transcript'][:200]}...")
        
        # Test formatting
        formatted = extractor.format_transcript_for_chat(result)
        print(f"\nFormatted transcript preview:")
        print(formatted[:500] + "...")
    else:
        print(f"❌ Transcript extraction failed: {result['error']}")
        
        # Common reasons for failure:
        if "youtube-transcript-api not installed" in result['error']:
            print("\n💡 To install: pip install youtube-transcript-api")
        elif "No transcript found" in result['error']:
            print("\n💡 This video may not have captions available")

if __name__ == "__main__":
    test_youtube_transcript() 