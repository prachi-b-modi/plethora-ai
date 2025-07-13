#!/usr/bin/env python
"""
Example client for the Web Search Assistant API
Shows how to make requests to the search endpoints
"""

import requests
import json
import time
from typing import Dict, Any

# API Configuration
API_BASE_URL = "http://localhost:8000"

def test_health_check() -> Dict[str, Any]:
    """Test the health check endpoint"""
    print("🔍 Testing health check endpoint...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        response.raise_for_status()
        
        result = response.json()
        print("✅ Health check successful!")
        print(f"   Status: {result['status']}")
        print(f"   Service: {result['service']}")
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return {}

def search_post_request(query: str, include_sources: bool = True) -> Dict[str, Any]:
    """Make a POST request to the search endpoint"""
    print(f"\n🔍 Searching via POST: '{query}'")
    
    try:
        payload = {
            "query": query,
            "include_sources": include_sources
        }
        
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/search",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        request_time = time.time() - start_time
        
        result = response.json()
        
        print(f"✅ Search completed!")
        print(f"   Query: {result['query']}")
        print(f"   Status: {result['status']}")
        print(f"   Processing Time: {result['processing_time']}s")
        print(f"   Request Time: {request_time:.2f}s")
        print(f"   Summary Length: {len(result['summary'])} characters")
        print(f"\n📄 Summary Preview:")
        print(f"   {result['summary'][:200]}...")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Search failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"   Error details: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"   Error response: {e.response.text}")
        return {}

def search_get_request(query: str) -> Dict[str, Any]:
    """Make a GET request to the search endpoint"""
    print(f"\n🔍 Searching via GET: '{query}'")
    
    try:
        # URL encode the query
        import urllib.parse
        encoded_query = urllib.parse.quote(query)
        
        start_time = time.time()
        response = requests.get(f"{API_BASE_URL}/search/{encoded_query}")
        response.raise_for_status()
        request_time = time.time() - start_time
        
        result = response.json()
        
        print(f"✅ Search completed!")
        print(f"   Query: {result['query']}")
        print(f"   Status: {result['status']}")
        print(f"   Processing Time: {result['processing_time']}s")
        print(f"   Request Time: {request_time:.2f}s")
        print(f"   Summary Length: {len(result['summary'])} characters")
        print(f"\n📄 Summary Preview:")
        print(f"   {result['summary'][:200]}...")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Search failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"   Error details: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"   Error response: {e.response.text}")
        return {}

def get_api_info() -> Dict[str, Any]:
    """Get API information"""
    print("\n📚 Getting API information...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/info")
        response.raise_for_status()
        
        result = response.json()
        print("✅ API info retrieved!")
        print(f"   Service: {result['service']}")
        print(f"   Version: {result['version']}")
        print(f"   Description: {result['description']}")
        print(f"   Available endpoints: {len(result['endpoints'])}")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to get API info: {e}")
        return {}

def main():
    """Run example API calls"""
    print("🚀 Web Search Assistant API Client Example")
    print("=" * 60)
    
    # Test health check
    health_result = test_health_check()
    if not health_result:
        print("❌ Server is not running. Please start the server first with: python -m guide_creator_flow.server")
        return
    
    # Get API info
    get_api_info()
    
    # Example search queries
    example_queries = [
        "latest developments in renewable energy 2024",
        "artificial intelligence breakthrough news",
        "sustainable technology trends"
    ]
    
    print(f"\n🔍 Running example searches...")
    
    for i, query in enumerate(example_queries[:1], 1):  # Just run one for demo
        print(f"\n--- Example {i} ---")
        
        # Try POST request
        result_post = search_post_request(query, include_sources=True)
        
        if result_post:
            print(f"\n📄 Full Summary:")
            print("-" * 40)
            print(result_post['summary'])
            print("-" * 40)
        
        # You can also try GET request
        # result_get = search_get_request(query)
        
        break  # Only run one example for demo
    
    print(f"\n✅ Example completed!")
    print(f"💡 Try the interactive docs at: {API_BASE_URL}/docs")

if __name__ == "__main__":
    main() 