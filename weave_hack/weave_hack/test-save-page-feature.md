# Testing the Save Page Feature

## Prerequisites

1. **Backend Server**: Make sure your backend server is running at `http://localhost:8000`
   - The server should have the `/save_page` endpoint that accepts:
     ```json
     {
       "url": "page URL",
       "title": "page title",
       "screenshot": "base64 image data"
     }
     ```

2. **Chrome Extension**: The extension has been built and is ready in the `dist` folder

## Installation Steps

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from your project
5. The extension should appear with the name from your manifest

## Testing Steps

### 1. Open the Extension Sidebar
- Navigate to any webpage (e.g., https://example.com)
- Click the extension icon in Chrome toolbar
- The sidebar should open on the right side

### 2. Test the Save Page Button
- In the sidebar, you should see three buttons:
  - 🔍 Show Page Info
  - 💾 Export as JSON  
  - 📸 Save Page (NEW!)
- Click the "📸 Save Page" button

### 3. Expected Behavior

**If backend is running:**
- You'll see: "📸 Capturing page and saving to memory..."
- Then a success message with:
  - Page title
  - URL
  - Memory ID (e.g., mem_20250712155507)
  - Summary preview (first 200 chars)

**If backend is NOT running:**
- You'll see an error message: "❌ Error saving page: Failed to fetch"
- With a note to make sure backend server is running

### 4. Verify Backend Receipt
Check your backend server logs to confirm it received:
- The page URL
- The page title
- The screenshot as base64 data

## Troubleshooting

1. **Button not visible**: 
   - Hard refresh the extension (chrome://extensions/ → click refresh icon)
   - Reload the webpage and reopen sidebar

2. **"Failed to fetch" error**:
   - Check if backend is running: `curl http://localhost:8000/save_page`
   - Check for CORS issues in backend

3. **Permission errors**:
   - Make sure manifest.json includes:
     - `"tabs"` permission
     - `"activeTab"` permission
     - `"<all_urls>"` or specific host permissions

## What's Happening Behind the Scenes

1. **Sidebar (chat.js)**: 
   - User clicks button → sends `SAVE_PAGE_TO_MEMORY` message to background

2. **Background (service-worker.ts)**:
   - Gets current tab info
   - Takes screenshot with `chrome.tabs.captureVisibleTab()`
   - Converts to base64
   - Sends to backend API

3. **Backend**:
   - Receives page data
   - Processes/stores it
   - Returns summary and memory_id

4. **Sidebar**: 
   - Shows success/error message to user 