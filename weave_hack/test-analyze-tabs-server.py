#!/usr/bin/env python3
"""
Simple test server to verify analyze_tabs endpoint is being called
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/analyze_tabs', methods=['POST'])
def analyze_tabs():
    print("\n" + "="*50)
    print(f"[{datetime.now()}] Received analyze_tabs request")
    print("="*50)
    
    try:
        data = request.get_json()
        
        # Log request details
        print(f"Query: {data.get('query', 'No query')}")
        print(f"Number of images: {len(data.get('images', []))}")
        
        # Log image sizes
        for i, image in enumerate(data.get('images', [])):
            if image.startswith('data:'):
                # Extract base64 part
                base64_part = image.split(',')[1] if ',' in image else image
            else:
                base64_part = image
            
            # Calculate size
            size = len(base64_part) * 3 / 4 / 1024  # Approximate size in KB
            print(f"Image {i+1}: ~{size:.1f} KB")
        
        # Return a test response
        response = {
            "answer": f"Test response: Analyzed {len(data.get('images', []))} tabs. Query was: {data.get('query', 'No query')}",
            "response": "This is a test server response"
        }
        
        print(f"Sending response: {response}")
        print("="*50 + "\n")
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/save_page', methods=['POST'])
def save_page():
    print(f"\n[{datetime.now()}] Received save_page request")
    data = request.get_json()
    print(f"URL: {data.get('url', 'No URL')}")
    
    return jsonify({
        "success": True,
        "memory_id": "test_memory_123",
        "summary": "Test summary of the page"
    })

if __name__ == '__main__':
    print("Starting test server on http://localhost:8000")
    print("Endpoints:")
    print("  - POST /analyze_tabs")
    print("  - POST /save_page")
    print("\nWaiting for requests...\n")
    
    app.run(host='0.0.0.0', port=8000, debug=True) 