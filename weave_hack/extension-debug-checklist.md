# Extension Debug Checklist for Save Page Feature

## 1. Reload the Extension
1. Go to `chrome://extensions/`
2. Find your "Dynamic Script Runner" extension
3. Click the refresh/reload button (circular arrow icon)
4. **Important**: Also reload any tabs where you're testing

## 2. Check the Save Page Button is Visible
1. Open any webpage
2. Click the extension icon to open sidebar
3. Look for these 3 buttons at the bottom:
   - 🔍 Show Page Info
   - 💾 Export as JSON
   - 📸 Save Current Page ← This should be visible

## 3. Check Console Logs

### A. Main Page Console (F12)
When you click "Save Page", you should see:
```
[Sidebar] Saving current page to memory...
```

### B. Service Worker Console
1. Go to `chrome://extensions/`
2. Click "service worker" link under your extension
3. When Save Page is clicked, look for:
```
[Background] Saving current page to memory...
[Background] Page saved successfully: {...}
```

### C. Check for Errors
Common errors and solutions:

**Error: "Failed to fetch"**
- Backend is not running at http://localhost:8000
- Run your backend server

**Error: "CORS"**
- Backend needs to allow chrome-extension:// origins
- Add CORS headers to your backend

**Error: "Cannot read properties of undefined"**
- Extension not properly loaded
- Reload extension and refresh page

## 4. Test Backend Separately
Open the test file in Chrome:
```
file:///path/to/your/project/test-extension-debug.html
```
Click "Test Backend Directly" button

## 5. Manual Test with Console
In the sidebar iframe console, try:
```javascript
// Test if the function exists
console.log(typeof saveCurrentPage);

// Try calling it directly
saveCurrentPage();
```

## 6. Check Network Tab
1. Open DevTools Network tab
2. Click Save Page button
3. Look for POST request to http://localhost:8000/save_page
4. Check request/response details

## 7. Quick Fix Steps
1. Hard reload extension (Ctrl+Shift+R on chrome://extensions)
2. Close all tabs with the extension open
3. Open a fresh tab
4. Click extension icon to open sidebar
5. Try Save Page button again

## If Still Not Working
1. Check if button text shows "📸 Save Current Page" (not just "📸 Save Page")
2. In console, run: `document.querySelectorAll('button')` to see all buttons
3. Check if the button has click handler: 
   ```javascript
   Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save')).onclick
   ``` 