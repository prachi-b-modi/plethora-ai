# Testing the @tab Screenshot Analysis Feature

## Overview
The @tab feature allows you to reference multiple browser tabs in your message, automatically capture screenshots of them, and send them to your backend for analysis.

## How It Works

1. **Type @** - Shows dropdown of all open tabs
2. **Select tabs** - Click or press Enter to insert tab references
3. **Screenshots captured** - Each selected tab gets a screenshot (you'll see 📸 → ✅)
4. **Send message** - Screenshots are sent to backend with your query

## Testing Steps

### 1. Setup
- Ensure backend is running at `http://localhost:8000`
- Backend should have `/analyze_tabs` endpoint accepting:
  ```json
  {
    "images": ["data:image/png;base64,...", "data:image/png;base64,..."],
    "query": "Your question about the tabs"
  }
  ```

### 2. Reload Extension
1. Go to `chrome://extensions/`
2. Click refresh button on your extension
3. Reload any test tabs

### 3. Test Tab References
1. Open multiple tabs (e.g., Amazon, GitHub, Google)
2. Open extension sidebar on any tab
3. Type `@` in the message input
4. You should see dropdown with all tabs
5. Select a tab - it inserts as `@tab[Title](URL) 📸`
6. Wait for 📸 to change to ✅ (screenshot captured)

### 4. Test Multi-Tab Analysis
1. Type a message like:
   ```
   Compare the pricing between @tab[Amazon](https://amazon.com) ✅ and @tab[Best Buy](https://bestbuy.com) ✅
   ```
2. Press Send
3. Check backend receives:
   - Two base64 encoded images
   - Your query text

### 5. Visual Indicators
- **📸** = Capturing screenshot
- **✅** = Screenshot captured successfully  
- **❌** = Failed to capture screenshot

## Common Issues

### "No screenshots found"
- Wait for ✅ indicator before sending
- Tab might be protected (chrome:// URLs can't be captured)

### Tab switches when selecting
- Normal behavior - extension needs to switch to tab to capture it
- Will return to original tab after capture

### Screenshot capture fails
- Check if tab has special permissions
- Some tabs (PDFs, chrome:// pages) can't be captured

## Backend Response Format
The backend should return:
```json
{
  "answer": "The pricing information shows...",
  "response": "Alternative response field"
}
```

## Example Queries
- "Which tab has the lowest price for this product?"
- "Compare the features shown in these tabs"
- "What's different between these two pages?"
- "Find the contact information in @tab[Company Page](url)" 