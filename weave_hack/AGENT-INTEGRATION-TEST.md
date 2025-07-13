# Testing Agent Integration in Chrome Extension

## Prerequisites

1. **Start the Agent Server**
   ```bash
   cd automate
   npm run agent-server
   ```
   
   You should see:
   ```
   🤖 Stagehand Agent Server
   📡 HTTP API: http://localhost:3456
   🔌 WebSocket: ws://localhost:3456
   ```

2. **Load the Chrome Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` directory

## Testing Steps

### 1. Basic Connection Test
1. Click the extension icon to open the sidebar
2. Click on the "Automation" tab
3. Check the connection indicator (should show green "Connected")

### 2. Simple Automation Test
Try these example tasks:

**Test 1: Google Search**
```
Go to google.com and search for "Chrome extensions development"
```

**Test 2: Screenshot**
```
Navigate to github.com and take a screenshot of the homepage
```

**Test 3: Multi-step Task**
```
Go to wikipedia.org, search for "artificial intelligence", and extract the first paragraph
```

### 3. Features to Verify

- [ ] Connection status indicator works
- [ ] Tasks can be created from the input field
- [ ] Real-time progress updates appear
- [ ] Screenshots are displayed in the task details
- [ ] Task status changes (pending → running → completed)
- [ ] Error messages display for failed tasks
- [ ] Multiple tasks can run sequentially

### 4. Troubleshooting

**Extension doesn't load:**
- Check console for errors in `chrome://extensions/`
- Ensure `dist/` directory exists after build

**Agent not connected:**
- Verify server is running on port 3456
- Check browser console for WebSocket errors
- Try refreshing the extension

**Tasks fail immediately:**
- Check agent server logs for errors
- Ensure Chrome is installed at expected location
- Verify `.env` file exists in `automate/` with API key

## Advanced Testing

### Testing Data Extraction
```
Go to news.ycombinator.com and extract the titles of the top 5 stories
```

### Testing Form Filling
```
Go to example.com and find any form fields to demonstrate interaction
```

### Testing Navigation
```
Start at google.com, search for "OpenAI", click the first result, and take a screenshot
```

## Success Criteria

✅ Extension loads without errors
✅ Agent server connection established
✅ Tasks execute with visual progress
✅ Screenshots captured and displayed
✅ Extracted data shown in results
✅ Error handling works gracefully 