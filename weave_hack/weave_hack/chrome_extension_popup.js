// popup.js - Chrome Extension Popup Script

// Show status message
function showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${isError ? 'error' : 'success'}`;
    status.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}

// Save current page
document.getElementById('savePage').addEventListener('click', async () => {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // Capture screenshot
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png',
            quality: 100
        });
        
        // Remove data URL prefix
        const base64Screenshot = screenshot.replace(/^data:image\/png;base64,/, '');
        
        // Show loading status
        showStatus('Saving page...');
        
        // Send to API
        const response = await fetch('http://localhost:8000/save_page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: tab.url,
                title: tab.title,
                screenshot: base64Screenshot
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showStatus('✅ Page saved successfully!');
        } else {
            throw new Error('Failed to save page');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus('❌ Failed to save page', true);
    }
});

// Quick chat button
document.getElementById('quickChat').addEventListener('click', async () => {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // Open chat with current page context
        const chatQuery = `Tell me about this page: ${tab.title} (${tab.url})`;
        
        const response = await fetch('http://localhost:8000/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: chatQuery
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            displayResults([{
                type: 'chat',
                content: result.summary
            }]);
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus('❌ Chat failed', true);
    }
});

// Search functionality
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (!query) {
        document.getElementById('results').innerHTML = '';
        return;
    }
    
    // Debounce search
    searchTimeout = setTimeout(async () => {
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
                displaySearchResults(result.summary);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 500);
});

// Display search results
function displaySearchResults(summary) {
    const resultsDiv = document.getElementById('results');
    
    // Parse the summary to extract memory items
    // This is a simple parser - you might want to make it more sophisticated
    const lines = summary.split('\n');
    const memories = [];
    let currentMemory = null;
    
    lines.forEach(line => {
        if (line.includes('URL:')) {
            if (currentMemory) memories.push(currentMemory);
            currentMemory = { url: line.replace('URL:', '').trim() };
        } else if (line.includes('Title:') && currentMemory) {
            currentMemory.title = line.replace('Title:', '').trim();
        } else if (line.includes('Summary:') && currentMemory) {
            currentMemory.summary = line.replace('Summary:', '').trim();
        }
    });
    if (currentMemory) memories.push(currentMemory);
    
    // Display results
    resultsDiv.innerHTML = memories.map(mem => `
        <div class="result-item">
            <a href="${mem.url}" class="result-url" target="_blank">
                ${mem.title || mem.url}
            </a>
            <div class="result-summary">
                ${mem.summary || 'No summary available'}
            </div>
        </div>
    `).join('');
}

// Display general results (for chat responses)
function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = results.map(result => {
        if (result.type === 'chat') {
            return `
                <div class="result-item">
                    <div style="white-space: pre-wrap;">${result.content}</div>
                </div>
            `;
        }
        return '';
    }).join('');
} 