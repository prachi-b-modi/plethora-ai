// Chrome Extension Example: Multi-Tab Analyzer
// This example shows how to capture screenshots from multiple tabs and analyze them

// manifest.json
const manifestExample = {
  "manifest_version": 3,
  "name": "Multi-Tab Analyzer",
  "version": "1.0",
  "description": "Capture and analyze multiple browser tabs with AI",
  "permissions": [
    "activeTab",
    "tabs",
    "storage"
  ],
  "host_permissions": [
    "http://localhost:8000/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    }
  }
};

// background.js
const backgroundScript = `
// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureTabs') {
    captureMultipleTabs(request.tabIds, request.query)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function captureMultipleTabs(tabIds, query) {
  const screenshots = [];
  
  for (const tabId of tabIds) {
    try {
      // Switch to tab and capture
      await chrome.tabs.update(tabId, { active: true });
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for tab to load
      
      const dataUrl = await chrome.tabs.captureVisibleTab();
      screenshots.push(dataUrl);
    } catch (error) {
      console.error(\`Failed to capture tab \${tabId}:\`, error);
    }
  }
  
  if (screenshots.length === 0) {
    throw new Error('No screenshots captured');
  }
  
  // Send to backend
  const response = await fetch('http://localhost:8000/analyze_tabs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: screenshots,
      query: query
    })
  });
  
  if (!response.ok) {
    throw new Error(\`Server error: \${response.status}\`);
  }
  
  return await response.json();
}
`;

// popup.html
const popupHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 400px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333;
    }
    .section {
      margin-bottom: 20px;
    }
    .tab-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 10px;
    }
    .tab-item {
      display: flex;
      align-items: center;
      padding: 5px;
      margin-bottom: 5px;
      background: #f5f5f5;
      border-radius: 3px;
      font-size: 14px;
    }
    .tab-item input {
      margin-right: 10px;
    }
    .tab-item label {
      flex: 1;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      resize: vertical;
      min-height: 60px;
      box-sizing: border-box;
    }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
    }
    button:hover {
      background: #45a049;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .status {
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
      font-size: 14px;
    }
    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .status.loading {
      background: #cce5ff;
      color: #004085;
      border: 1px solid #b8daff;
    }
    .result {
      margin-top: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      font-size: 13px;
      line-height: 1.5;
    }
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    .controls button {
      flex: 1;
      padding: 5px 10px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>🔍 Multi-Tab Analyzer</h1>
  
  <div class="section">
    <div class="controls">
      <button id="selectAll">Select All</button>
      <button id="selectNone">Select None</button>
    </div>
    <div class="tab-list" id="tabList">
      <!-- Tabs will be populated here -->
    </div>
  </div>
  
  <div class="section">
    <textarea id="query" placeholder="Ask a question about the selected tabs...
Examples:
• Which tabs contain pricing information?
• Compare the main topics across these tabs
• Find tabs mentioning AI or machine learning
• What's the common theme between all tabs?"></textarea>
  </div>
  
  <button id="analyzeBtn">Analyze Selected Tabs</button>
  
  <div id="status"></div>
  <div id="result"></div>
  
  <script src="popup.js"></script>
</body>
</html>
`;

// popup.js
const popupScript = `
document.addEventListener('DOMContentLoaded', async () => {
  const tabList = document.getElementById('tabList');
  const queryInput = document.getElementById('query');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const statusDiv = document.getElementById('status');
  const resultDiv = document.getElementById('result');
  const selectAllBtn = document.getElementById('selectAll');
  const selectNoneBtn = document.getElementById('selectNone');
  
  // Load all tabs
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Populate tab list
  tabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = 'tab-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = \`tab-\${tab.id}\`;
    checkbox.value = tab.id;
    checkbox.checked = tab.active; // Auto-select active tab
    
    const label = document.createElement('label');
    label.htmlFor = \`tab-\${tab.id}\`;
    label.textContent = tab.title || 'Untitled';
    label.title = tab.url;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    tabList.appendChild(item);
  });
  
  // Select all/none buttons
  selectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('#tabList input[type="checkbox"]').forEach(cb => {
      cb.checked = true;
    });
  });
  
  selectNoneBtn.addEventListener('click', () => {
    document.querySelectorAll('#tabList input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
  });
  
  // Analyze button
  analyzeBtn.addEventListener('click', async () => {
    const selectedTabs = Array.from(document.querySelectorAll('#tabList input:checked'))
      .map(cb => parseInt(cb.value));
    
    const query = queryInput.value.trim();
    
    if (selectedTabs.length === 0) {
      showStatus('Please select at least one tab', 'error');
      return;
    }
    
    if (!query) {
      showStatus('Please enter a question', 'error');
      return;
    }
    
    // Disable button and show loading
    analyzeBtn.disabled = true;
    showStatus(\`Capturing \${selectedTabs.length} tab(s)...\`, 'loading');
    resultDiv.textContent = '';
    
    try {
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'captureTabs',
        tabIds: selectedTabs,
        query: query
      });
      
      if (response.success) {
        showStatus('Analysis complete!', 'success');
        resultDiv.textContent = response.data.data;
      } else {
        showStatus(\`Error: \${response.error}\`, 'error');
      }
    } catch (error) {
      showStatus(\`Error: \${error.message}\`, 'error');
    } finally {
      analyzeBtn.disabled = false;
    }
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = \`status \${type}\`;
  }
});
`;

// Example usage from any webpage (content script or injected code)
const webpageUsageExample = `
// Direct API usage from a webpage
async function analyzeMultipleTabs() {
  // This would need to be called from an extension context
  // or you'd need to implement your own screenshot capture method
  
  const screenshots = [
    // Array of base64 encoded images or data URLs
    "data:image/png;base64,iVBORw0KG...",
    "data:image/png;base64,iVBORw0KG...",
  ];
  
  const response = await fetch('http://localhost:8000/analyze_tabs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: screenshots,
      query: "Which of these pages has the best documentation for React hooks?"
    })
  });
  
  const result = await response.json();
  console.log(result.data);
}
`;

console.log('Chrome Extension Multi-Tab Analyzer Example Created!');
console.log('Files needed:');
console.log('1. manifest.json');
console.log('2. background.js');
console.log('3. popup.html');
console.log('4. popup.js');
console.log('');
console.log('The extension allows users to:');
console.log('- Select multiple tabs to analyze');
console.log('- Ask questions about the content across all selected tabs');
console.log('- Get AI-powered analysis comparing and contrasting the tabs'); 