// Simple Chrome Extension Example - Just the essentials

// Function to save the current page
async function saveCurrentPage() {
    // 1. Get the current tab
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // 2. Take a screenshot
    const screenshot = await chrome.tabs.captureVisibleTab();
    
    // 3. Remove the data URL prefix (keep only base64 part)
    const base64Image = screenshot.replace('data:image/png;base64,', '');
    
    // 4. Send to your API
    const response = await fetch('http://localhost:8000/save_page', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: tab.url,
            title: tab.title,
            screenshot: base64Image
        })
    });
    
    // 5. Check if it worked
    if (response.ok) {
        const result = await response.json();
        console.log('✅ Saved!', result);
        alert(`Page saved! Summary: ${result.summary.substring(0, 100)}...`);
    } else {
        console.error('❌ Failed to save');
    }
}

// Call this function when user clicks your extension button
chrome.action.onClicked.addListener(() => {
    saveCurrentPage();
}); 