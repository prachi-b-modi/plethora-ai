#!/usr/bin/env python3
"""
Test script for enhanced tab analyzer with YouTube transcript extraction
"""
import sys
import os
import asyncio

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from guide_creator_flow.commands.tab_analyzer import TabAnalyzerHandler

async def test_enhanced_tab_analyzer():
    """Test the enhanced tab analyzer with YouTube transcript extraction"""
    analyzer = TabAnalyzerHandler()
    
    # Test with YouTube URL
    test_youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    # Mock image data (placeholder)
    mock_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    print("Testing enhanced tab analyzer with YouTube URL...")
    print(f"YouTube URL: {test_youtube_url}")
    print(f"Mock image data length: {len(mock_image)}")
    
    try:
        # Test with YouTube URL
        result = await analyzer.analyze_tabs(
            images=[mock_image],
            query="what is this video about",
            tab_urls=[test_youtube_url]
        )
        
        if result.success:
            print("✅ Enhanced tab analysis successful!")
            print(f"Response length: {len(result.data)} characters")
            print(f"YouTube transcripts used: {result.metadata.get('youtube_transcripts_used', 0)}")
            print(f"Response preview:\n{result.data[:500]}...")
            
            if "Enhanced with YouTube transcript data" in result.data:
                print("🎥 YouTube transcript integration confirmed!")
            else:
                print("⚠️ YouTube transcript integration not detected in response")
        else:
            print(f"❌ Enhanced tab analysis failed: {result.error}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        
    # Test without YouTube URL
    print("\n" + "="*50)
    print("Testing with non-YouTube URL...")
    
    try:
        result = await analyzer.analyze_tabs(
            images=[mock_image],
            query="what is this page about",
            tab_urls=["https://example.com"]
        )
        
        if result.success:
            print("✅ Non-YouTube analysis successful!")
            print(f"YouTube transcripts used: {result.metadata.get('youtube_transcripts_used', 0)}")
            
            if result.metadata.get('youtube_transcripts_used', 0) == 0:
                print("✅ Correctly identified non-YouTube URL")
            else:
                print("⚠️ Unexpectedly processed non-YouTube URL as YouTube")
        else:
            print(f"❌ Non-YouTube analysis failed: {result.error}")
            
    except Exception as e:
        print(f"❌ Non-YouTube test failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_enhanced_tab_analyzer()) 