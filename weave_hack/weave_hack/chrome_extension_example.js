// Chrome Extension Example - Save Page with Screenshot
// This code would go in your Chrome extension's background script or popup

async function saveCurrentPageWithScreenshot() {
    try {
        // Get current tab info
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // Capture screenshot of the visible tab
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png',
            quality: 100
        });
        
        // Remove data URL prefix to get base64
        // screenshot comes as "data:image/png;base64,xxxxx"
        const base64Screenshot = screenshot.replace(/^data:image\/png;base64,/, '');
        
        // Prepare data for API
        const requestData = {
            url: tab.url,
            title: tab.title,
            screenshot: base64Screenshot
        };
        
        // Send to your API
        const response = await fetch('http://localhost:8000/save_page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Page saved successfully!', result);
            
            // Show success notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon-128.png',
                title: 'Page Saved!',
                message: `Saved: ${tab.title}\nSummary: ${result.summary.substring(0, 100)}...`
            });
            
            return result;
        } else {
            const error = await response.json();
            console.error('Failed to save page:', error);
            
            // Show error notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon-128.png',
                title: 'Save Failed',
                message: 'Could not save the page. Check console for details.'
            });
        }
    } catch (error) {
        console.error('Error saving page:', error);
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon-128.png',
            title: 'Error',
            message: `Error: ${error.message}`
        });
    }
}

// Example: Add context menu item to save pages
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'save-page-screenshot',
        title: 'Save page to memory (with screenshot)',
        contexts: ['page']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'save-page-screenshot') {
        saveCurrentPageWithScreenshot();
    }
});

// Example: Add keyboard shortcut handler
chrome.commands.onCommand.addListener((command) => {
    if (command === 'save-page') {
        saveCurrentPageWithScreenshot();
    }
});

// Example: Add browser action (toolbar button) click handler
chrome.action.onClicked.addListener((tab) => {
    saveCurrentPageWithScreenshot();
});

// Function to search saved pages
async function searchSavedPages(query) {
    try {
        const response = await fetch('http://localhost:8000/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `/memory search ${query}`
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.summary;
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Example manifest.json for your Chrome extension:
/*
{
    "manifest_version": 3,
    "name": "Web Memory - Save Pages with AI",
    "version": "1.0",
    "description": "Save web pages with screenshots and AI-generated summaries",
    
    "permissions": [
        "activeTab",
        "tabs",
        "contextMenus",
        "notifications",
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
    },
    
    "commands": {
        "save-page": {
            "suggested_key": {
                "default": "Ctrl+Shift+S",
                "mac": "Command+Shift+S"
            },
            "description": "Save current page to memory"
        }
    },
    
    "icons": {
        "16": "icon-16.png",
        "48": "icon-48.png",
        "128": "icon-128.png"
    }
}
*/ 