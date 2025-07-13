#!/usr/bin/env python3
"""
Test script to demonstrate saving a web page from a screenshot.
This simulates what a browser extension would do.
"""
import base64
import requests
import json

# For testing, we'll create a simple test image
# In a real browser extension, this would be a screenshot
def create_test_image_base64():
    """Create a simple test image and encode it as base64."""
    # In a real scenario, this would be the screenshot from the browser
    # For testing, let's use a minimal PNG
    # This is a 1x1 red pixel PNG
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd4c\x00\x00\x00\x00IEND\xaeB`\x82'
    return base64.b64encode(png_data).decode('utf-8')

def test_save_page_with_screenshot():
    """Test the save_page endpoint with a screenshot."""
    
    # API endpoint
    url = "http://localhost:8000/save_page"
    
    # Prepare the request data
    data = {
        "url": "https://www.example.com/test-page",
        "title": "Test Page - Example Domain",
        "screenshot": create_test_image_base64(),
        "content": "This is fallback text content in case image analysis fails."
    }
    
    print("🚀 Sending screenshot to save_page endpoint...")
    print(f"URL: {data['url']}")
    print(f"Title: {data['title']}")
    print(f"Screenshot size: {len(data['screenshot'])} characters (base64)")
    
    try:
        # Send POST request
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Success!")
            print(f"Memory ID: {result['memory_id']}")
            print(f"Summary: {result['summary']}")
            print(f"Timestamp: {result['timestamp']}")
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(response.json())
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection error. Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

def example_browser_extension_code():
    """Example JavaScript code for a browser extension."""
    
    print("\n\n📋 Example Browser Extension Code:")
    print("=" * 50)
    print(r"""
// In your browser extension's content script or popup:

async function saveCurrentPage() {
    // Get current tab info
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // Capture screenshot
    const screenshot = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
    
    // Remove data URL prefix to get base64
    const base64Screenshot = screenshot.replace(/^data:image\/png;base64,/, '');
    
    // Prepare data
    const data = {
        url: tab.url,
        title: tab.title,
        screenshot: base64Screenshot
    };
    
    // Send to your API
    try {
        const response = await fetch('http://localhost:8000/save_page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Page saved!', result);
            // Show success notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Page Saved!',
                message: `Summary: ${result.summary.substring(0, 100)}...`
            });
        } else {
            console.error('Failed to save page', await response.json());
        }
    } catch (error) {
        console.error('Error saving page:', error);
    }
}

// Add to your extension's popup or background script
chrome.action.onClicked.addListener((tab) => {
    saveCurrentPage();
});
""")
    print("=" * 50)

if __name__ == "__main__":
    test_save_page_with_screenshot()
    example_browser_extension_code() 