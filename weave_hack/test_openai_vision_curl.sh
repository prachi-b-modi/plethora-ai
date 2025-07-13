#!/bin/bash
# Test OpenAI Vision API with a screenshot

# Check if image file is provided
if [ -z "$1" ]; then
    echo "Usage: ./test_openai_vision_curl.sh <image_file>"
    echo "Example: ./test_openai_vision_curl.sh screenshots/screenshot_20250712_162300.png"
    exit 1
fi

IMAGE_PATH="$1"

# Check if file exists
if [ ! -f "$IMAGE_PATH" ]; then
    echo "Error: File not found: $IMAGE_PATH"
    exit 1
fi

# Encode image to base64
BASE64_IMAGE=$(base64 -i "$IMAGE_PATH")

# Create request JSON
cat > /tmp/vision_request.json << EOF
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What's in this image? Describe what you see."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,${BASE64_IMAGE}"
          }
        }
      ]
    }
  ],
  "max_tokens": 300
}
EOF

echo "Testing OpenAI Vision API with: $IMAGE_PATH"
echo "Request size: $(wc -c < /tmp/vision_request.json) bytes"

# Make the API call
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d @/tmp/vision_request.json

echo "" 