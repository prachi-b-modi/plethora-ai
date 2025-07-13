#!/usr/bin/env python3
"""Test script for the analyze_tabs endpoint."""

import base64
import json
import requests
from pathlib import Path


def image_to_base64(image_path):
    """Convert an image file to base64 data URL."""
    with open(image_path, "rb") as f:
        image_data = f.read()
    base64_data = base64.b64encode(image_data).decode('utf-8')
    return f"data:image/png;base64,{base64_data}"


def test_analyze_tabs():
    """Test the analyze_tabs endpoint with local images."""
    
    # You can modify these paths to use your own images
    # For testing, let's use any PNG files in the screenshots directory
    screenshots_dir = Path("screenshots")
    
    if not screenshots_dir.exists():
        print("No screenshots directory found. Creating test images...")
        # For demo, we'll just show the structure
        print("\nTo test, you need images. You can:")
        print("1. Take screenshots with the Chrome extension")
        print("2. Place PNG files in the screenshots directory")
        print("3. Modify this script to point to your images")
        return
    
    # Find PNG files
    png_files = list(screenshots_dir.glob("*.png"))[:3]  # Limit to 3 for testing
    
    if not png_files:
        print("No PNG files found in screenshots directory")
        return
    
    print(f"Found {len(png_files)} images to analyze")
    
    # Convert images to base64
    images = []
    for img_path in png_files:
        print(f"Processing: {img_path.name}")
        images.append(image_to_base64(img_path))
    
    # Prepare request
    payload = {
        "images": images,
        "query": "What is shown in these screenshots? Compare and contrast their content."
    }
    
    # Send request
    print("\nSending request to analyze_tabs endpoint...")
    response = requests.post(
        "http://localhost:8000/analyze_tabs",
        json=payload
    )
    
    # Handle response
    if response.status_code == 200:
        result = response.json()
        print("\n✅ Success!")
        print("\nAnalysis:")
        print(result.get("data", "No data"))
    else:
        print(f"\n❌ Error: {response.status_code}")
        print(response.text)


if __name__ == "__main__":
    test_analyze_tabs() 