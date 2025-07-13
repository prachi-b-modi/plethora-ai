#!/usr/bin/env python3
"""
Test the save_page endpoint with a local image file
"""
import base64
import requests
import json
import sys

def encode_image(image_path):
    """Encode image file to base64"""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")
    except FileNotFoundError:
        print(f"Error: Image file not found at {image_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error encoding image: {e}")
        sys.exit(1)

def test_save_page_with_image(image_path):
    """Test the save_page endpoint with a local image"""
    
    # Encode the image
    print(f"📸 Encoding image from: {image_path}")
    base64_image = encode_image(image_path)
    print(f"✅ Image encoded successfully (size: {len(base64_image)} characters)")
    
    # Prepare the request
    url = "http://localhost:8000/save_page"
    data = {
        "url": "https://leetcode.com/problems/3sum/",
        "title": "3Sum Problem - LeetCode",
        "screenshot": base64_image
    }
    
    print("\n🚀 Sending request to save_page endpoint...")
    print(f"URL: {data['url']}")
    print(f"Title: {data['title']}")
    
    try:
        # Send POST request
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Success! Page saved with AI analysis")
            print(f"\n📝 Memory ID: {result['memory_id']}")
            print(f"\n🤖 AI Summary:\n{result['summary']}")
            print(f"\n⏰ Timestamp: {result['timestamp']}")
            
            return result
        else:
            print(f"\n❌ Error: {response.status_code}")
            print("Response:", response.text)
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection error. Make sure the server is running on http://localhost:8000")
        print("Start the server with: python -m guide_creator_flow.server")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

def search_saved_pages(query):
    """Search through saved pages"""
    print(f"\n🔍 Searching for: {query}")
    
    url = "http://localhost:8000/search"
    data = {
        "query": f"/memory search {query}"
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            print("\n📊 Search Results:")
            print(result['summary'])
        else:
            print(f"Search failed: {response.status_code}")
    except Exception as e:
        print(f"Search error: {e}")

if __name__ == "__main__":
    # Test with the provided image
    image_path = "/Users/barathwajanandan/Documents/3sumquesiton.png"
    
    print("="*60)
    print("🧪 Testing Save Page with Screenshot")
    print("="*60)
    
    # Save the page
    result = test_save_page_with_image(image_path)
    
    if result:
        # Wait a moment then search for it
        print("\n" + "="*60)
        print("🔍 Testing Search Functionality")
        print("="*60)
        
        # Search for the saved page
        search_saved_pages("3sum algorithm")
        search_saved_pages("leetcode") 