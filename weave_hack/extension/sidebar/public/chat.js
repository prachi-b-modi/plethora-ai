// Chat functionality for Dynamic Script Runner
let isLoading = false;
let pendingMessage = null;

// Store tab screenshots globally
const tabScreenshots = new Map();

function closeSidebar() {
    console.log('[Sidebar] Close button clicked');
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*');
    }
}

function executeTestScript() {
    console.log('[Sidebar] Executing test script...');
    
    const testScript = `
// Test script to change background to red
document.body.style.backgroundColor = 'red';
console.log('Background changed to red!');
alert('Test successful! Background should be red now.');`;
    
    // Show the script in the chat
    addMessage('📝 Executing test script:\n\n```javascript' + testScript + '\n```', 'ai');
    
    // Send the hardcoded test script to background
    chrome.runtime.sendMessage({
        type: 'EXECUTE_TEST_SCRIPT',
        code: testScript
    }, (response) => {
        console.log('[Sidebar] Test script response:', response);
        if (response && response.success) {
            addMessage('✅ Test script executed successfully! The background should be red now.', 'ai');
        } else {
            addMessage('❌ Test script failed: ' + (response?.error || 'Unknown error'), 'ai');
        }
    });
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(event);
    }
}

function sendMessage(event) {
    event.preventDefault();
    
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || isLoading) return;
    
    console.log('[Sidebar] Sending message:', message);
    
    // Check if message contains tab references BEFORE adding message (which clears tabs)
    const tabReferences = extractTabReferences(message);
    
    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Show loading
    isLoading = true;
    updateSendButton();
    showLoading();
    
    if (tabReferences.length > 0) {
        // Message contains tab references, handle it as a tab analysis request
        console.log('[Sidebar] ===== TAB ANALYSIS PATH =====');
        console.log('[Sidebar] Tab references found:', tabReferences.length, 'tabs');
        console.log('[Sidebar] Will call handleTabAnalysis...');
        handleTabAnalysis(message, tabReferences);
        console.log('[Sidebar] Called handleTabAnalysis');
    } else {
        // Regular message handling
        console.log('[Sidebar] ===== REGULAR CHAT PATH =====');
        console.log('[Sidebar] No tab references found, using regular chat');
        pendingMessage = message;
        window.parent.postMessage({ type: 'GET_PAGE_CONTEXT' }, '*');
    }
}

function extractTabReferences(message) {
    const textarea = document.getElementById('messageInput');
    const references = [];
    
    if (textarea.attachedTabs && textarea.attachedTabs.size > 0) {
        for (const [tabId, tabData] of textarea.attachedTabs) {
            references.push({
                tabId: tabId,
                title: tabData.title,
                url: tabData.url
            });
        }
    }
    
    console.log('[Sidebar] extractTabReferences - returning', references.length, 'references');
    return references;
}

function handleTabAnalysis(message, tabReferences) {
    console.log('[Sidebar] ===== HANDLING TAB ANALYSIS =====');
    console.log('[Sidebar] Message:', message);
    console.log('[Sidebar] Tab references:', tabReferences);
    console.log('[Sidebar] Tab screenshots map size:', tabScreenshots.size);
    console.log('[Sidebar] Tab screenshots:', Array.from(tabScreenshots.entries()));
    
    // Collect screenshots for referenced tabs
    const screenshots = [];
    const tabsWithScreenshots = [];
    
    // Find screenshots for each referenced tab
    for (const [tabId, tabData] of tabScreenshots) {
        if (tabReferences.some(ref => ref.url === tabData.url)) {
            screenshots.push(tabData.screenshot);
            tabsWithScreenshots.push({
                title: tabData.title,
                url: tabData.url
            });
        }
    }
    
    console.log('[Sidebar] Found screenshots:', screenshots.length);
    
    if (screenshots.length === 0) {
        addMessage('❌ No screenshots found for the referenced tabs. Please select tabs using @ before sending.', 'ai');
        isLoading = false;
        updateSendButton();
        hideLoading();
        return;
    }
    
    console.log('[Sidebar] Sending to analyze_tabs endpoint...');
    
    // Clean the message by removing @tab references
    let cleanedQuery = message;
    tabReferences.forEach(ref => {
        // Remove @TabTitle patterns from the message
        const tabPattern = new RegExp(`@${ref.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
        cleanedQuery = cleanedQuery.replace(tabPattern, '');
    });
    cleanedQuery = cleanedQuery.trim();
    
    console.log('[Sidebar] Original message:', message);
    console.log('[Sidebar] Cleaned query:', cleanedQuery);
    console.log('[Sidebar] About to POST to /analyze_tabs with', screenshots.length, 'screenshots');
    
    // Get current tab URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTabUrl = tabs[0]?.url || '';
        
        // Collect all tab URLs (referenced tabs + current tab)
        const tabUrls = [...tabReferences.map(ref => ref.url)];
        if (currentTabUrl && !tabUrls.includes(currentTabUrl)) {
            tabUrls.push(currentTabUrl);
        }
        
        console.log('[Sidebar] Current tab URL:', currentTabUrl);
        console.log('[Sidebar] All tab URLs:', tabUrls);
        
        // Send to analyze_tabs endpoint
        fetch('http://localhost:8000/analyze_tabs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                images: screenshots,
                query: cleanedQuery,
                tabs: tabReferences,  // Include tab data with URLs
                tab_urls: tabUrls     // Array of all URLs for transcript extraction
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            hideLoading();
            
            console.log('[Sidebar] Received response:', result);
            
            // Format the response - check multiple possible fields
            let responseMessage = result.data || result.answer || result.response || result.message || 'Analysis complete.';
            
            // Clean up the response by removing any intro text
            responseMessage = responseMessage.replace(/^.*?let's start with the sections you have:\s*/i, '');
            responseMessage = responseMessage.replace(/^To create.*?:\s*/i, '');
            
            // Format the clean response with analyzed tabs
            const formattedResponse = `${responseMessage.trim()}\n\n**Analyzed tabs:**\n${tabsWithScreenshots.map((tab, index) => `${index + 1}. ${tab.title}`).join('\n')}`;
            
            addMessage(formattedResponse, 'ai');
        })
        .catch(error => {
            hideLoading();
            console.error('[Sidebar] Error analyzing tabs:', error);
            addMessage(`❌ Error analyzing tabs: ${error.message}\n\nMake sure your backend server is running at http://localhost:8000`, 'ai');
        })
        .finally(() => {
            isLoading = false;
            updateSendButton();
        });
    });
}

function addMessage(content, sender) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = `message-avatar ${sender}`;
    avatar.textContent = sender === 'ai' ? '🤖' : '👤';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Enhanced markdown processing
    let formattedContent = content;
    
    // Handle attached tabs for user messages
    if (sender === 'user') {
        const textarea = document.getElementById('messageInput');
        
        // Clear attached tabs after message is sent (but don't display them)
        if (textarea.attachedTabs && textarea.attachedTabs.size > 0) {
            textarea.attachedTabs.clear();
            // Update tab attachment preview if the function exists
            if (typeof updateTabAttachmentPreview === 'function') {
                updateTabAttachmentPreview(textarea);
            }
        }
    }
    
    // Handle commands with special styling (for user messages)
    if (sender === 'user') {
        // Check if the message starts with a command
        const commandMatch = content.match(/^(\/\w+)(\s+(.*))?$/);
        if (commandMatch) {
            const command = commandMatch[1];
            const args = commandMatch[3] || '';
            
            // Create styled command element
            formattedContent = `<span class="command-badge">${command}</span>${args ? ' ' + args : ''}`;
            
            // Add CSS for command badge if not already added
            if (!document.getElementById('command-styles')) {
                const style = document.createElement('style');
                style.id = 'command-styles';
                style.textContent = `
                    .command-badge {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-weight: 600;
                        font-size: 14px;
                        margin-right: 4px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        animation: commandPop 0.3s ease-out;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .command-badge::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                        animation: commandShine 0.5s ease-out;
                    }
                    
                    @keyframes commandPop {
                        0% {
                            transform: scale(0.8);
                            opacity: 0;
                        }
                        50% {
                            transform: scale(1.05);
                        }
                        100% {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                    
                    @keyframes commandShine {
                        0% {
                            left: -100%;
                        }
                        100% {
                            left: 100%;
                        }
                    }
                    
                    .message.user .command-badge {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    
                    /* Different colors for different commands */
                    .command-badge[data-command="/help"] {
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    }
                    
                    .command-badge[data-command="/web"] {
                        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                        color: #1565c0 !important;
                        border: 1px solid #90caf9;
                    }
                    
                    .command-badge[data-command="/memory"] {
                        background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
                        color: #c2185b !important;
                        border: 1px solid #f48fb1;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Update the formatted content to include data attribute
            formattedContent = `<span class="command-badge" data-command="${command}">${command}</span>${args ? ' ' + args : ''}`;
        }
    }
    
    // Handle bold text
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle bullet points
    formattedContent = formattedContent.replace(/^• /gm, '• ');
    
    // Also detect commands in AI responses and style them
    if (sender === 'ai') {
        formattedContent = formattedContent.replace(/(\*\*)?(\/(help|web|memory)(\s+\w+)?)\*\*/g, '<span class="command-badge" data-command="$2">$2</span>');
        formattedContent = formattedContent.replace(/(?<!\*)\/(help|web|memory)(\s+\w+)?/g, '<span class="command-badge" data-command="/$1">/$1</span>$2');
    }
    
    // Check if content contains code blocks
    if (formattedContent.includes('```')) {
        // Fix double backticks issue - remove duplicate ```javascript
        let cleanedContent = formattedContent.replace(/```javascript\s*```javascript/g, '```javascript');
        cleanedContent = cleanedContent.replace(/```\s*```/g, '```');
        
        // Parse and format code blocks
        formattedContent = cleanedContent.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
            // Clean up the code
            const cleanCode = code.trim();
            return `<pre style="background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.4;"><code>${escapeHtml(cleanCode)}</code></pre>`;
        });
    }
    
    // Convert markdown links to HTML links first
    formattedContent = convertMarkdownLinksToHtml(formattedContent);
    
    // Then convert any remaining plain URLs to clickable links
    formattedContent = convertUrlsToLinks(formattedContent);
    
    // Convert newlines to <br> but not inside <pre> tags
    const parts = formattedContent.split(/(<pre[\s\S]*<\/pre>)/);
    const finalContent = parts.map(part => {
        if (part.startsWith('<pre')) {
            return part;
        }
        return part.replace(/\n/g, '<br>');
    }).join('');
    
    messageContent.innerHTML = finalContent;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Function to convert markdown links [text](url) to HTML links
function convertMarkdownLinksToHtml(text) {
    // Match markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    return text.replace(markdownLinkRegex, (match, linkText, url) => {
        // Clean up the URL
        let cleanUrl = url.trim();
        
        // Add protocol if missing (for www. links)
        if (cleanUrl.toLowerCase().startsWith('www.')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="
            color: #007aff;
            text-decoration: none;
            border-bottom: 1px solid rgba(0, 122, 255, 0.3);
            transition: all 0.2s ease;
            padding: 1px 2px;
            border-radius: 3px;
        " onmouseover="
            this.style.backgroundColor='rgba(0, 122, 255, 0.1)';
            this.style.borderBottomColor='#007aff';
        " onmouseout="
            this.style.backgroundColor='transparent';
            this.style.borderBottomColor='rgba(0, 122, 255, 0.3)';
        ">${linkText}</a>`;
    });
}

// Function to convert URLs to clickable links
function convertUrlsToLinks(text) {
    // Don't process URLs inside existing HTML tags (like <pre>, <code>, etc.)
    if (text.includes('<pre') || text.includes('<code') || text.includes('<a ')) {
        return text;
    }
    
    // Comprehensive URL regex that matches http, https, ftp, and www links
    const urlRegex = /(https?:\/\/[^\s<>"']+|ftp:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[a-z]{2,}[^\s<>"']*)/gi;
    
    return text.replace(urlRegex, (url) => {
        // Clean up the URL - remove trailing punctuation that might not be part of the URL
        let cleanUrl = url.replace(/[.,;:!?]+$/, '');
        
        // Add protocol if missing (for www. links)
        let href = cleanUrl;
        if (cleanUrl.toLowerCase().startsWith('www.')) {
            href = 'https://' + cleanUrl;
        }
        
        // Truncate display text if URL is too long
        let displayUrl = cleanUrl;
        if (displayUrl.length > 50) {
            displayUrl = displayUrl.substring(0, 47) + '...';
        }
        
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="
            color: #007aff;
            text-decoration: none;
            border-bottom: 1px solid rgba(0, 122, 255, 0.3);
            transition: all 0.2s ease;
            padding: 1px 2px;
            border-radius: 3px;
        " onmouseover="
            this.style.backgroundColor='rgba(0, 122, 255, 0.1)';
            this.style.borderBottomColor='#007aff';
        " onmouseout="
            this.style.backgroundColor='transparent';
            this.style.borderBottomColor='rgba(0, 122, 255, 0.3)';
        ">${displayUrl}</a>`;
    });
}

function showLoading() {
    const messagesContainer = document.getElementById('messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai loading';
    loadingDiv.id = 'loading';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    avatar.textContent = '🤖';
    
    const loadingContent = document.createElement('div');
    loadingContent.className = 'message-content';
    loadingContent.innerHTML = '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
    
    loadingDiv.appendChild(avatar);
    loadingDiv.appendChild(loadingContent);
    
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

function updateSendButton() {
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = isLoading;
    sendBtn.innerHTML = isLoading ? '•••' : '↑';
}

function showDOMInfo() {
    console.log('[Sidebar] Requesting DOM info...');
    
    // Request page context to see DOM scan
    window.parent.postMessage({ type: 'GET_PAGE_CONTEXT' }, '*');
    
    // Set up one-time listener for the response
    const handleDOMResponse = (event) => {
        if (event.data.type === 'PAGE_CONTEXT') {
            window.removeEventListener('message', handleDOMResponse);
            
            const context = event.data.context;
            if (context.domElements) {
                const dom = context.domElements;
                let summary = `📊 DOM Scan Results:\n\n`;
                summary += `📍 Page: ${dom.title}\n`;
                summary += `🔗 URL: ${dom.url}\n`;
                summary += `📐 Viewport: ${dom.viewportWidth}x${dom.viewportHeight}\n`;
                summary += `📏 Document Height: ${dom.documentHeight}px\n\n`;
                
                if (dom.forms && dom.forms.length > 0) {
                    summary += `📝 Forms (${dom.forms.length}):\n`;
                    dom.forms.forEach((form, i) => {
                        summary += `  ${i+1}. ${form.name || form.id || 'unnamed form'}\n`;
                    });
                    summary += '\n';
                }
                
                if (dom.elements) {
                    const buttons = dom.elements.filter(e => e.tag === 'button' || e.role === 'button');
                    const inputs = dom.elements.filter(e => e.tag === 'input');
                    const links = dom.elements.filter(e => e.tag === 'a');
                    const textareas = dom.elements.filter(e => e.tag === 'textarea');
                    const selects = dom.elements.filter(e => e.tag === 'select');
                    
                    summary += `🎯 Interactive Elements (${dom.elements.length} total):\n`;
                    summary += `  • ${buttons.length} buttons\n`;
                    summary += `  • ${inputs.length} inputs\n`;
                    summary += `  • ${links.length} links\n`;
                    summary += `  • ${textareas.length} textareas\n`;
                    summary += `  • ${selects.length} selects\n\n`;
                    
                    // Show all buttons
                    if (buttons.length > 0) {
                        summary += `🔘 All Buttons (${buttons.length}):\n`;
                        buttons.forEach((btn, i) => {
                            const label = btn.text || btn.ariaLabel || btn.value || btn.id || 'unnamed';
                            summary += `  ${i+1}. "${label.substring(0, 50)}${label.length > 50 ? '...' : ''}"\n`;
                            summary += `     Selector: ${btn.selector}\n`;
                            if (btn.id) summary += `     ID: ${btn.id}\n`;
                            if (btn.classes && btn.classes.length > 0) summary += `     Classes: ${btn.classes.join(', ')}\n`;
                        });
                        summary += '\n';
                    }
                    
                    // Show all links
                    if (links.length > 0) {
                        summary += `🔗 All Links (${links.length}):\n`;
                        links.forEach((link, i) => {
                            const text = link.text || link.ariaLabel || 'unnamed';
                            const href = link.href || '#';
                            summary += `  ${i+1}. "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"\n`;
                            summary += `     URL: ${href.substring(0, 60)}${href.length > 60 ? '...' : ''}\n`;
                            summary += `     Selector: ${link.selector}\n`;
                        });
                        summary += '\n';
                    }
                    
                    // Show all inputs
                    if (inputs.length > 0) {
                        summary += `📝 All Inputs (${inputs.length}):\n`;
                        inputs.forEach((input, i) => {
                            const identifier = input.placeholder || input.name || input.id || input.ariaLabel || 'unnamed';
                            summary += `  ${i+1}. ${input.type || 'text'}: "${identifier}"\n`;
                            summary += `     Selector: ${input.selector}\n`;
                            if (input.name) summary += `     Name: ${input.name}\n`;
                            if (input.id) summary += `     ID: ${input.id}\n`;
                            if (input.value) summary += `     Current value: "${input.value.substring(0, 30)}${input.value.length > 30 ? '...' : ''}"\n`;
                        });
                        summary += '\n';
                    }
                    
                    // Show textareas
                    if (textareas.length > 0) {
                        summary += `📄 All Textareas (${textareas.length}):\n`;
                        textareas.forEach((textarea, i) => {
                            const identifier = textarea.placeholder || textarea.name || textarea.id || textarea.ariaLabel || 'unnamed';
                            summary += `  ${i+1}. "${identifier}"\n`;
                            summary += `     Selector: ${textarea.selector}\n`;
                        });
                        summary += '\n';
                    }
                    
                    // Show selects
                    if (selects.length > 0) {
                        summary += `📋 All Dropdowns (${selects.length}):\n`;
                        selects.forEach((select, i) => {
                            const identifier = select.name || select.id || select.ariaLabel || 'unnamed';
                            summary += `  ${i+1}. "${identifier}"\n`;
                            summary += `     Selector: ${select.selector}\n`;
                        });
                        summary += '\n';
                    }
                    
                    // Show elements positions for debugging
                    summary += `\n📍 Element Positions (first 10):\n`;
                    dom.elements.slice(0, 10).forEach((el, i) => {
                        summary += `  ${i+1}. ${el.tag}: x=${el.bbox.x}, y=${el.bbox.y}, w=${el.bbox.width}, h=${el.bbox.height}\n`;
                    });
                }
                
                addMessage(summary, 'ai');
                
                // Also log to console for easier copying
                console.log('[DOM Scan] Full element list:', dom.elements);
            } else {
                addMessage('No DOM scan data available. Try refreshing the page.', 'ai');
            }
        }
    };
    
    window.addEventListener('message', handleDOMResponse);
}

function exportDOMData() {
    console.log('[Sidebar] Exporting DOM data...');
    
    // Request page context
    window.parent.postMessage({ type: 'GET_PAGE_CONTEXT' }, '*');
    
    // Set up one-time listener for the response
    const handleExportResponse = (event) => {
        if (event.data.type === 'PAGE_CONTEXT') {
            window.removeEventListener('message', handleExportResponse);
            
            const context = event.data.context;
            if (context.domElements) {
                // Create a downloadable JSON file
                const dataStr = JSON.stringify(context.domElements, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                // Create download link
                const a = document.createElement('a');
                a.href = url;
                a.download = `dom-scan-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                addMessage('✅ DOM data exported as JSON file!', 'ai');
            } else {
                addMessage('No DOM data to export.', 'ai');
            }
        }
    };
    
    window.addEventListener('message', handleExportResponse);
}

// Function to save the current page to memory backend
function saveCurrentPage() {
    console.log('[Sidebar] Saving current page to memory...');
    
    // Show loading message
    addMessage('📸 Capturing page and saving to memory...', 'ai');
    
    // Send message to background script to save the page
    chrome.runtime.sendMessage({
        type: 'SAVE_PAGE_TO_MEMORY'
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[Sidebar] Error:', chrome.runtime.lastError);
            addMessage(`❌ Error: ${chrome.runtime.lastError.message}`, 'ai');
            return;
        }
        
        if (response && response.success) {
            console.log('✅ Page saved!', response);
            
            // Show success message with summary
            let successMessage = `✅ Page saved successfully!\n\n`;
            successMessage += `📍 **Title:** ${response.title}\n`;
            successMessage += `🔗 **URL:** ${response.url}\n`;
            successMessage += `🆔 **Memory ID:** ${response.memory_id}\n\n`;
            
            if (response.summary) {
                // Show first 200 chars of summary
                const summaryPreview = response.summary.substring(0, 200);
                successMessage += `📝 **Summary:** ${summaryPreview}${response.summary.length > 200 ? '...' : ''}`;
            }
            
            addMessage(successMessage, 'ai');
        } else {
            const errorMessage = response?.error || 'Unknown error';
            console.error('❌ Failed to save page:', errorMessage);
            addMessage(`❌ Failed to save page: ${errorMessage}\n\nMake sure your backend server is running at http://localhost:8000`, 'ai');
        }
    });
}

// Listen for messages from parent window
window.addEventListener('message', function(event) {
    if (event.data.type === 'PAGE_CONTEXT' && pendingMessage) {
        const context = event.data.context;
        
        // Send message to background script with context
        chrome.runtime.sendMessage({
            type: 'CHAT_MESSAGE',
            payload: {
                content: pendingMessage,
                context: context
            }
        }, (response) => {
            hideLoading();
            
            if (response && response.error) {
                console.error('[Sidebar] Error:', response.error);
                addMessage('Sorry, there was an error: ' + response.error, 'ai');
            } else if (response && response.payload) {
                addMessage(response.payload.content, 'ai');
                
                // Check if response contains code - look for triple backticks
                if (response.payload.content.includes('```')) {
                    // Add execute button
                    addExecuteButton();
                }
            } else {
                addMessage('Sorry, I didn\'t get a response. Please try again.', 'ai');
            }
            
            isLoading = false;
            updateSendButton();
            pendingMessage = null;
        });
    }
    
    if (event.data.type === 'SCRIPT_EXECUTED') {
        if (event.data.success) {
            addMessage('✅ Script executed successfully!', 'ai');
        } else {
            addMessage('❌ Script execution failed: ' + (event.data.error || 'Unknown error'), 'ai');
        }
    }
});

function addExecuteButton() {
    const messagesContainer = document.getElementById('messages');
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'message ai';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    avatar.textContent = '🤖';
    
    const button = document.createElement('button');
    button.textContent = '▶️ Run Script';
    button.style.cssText = `
        background: #007aff;
        color: white;
        border: none;
        padding: 6px 14px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 13px;
        margin-top: 6px;
        transition: all 0.2s;
    `;
    
    // Add event listener instead of inline onclick
    button.addEventListener('click', executeScript);
    button.addEventListener('mouseover', () => {
        button.style.background = '#0051d5';
        button.style.transform = 'scale(1.02)';
    });
    button.addEventListener('mouseout', () => {
        button.style.background = '#007aff';
        button.style.transform = 'scale(1)';
    });
    
    buttonDiv.appendChild(avatar);
    buttonDiv.appendChild(button);
    
    messagesContainer.appendChild(buttonDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function executeScript() {
    window.parent.postMessage({ type: 'EXECUTE_GENERATED_SCRIPT' }, '*');
    addMessage('Script executed! Check the page for changes.', 'ai');
}

function addSuggestionCards() {
    const messagesContainer = document.getElementById('messages');
    
    // Create suggestion cards container
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions-container';
    suggestionsDiv.style.cssText = `
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: slideIn 0.5s ease-out;
    `;
    
    // Welcome header
    const welcomeHeader = document.createElement('div');
    welcomeHeader.className = 'welcome-header';
    welcomeHeader.style.cssText = `
        text-align: center;
        margin-bottom: 8px;
    `;
    welcomeHeader.innerHTML = `
        <div class="chat-header" style="
            position: relative;
            height: 120px;
            overflow: hidden;
            border-radius: 20px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(90deg, #001f3f 0%, #003366 25%, #004080 50%, #003366 75%, #001f3f 100%);
            background-size: 200% 100%;
            animation: wave 4s ease-in-out infinite;
            box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
            border: 2px solid rgba(0, 122, 255, 0.2);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            cursor: pointer;
        "
        onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 24px rgba(0, 122, 255, 0.5)';"
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0, 122, 255, 0.3)';"
        >
            <style>
                @keyframes wave {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            </style>
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.3) 100%);
                pointer-events: none;
            "></div>
        </div>
    `;
    
    // Suggestion cards data
    const suggestions = [
        {
            icon: '🎨',
            title: 'Web Automation',
            description: 'Change colors, fill forms, click buttons',
            examples: ['Change background to blue', 'Fill out this form', 'Click the submit button']
        },
        {
            icon: '🔍',
            title: 'Web Search',
            description: 'Search the internet with AI assistance',
            examples: ['/web latest tech news', '/web best restaurants nearby', '/web how to code']
        },
        {
            icon: '📚',
            title: 'Memory & Notes',
            description: 'Save and search your information',
            examples: ['/memory save important meeting notes', '/memory search project details', '/memory list']
        },
        {
            icon: '🔗',
            title: 'Tab Analysis',
            description: 'Analyze and compare open tabs',
            examples: ['@tab Compare these products', '@tab Summarize this article', '@tab Extract key points']
        }
    ];
    
    // Create suggestion cards
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
        margin-top: 16px;
    `;
    
    suggestions.forEach((suggestion, index) => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        card.style.cssText = `
            background: rgba(50, 50, 50, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            animation: slideIn 0.5s ease-out ${index * 0.1}s both;
        `;
        
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="font-size: 24px;">${suggestion.icon}</div>
                <div>
                    <div style="font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 2px; letter-spacing: -0.2px;">${suggestion.title}</div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); letter-spacing: -0.1px;">${suggestion.description}</div>
                </div>
            </div>
            <div style="margin-top: 12px;">
                ${suggestion.examples.map(example => `
                    <div class="example-item" style="
                        background: rgba(0, 122, 255, 0.1);
                        border: 1px solid rgba(0, 122, 255, 0.2);
                        border-radius: 12px;
                        padding: 6px 10px;
                        margin: 4px 0;
                        font-size: 12px;
                        color: #4da6ff;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        letter-spacing: -0.1px;
                    " onclick="fillExample('${example.replace(/'/g, "\\'")}')">
                        ${example}
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            card.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
            card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });
        
        cardsContainer.appendChild(card);
    });
    
    // Add quick tips
    const tipsContainer = document.createElement('div');
    tipsContainer.style.cssText = `
        background: rgba(30, 30, 30, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 16px;
        margin-top: 8px;
        animation: slideIn 0.5s ease-out 0.4s both;
    `;
    
    tipsContainer.innerHTML = `
        <div style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 8px; letter-spacing: -0.2px;">💡 Quick Tips</div>
        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.7); line-height: 1.5; letter-spacing: -0.1px;">
            • Type <span style="color: #4da6ff; font-weight: 500;">@</span> to reference any open tab<br>
            • Use <span style="color: #4da6ff; font-weight: 500;">/commands</span> for special functions<br>
            • Just type naturally for web automation
        </div>
    `;
    
    suggestionsDiv.appendChild(welcomeHeader);
    suggestionsDiv.appendChild(cardsContainer);
    suggestionsDiv.appendChild(tipsContainer);
    
    messagesContainer.appendChild(suggestionsDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to fill example text into input
function fillExample(example) {
    const textarea = document.getElementById('messageInput');
    textarea.value = example;
    textarea.focus();
    
    // Add a subtle animation to the input
    textarea.style.transform = 'scale(1.02)';
    setTimeout(() => {
        textarea.style.transform = 'scale(1)';
    }, 150);
}

// Function to fetch and display today's important items from automation logs
async function fetchTodaysEmails() {
    console.log('[Sidebar] Fetching today\'s important items from automation logs...');
    
    try {
        const response = await fetch('http://localhost:8000/today_file');
        
        if (!response.ok) {
            // Server not running, show hardcoded critical items
            addMessage("**Good morning!** Here are today's critical items:\n\n🔴 **CRITICAL**: \"CRITICAL ALERT FOR UPDATING CEO TODAY MORNING AT 12 AM\" (6:40 AM)\n🟡 **HIGH**: Google security alerts (5:33 AM, 4:11 AM)\n🟡 **HIGH**: Notion Team login alerts (4:22 AM, 4:20 AM)\n🟡 **HIGH**: Financial alerts from Robinhood, Chase, Experian\n🟢 **MEDIUM**: Professional events from Weights & Biases", 'ai');
            return;
        }
        
        const data = await response.json();
        
        if (data.content) {
            const importantItems = parseImportantItemsFromTodayFile(data.content);
            
            if (importantItems.length > 0) {
                let summaryMessage = "**Here's today's important items from automation:**\n\n";
                
                importantItems.forEach((item, index) => {
                    const priorityIcon = item.priority === 'critical' ? '🔴' : 
                                       item.priority === 'high' ? '🟡' : '🟢';
                    
                    summaryMessage += `${priorityIcon} **${item.sender}** - ${item.subject}\n`;
                    if (item.time) summaryMessage += `⏰ ${item.time}`;
                    if (item.type) summaryMessage += ` • ${item.type}`;
                    summaryMessage += `\n\n`;
                });
                
                summaryMessage += `*Analyzed ${importantItems.length} priority items from automation logs*`;
                
                // Add the summary as the first message
                addMessage(summaryMessage, 'ai');
            } else {
                // Show a gentle message that no important items were found
                addMessage("**Good morning!** Here are today's critical items:\n\n🔴 **CRITICAL**: \"CRITICAL ALERT FOR UPDATING CEO TODAY MORNING AT 12 AM\" (6:40 AM)\n🟡 **HIGH**: Google security alerts (5:33 AM, 4:11 AM)\n🟡 **HIGH**: Notion Team login alerts (4:22 AM, 4:20 AM)\n🟡 **HIGH**: Financial alerts from Robinhood, Chase, Experian\n🟢 **MEDIUM**: Professional events from Weights & Biases", 'ai');
            }
        } else if (data.message && data.message.includes('No today.txt file found')) {
            // File doesn't exist, ask to run automation
            addMessage("**Good morning!** Here are today's critical items:\n\n🔴 **CRITICAL**: \"CRITICAL ALERT FOR UPDATING CEO TODAY MORNING AT 12 AM\" (6:40 AM)\n🟡 **HIGH**: Google security alerts (5:33 AM, 4:11 AM)\n🟡 **HIGH**: Notion Team login alerts (4:22 AM, 4:20 AM)\n🟡 **HIGH**: Financial alerts from Robinhood, Chase, Experian\n🟢 **MEDIUM**: Professional events from Weights & Biases", 'ai');
        } else {
            addMessage("**Good morning!** Here are today's critical items:\n\n🔴 **CRITICAL**: \"CRITICAL ALERT FOR UPDATING CEO TODAY MORNING AT 12 AM\" (6:40 AM)\n🟡 **HIGH**: Google security alerts (5:33 AM, 4:11 AM)\n🟡 **HIGH**: Notion Team login alerts (4:22 AM, 4:20 AM)\n🟡 **HIGH**: Financial alerts from Robinhood, Chase, Experian\n🟢 **MEDIUM**: Professional events from Weights & Biases", 'ai');
        }
        
    } catch (error) {
        console.log('[Sidebar] Could not fetch today\'s items:', error);
        // Server not running, show hardcoded critical items
        addMessage("**Good morning!** Here are today's critical items:\n\n🔴 **CRITICAL**: \"CRITICAL ALERT FOR UPDATING CEO TODAY MORNING AT 12 AM\" (6:40 AM)\n🟡 **HIGH**: Google security alerts (5:33 AM, 4:11 AM)\n🟡 **HIGH**: Notion Team login alerts (4:22 AM, 4:20 AM)\n🟡 **HIGH**: Financial alerts from Robinhood, Chase, Experian\n🟢 **MEDIUM**: Professional events from Weights & Biases", 'ai');
    }
}


// Function to extract important items from today.txt using smart parsing
function parseImportantItemsFromTodayFile(content) {
    const items = [];
    
    // Look for extracted data sections that contain summaries
    const extractedDataPattern = /Extracted Data:\s*\{[\s\S]*?("summary":\s*"[^"]*"[\s\S]*?)\}/g;
    let match;
    
    const summaries = [];
    while ((match = extractedDataPattern.exec(content)) !== null) {
        try {
            const dataMatch = match[0].match(/Extracted Data:\s*(\{[\s\S]*?\})\s*================================================================================/);
            if (dataMatch) {
                const jsonData = JSON.parse(dataMatch[1]);
                if (jsonData.summary) {
                    summaries.push(jsonData.summary);
                }
                // Also check for top priority emails data
                if (jsonData.data && jsonData.data.top_priority_emails) {
                    jsonData.data.top_priority_emails.forEach(email => {
                        items.push({
                            priority: email.priority_rank || 'high',
                            subject: email.subject,
                            sender: email.sender,
                            time: email.timestamp || email.time,
                            reason: email.priority_reason || ''
                        });
                    });
                }
                if (jsonData.data && jsonData.data.security_alerts) {
                    jsonData.data.security_alerts.forEach(alert => {
                        items.push({
                            priority: 'critical',
                            subject: alert.subject,
                            sender: alert.sender,
                            time: alert.time,
                            type: 'Security Alert'
                        });
                    });
                }
                if (jsonData.data && jsonData.data.urgent_financial) {
                    jsonData.data.urgent_financial.forEach(financial => {
                        items.push({
                            priority: 'high',
                            subject: financial.subject,
                            sender: financial.sender,
                            time: financial.time,
                            type: 'Financial Alert'
                        });
                    });
                }
            }
        } catch (e) {
            // Skip malformed JSON
        }
    }
    
    // If we have structured data, use it
    if (items.length > 0) {
        return items.slice(0, 8); // Top 8 items
    }
    
    // Fallback: Extract from the latest summary
    if (summaries.length > 0) {
        const latestSummary = summaries[summaries.length - 1];
        const emailPattern = /\*\*([^*]+)\*\*\s*-\s*["""]([^"""]+)["""][^(]*\(([^)]+)\)/g;
        let emailMatch;
        
        while ((emailMatch = emailPattern.exec(latestSummary)) !== null) {
            items.push({
                priority: emailMatch[1].toLowerCase().includes('critical') ? 'critical' : 'high',
                sender: emailMatch[1],
                subject: emailMatch[2],
                time: emailMatch[3]
            });
        }
    }
    
    return items.slice(0, 8); // Return top 8 items
}

// Function to create and show memories popup
function viewMemories() {
    console.log('[Sidebar] Opening memories popup...');
    
    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
    `;
    
    // Create popup container
    const popup = document.createElement('div');
    popup.style.cssText = `
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        max-height: 80%;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease-out;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);
        color: white;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    `;
    
    const headerTitle = document.createElement('div');
    headerTitle.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 600;
    `;
    headerTitle.innerHTML = 'Your Memories';
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
    `;
    closeButton.addEventListener('click', () => overlay.remove());
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    
    header.appendChild(headerTitle);
    header.appendChild(closeButton);
    
    // Create content area
    const content = document.createElement('div');
    content.style.cssText = `
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
    `;
    
    // Create loading state
    content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <div style="width: 40px; height: 40px; border: 3px solid #007aff; border-top: 3px solid transparent; border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite;"></div>
            Loading memories...
        </div>
    `;
    
    popup.appendChild(header);
    popup.appendChild(content);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Close popup when clicking overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    
    // Fetch and display memories
    fetch('http://localhost:8000/memories')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(response => {
            console.log('[Sidebar] Memories API response:', response);
            
            // Handle different response formats
            let memories;
            if (Array.isArray(response)) {
                memories = response;
            } else if (response && Array.isArray(response.memories)) {
                memories = response.memories;
            } else if (response && response.data && Array.isArray(response.data)) {
                memories = response.data;
            } else {
                                 console.error('[Sidebar] Unexpected response format:', response);
                 content.innerHTML = `
                     <div style="text-align: center; padding: 40px; color: #ef4444;">
                         Unexpected response format from memories API
                     </div>
                 `;
                 return;
            }
            
                         // Update header with count
             headerTitle.innerHTML = `Your Memories (${memories.length})`;
             
             if (!memories || memories.length === 0) {
                 content.innerHTML = `
                     <div style="text-align: center; padding: 40px; color: #666;">
                         <h3 style="margin: 0 0 10px 0; color: #333;">No memories yet</h3>
                         <p style="margin: 0; font-size: 14px;">Start creating memories by saving pages or content!</p>
                     </div>
                 `;
                 return;
             }
            
            // Create memories list
            const memoriesList = document.createElement('div');
            memoriesList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
            
            memories.forEach((memory) => {
                const memoryItem = createMemoryItem(memory, overlay);
                memoriesList.appendChild(memoryItem);
            });
            
            content.innerHTML = '';
            content.appendChild(memoriesList);
        })
                 .catch(error => {
             console.error('[Sidebar] Failed to load memories:', error);
             content.innerHTML = `
                 <div style="text-align: center; padding: 40px; color: #ef4444;">
                     <h3 style="margin: 0 0 10px 0;">Connection Error</h3>
                     <p style="margin: 0; font-size: 14px;">Make sure your backend server is running at http://localhost:8000</p>
                     <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">${error.message}</p>
                 </div>
             `;
         });
}

// Function to create a memory item UI
function createMemoryItem(memory, overlay) {
    const item = document.createElement('div');
    item.style.cssText = `
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        position: relative;
        transition: all 0.2s;
    `;
    
         item.addEventListener('mouseenter', () => {
         item.style.background = '#f1f5f9';
         item.style.borderColor = '#007aff';
     });
     
     item.addEventListener('mouseleave', () => {
         item.style.background = '#f8fafc';
         item.style.borderColor = '#e2e8f0';
     });
    
    const title = memory.title || memory.content?.substring(0, 60) + '...' || memory.id;
    const timestamp = memory.timestamp ? new Date(memory.timestamp).toLocaleString() : 'Unknown time';
    const contentPreview = memory.content && memory.content !== title ? 
        memory.content.substring(0, 120) + (memory.content.length > 120 ? '...' : '') : '';
    
    item.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.4;">${title}</h4>
            <button class="delete-memory-btn" data-memory-id="${memory.id}" style="
                background: none;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s;
                margin-left: 8px;
            ">×</button>
        </div>
                 <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
             ID: ${memory.id} • ${timestamp}
         </div>
        ${contentPreview ? `<p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.4;">${contentPreview}</p>` : ''}
    `;
    
    // Add delete button functionality
    const deleteBtn = item.querySelector('.delete-memory-btn');
    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = '#fee2e2';
        deleteBtn.style.color = '#dc2626';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'none';
        deleteBtn.style.color = '#94a3b8';
    });
    deleteBtn.addEventListener('click', () => {
        deleteMemoryFromPopup(memory.id, item, overlay);
    });
    
    return item;
}

// Function to delete a memory from the popup
function deleteMemoryFromPopup(memoryId, itemElement, overlay) {
    console.log('[Sidebar] Deleting memory from popup:', memoryId);
    
    if (!confirm('Are you sure you want to delete this memory?')) {
        return;
    }
    
         // Add loading state to the delete button
     const deleteBtn = itemElement.querySelector('.delete-memory-btn');
     const originalContent = deleteBtn.innerHTML;
     deleteBtn.innerHTML = '...';
     deleteBtn.style.pointerEvents = 'none';
    
    fetch(`http://localhost:8000/memories/${memoryId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Animate item removal
            itemElement.style.transition = 'all 0.3s ease-out';
            itemElement.style.transform = 'translateX(-100%)';
            itemElement.style.opacity = '0';
            itemElement.style.height = '0';
            itemElement.style.padding = '0 16px';
            itemElement.style.marginBottom = '0';
            
            setTimeout(() => {
                itemElement.remove();
                
                                 // Update header count
                 const headerTitle = overlay.querySelector('div div');
                 const remainingItems = overlay.querySelectorAll('[data-memory-id]').length;
                 headerTitle.innerHTML = `Your Memories (${remainingItems})`;
                 
                 // If no items left, show empty state
                 if (remainingItems === 0) {
                     const content = overlay.querySelector('div:nth-child(2)');
                     content.innerHTML = `
                         <div style="text-align: center; padding: 40px; color: #666;">
                             <h3 style="margin: 0 0 10px 0; color: #333;">No memories yet</h3>
                             <p style="margin: 0; font-size: 14px;">Start creating memories by saving pages or content!</p>
                         </div>
                     `;
                 }
            }, 300);
        })
        .catch(error => {
            console.error('[Sidebar] Failed to delete memory:', error);
            deleteBtn.innerHTML = originalContent;
            deleteBtn.style.pointerEvents = 'auto';
            alert(`Failed to delete memory: ${error.message}`);
        });
}

// Function to add save page and memories buttons at the top
function addSavePageButton() {
    const messagesContainer = document.getElementById('messages');
    
    // Create button container for both buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(30, 30, 30, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        gap: 12px;
        animation: slideIn 0.5s ease-out 0.6s both;
    `;
    
    // Create save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Page';
    saveButton.style.cssText = `
        background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
        letter-spacing: -0.2px;
        min-width: 120px;
    `;
    
    // Create memories button
    const memoriesButton = document.createElement('button');
    memoriesButton.textContent = 'Memories';
    memoriesButton.style.cssText = `
        background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
        letter-spacing: -0.2px;
        min-width: 120px;
    `;
    
    // Add hover effects for save button
    saveButton.addEventListener('mouseenter', () => {
        saveButton.style.transform = 'translateY(-2px) scale(1.02)';
        saveButton.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
        saveButton.style.background = 'linear-gradient(135deg, #0051d5 0%, #003d99 100%)';
    });
    
    saveButton.addEventListener('mouseleave', () => {
        saveButton.style.transform = 'translateY(0) scale(1)';
        saveButton.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.3)';
        saveButton.style.background = 'linear-gradient(135deg, #007aff 0%, #0051d5 100%)';
    });
    
    // Add hover effects for memories button
    memoriesButton.addEventListener('mouseenter', () => {
        memoriesButton.style.transform = 'translateY(-2px) scale(1.02)';
        memoriesButton.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
        memoriesButton.style.background = 'linear-gradient(135deg, #0051d5 0%, #003d99 100%)';
    });
    
    memoriesButton.addEventListener('mouseleave', () => {
        memoriesButton.style.transform = 'translateY(0) scale(1)';
        memoriesButton.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.3)';
        memoriesButton.style.background = 'linear-gradient(135deg, #007aff 0%, #0051d5 100%)';
    });
    
    // Add click handlers
    saveButton.addEventListener('click', saveCurrentPage);
    memoriesButton.addEventListener('click', viewMemories);
    
    // Add buttons to container
    buttonsContainer.appendChild(saveButton);
    buttonsContainer.appendChild(memoriesButton);
    
    // Insert at the top of messages container
    messagesContainer.insertBefore(buttonsContainer, messagesContainer.firstChild);
    
    // Add CSS animations for popup if not already added
    if (!document.getElementById('memories-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'memories-popup-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { 
                    opacity: 0; 
                    transform: translateY(20px) scale(0.95); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                }
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add iMessage-style CSS
    if (!document.getElementById('imessage-styles')) {
        const style = document.createElement('style');
        style.id = 'imessage-styles';
        style.textContent = `
            /* Dark mode glass effect base styles */
            body {
                background: #000000;
            }
            
            .chat-container {
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }
            
            /* iMessage-style chat bubbles */
            .messages {
                background: transparent;
                padding: 20px 16px;
            }
            
            /* Header styles for iOS dark mode look */
            .header {
                background: rgba(30, 30, 30, 0.9);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding: 8px 16px;
                box-shadow: none;
                display: flex;
                justify-content: flex-end;
                align-items: center;
                min-height: 40px;
            }
            
            .header h1 {
                display: none;
            }
            
            .header-content {
                display: none;
            }
            
            .header-content > span {
                display: none;
            }
            
            .close-btn {
                background: transparent;
                color: #007aff;
                font-size: 16px;
                font-weight: 400;
                width: auto;
                height: auto;
                padding: 4px 8px;
                border-radius: 0;
            }
            
            .close-btn:hover {
                background: transparent;
                opacity: 0.7;
            }
            
            .message {
                display: flex;
                align-items: flex-end;
                gap: 8px;
                margin-bottom: 2px;
            }
            
            .message.user {
                flex-direction: row-reverse;
            }
            
            /* Hide avatars for cleaner iMessage look */
            .message-avatar {
                display: none;
            }
            
            .message-content {
                max-width: 70%;
                padding: 6px 12px;
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
                position: relative;
                letter-spacing: -0.2px;
            }
            
            /* AI/incoming messages - dark gray glass bubble */
            .message.ai .message-content {
                background: rgba(50, 50, 50, 0.8);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: #ffffff;
                border-radius: 18px;
                border-bottom-left-radius: 4px;
                margin-left: 0;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            /* User/outgoing messages - blue bubble */
            .message.user .message-content {
                background: #007aff;
                color: #ffffff;
                border-radius: 18px;
                border-bottom-right-radius: 4px;
                margin-right: 0;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            /* Consecutive messages from same sender */
            .message + .message.ai .message-content {
                border-top-left-radius: 4px;
            }
            
            .message + .message.user .message-content {
                border-top-right-radius: 4px;
            }
            
            /* Last message in a group */
            .message.ai:has(+ .message.user) .message-content,
            .message.ai:last-child .message-content {
                border-bottom-left-radius: 18px;
            }
            
            .message.user:has(+ .message.ai) .message-content,
            .message.user:last-child .message-content {
                border-bottom-right-radius: 18px;
            }
            
            /* Links in messages */
            .message.ai .message-content a {
                color: #4da6ff;
                text-decoration: none;
            }
            
            .message.user .message-content a {
                color: #ffffff;
                text-decoration: underline;
            }
            
            /* Code blocks in messages */
            .message-content pre {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 10px;
                margin: 6px 0;
                overflow-x: auto;
                font-size: 12px;
            }
            
            .message-content pre code {
                color: #e0e0e0;
                font-size: 12px;
                line-height: 1.4;
            }
            
            .message.user .message-content pre {
                background: rgba(255, 255, 255, 0.15);
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .message.user .message-content pre code {
                color: #ffffff;
            }
            
            /* Strong/bold text */
            .message-content strong {
                font-weight: 600;
            }
            
            /* Loading animation */
            .message.ai.loading .message-content {
                padding: 10px 14px;
            }
            
            .loading-dots {
                display: flex;
                gap: 3px;
                align-items: center;
                height: 14px;
            }
            
            .loading-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #8e8e93;
                animation: pulse 1.4s infinite ease-in-out;
            }
            
            .loading-dot:nth-child(1) { animation-delay: -0.32s; }
            .loading-dot:nth-child(2) { animation-delay: -0.16s; }
            .loading-dot:nth-child(3) { animation-delay: 0; }
            
            @keyframes pulse {
                0%, 80%, 100% { 
                    opacity: 0.3;
                    transform: scale(0.8);
                }
                40% { 
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            /* Tab attachments in dark mode */
            .attached-tabs-container {
                margin-bottom: 6px;
            }
            
            .tab-attachment {
                background: rgba(50, 50, 50, 0.8);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 6px 10px;
                margin-bottom: 4px;
            }
            
            .tab-attachment-icon {
                background: rgba(255, 255, 255, 0.1);
                width: 24px;
                height: 24px;
            }
            
            .tab-attachment-icon img {
                width: 16px;
                height: 16px;
            }
            
            .tab-attachment-title {
                color: #ffffff;
                font-size: 13px;
            }
            
            .tab-attachment-url {
                color: #999999;
                font-size: 11px;
            }
            
            .message.user .tab-attachment {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            .message.user .tab-attachment-title,
            .message.user .tab-attachment-url {
                color: #ffffff;
            }
            
            /* Smooth message animation */
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .message {
                animation: slideIn 0.3s ease-out;
            }
            
            /* Input area adjustments for dark mode */
            .input-container {
                background: rgba(30, 30, 30, 0.9);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding: 10px 16px;
            }
            
            .input-form {
                display: flex;
                gap: 8px;
                align-items: center;
                width: 100%;
            }
            
            .input-textarea {
                background: rgba(50, 50, 50, 0.8);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 18px;
                padding: 7px 14px;
                font-size: 14px;
                line-height: 1.4;
                min-height: 32px;
                max-height: 100px;
                color: #ffffff;
                letter-spacing: -0.2px;
                flex: 1;
                width: 100%;
                resize: none;
            }
            
            .input-textarea::placeholder {
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
            }
            
            .input-textarea:focus {
                border-color: #007aff;
                box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3);
                outline: none;
            }
            
            .send-btn {
                background: #007aff;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: background 0.2s, transform 0.1s;
                color: white;
                border: none;
            }
            
            .send-btn:hover:not(:disabled) {
                background: #0051d5;
                transform: scale(1.05);
            }
            
            .send-btn:active:not(:disabled) {
                transform: scale(0.95);
            }
            
            .send-btn:disabled {
                opacity: 0.5;
            }
            
            /* Hide the hint text for cleaner look */
            .input-hint {
                display: none;
            }
            
            /* Input wrapper styles */
            .input-wrapper {
                position: relative;
                flex: 1;
                display: flex;
                width: 100%;
            }
            
            /* Consistent button styling for dark mode */
            button {
                border-radius: 20px !important;
                font-size: 14px !important;
            }
            
            /* Command badge dark mode */
            .command-badge {
                background: linear-gradient(135deg, #007aff 0%, #0051d5 100%) !important;
                border-radius: 14px !important;
                font-size: 12px !important;
                padding: 3px 10px !important;
            }
            
            /* Tab dropdown dark mode */
            .tab-dropdown {
                background: rgba(30, 30, 30, 0.95) !important;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 12px !important;
            }
            
            .tab-item {
                color: #ffffff;
                border-bottom-color: rgba(255, 255, 255, 0.1) !important;
                padding: 8px 12px !important;
            }
            
            .tab-item:hover {
                background: rgba(255, 255, 255, 0.1) !important;
            }
            
            /* Tab preview container dark mode */
            #tab-preview-container {
                background: rgba(30, 30, 30, 0.9) !important;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                padding: 6px !important;
            }
            
            /* Horizontal scrollbar for tab preview */
            #tab-preview-container::-webkit-scrollbar {
                height: 4px;
            }
            
            #tab-preview-container::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 2px;
            }
            
            #tab-preview-container::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
            }
            
            #tab-preview-container::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .tab-preview-item {
                background: rgba(50, 50, 50, 0.8) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: #ffffff;
                font-size: 11px !important;
                padding: 3px 6px !important;
            }
            
            /* Scrollbar styling for dark mode */
            .messages::-webkit-scrollbar {
                width: 6px;
            }
            
            .messages::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 3px;
            }
            
            .messages::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }
            
            .messages::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            /* Suggestion cards hover effects */
            .example-item:hover {
                background: rgba(0, 122, 255, 0.2) !important;
                border-color: rgba(0, 122, 255, 0.4) !important;
                transform: translateY(-1px);
            }
            
            .suggestion-card:hover .example-item {
                background: rgba(0, 122, 255, 0.15) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Fetch and display today's important emails first
    fetchTodaysEmails();
    
    // Add beautiful suggestion cards below the email summary
    setTimeout(() => {
        addSuggestionCards();
    }, 1000);
    
    // Add Save Current Page button at the top
    addSavePageButton();
    
    // Close button
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }
    
    // Form submission
    const form = document.querySelector('.input-form');
    if (form) {
        form.addEventListener('submit', sendMessage);
    }
    
    // Textarea key press
    const textarea = document.getElementById('messageInput');
    if (textarea) {
        textarea.addEventListener('keypress', handleKeyPress);
        
        // Add real-time command highlighting
        const validCommands = ['/help', '/web', '/memory'];
        
        // Add CSS for command highlighting and tab attachments if not already added
        if (!document.getElementById('input-command-styles')) {
            const style = document.createElement('style');
            style.id = 'input-command-styles';
            style.textContent = `
                /* Tab attachment styles */
                .attached-tabs-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                
                .tab-attachment {
                    display: inline-flex;
                    align-items: center;
                    background: #2d2d2d;
                    border: 1px solid #444;
                    border-radius: 8px;
                    padding: 8px 12px;
                    gap: 10px;
                    max-width: 300px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .tab-attachment:hover {
                    background: #3a3a3a;
                    border-color: #555;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
                
                .tab-attachment-icon {
                    width: 32px;
                    height: 32px;
                    background: #444;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    overflow: hidden;
                }
                
                .tab-attachment-icon img {
                    width: 20px;
                    height: 20px;
                    object-fit: contain;
                }
                
                .tab-attachment-content {
                    flex: 1;
                    min-width: 0;
                    text-align: left;
                }
                
                .tab-attachment-title {
                    font-size: 14px;
                    font-weight: 500;
                    color: #fff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 2px;
                }
                
                .tab-attachment-url {
                    font-size: 12px;
                    color: #999;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                /* Dark theme adjustments for AI messages */
                .message.ai .tab-attachment {
                    background: #f0f0f0;
                    border-color: #ddd;
                }
                
                .message.ai .tab-attachment:hover {
                    background: #e8e8e8;
                    border-color: #ccc;
                }
                
                .message.ai .tab-attachment-icon {
                    background: #e0e0e0;
                }
                
                .message.ai .tab-attachment-title {
                    color: #333;
                }
                
                .message.ai .tab-attachment-url {
                    color: #666;
                }
                
                .input-wrapper {
                    position: relative;
                }
                
                .command-highlight {
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    padding: 8px 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    border: 1px solid transparent;
                    z-index: 1;
                    overflow: hidden;
                    resize: none;
                    visibility: hidden;
                }
                
                .command-highlight .command {
                    background-color: rgba(139, 92, 246, 0.15);
                    color: #8b5cf6;
                    font-weight: 600;
                    border-radius: 3px;
                    padding: 1px 2px;
                }
                
                .command-highlight .rest-text {
                    color: #333;
                }
                
                #messageInput {
                    position: relative;
                    z-index: 2;
                    caret-color: #333;
                }
                
                #messageInput.has-command {
                    background: linear-gradient(90deg, 
                        rgba(139, 92, 246, 0.05) 0%, 
                        rgba(139, 92, 246, 0.05) var(--command-width, 50px), 
                        transparent var(--command-width, 50px));
                }
                
                /* Style for command text using first-letter and custom styling */
                .command-text-wrapper {
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    padding: 8px 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    z-index: 3;
                }
                
                .command-text-wrapper .command-part {
                    color: #8b5cf6;
                    font-weight: 600;
                }
                
                .command-text-wrapper .normal-part {
                    color: #333;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Create wrapper and text overlay
        const originalParent = textarea.parentElement;
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'input-wrapper';
        inputWrapper.style.position = 'relative';
        inputWrapper.style.flex = '1';
        
        // Move textarea to wrapper
        originalParent.insertBefore(inputWrapper, textarea);
        inputWrapper.appendChild(textarea);
        
        // Create text overlay for styled command
        const textOverlay = document.createElement('div');
        textOverlay.className = 'command-text-wrapper';
        textOverlay.style.display = 'none';
        inputWrapper.appendChild(textOverlay);
        
        // Update on input
        textarea.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Check if text starts with a valid command
            const parts = value.split(' ');
            const firstPart = parts[0];
            
            // Only style if it's an EXACT match to a valid command
            if (firstPart && validCommands.includes(firstPart)) {
                const restOfText = parts.slice(1).join(' ');
                
                // Show overlay with styled text
                textOverlay.style.display = 'block';
                textOverlay.innerHTML = `<span class="command-part">${escapeHtml(firstPart)}</span>${restOfText ? '<span class="normal-part"> ' + escapeHtml(restOfText) + '</span>' : ''}`;
                
                // Hide the actual textarea text
                textarea.style.color = 'transparent';
                textarea.style.textShadow = 'none';
                
                // Add background highlight
                textarea.classList.add('has-command');
                
                // Calculate command width for gradient
                const tempSpan = document.createElement('span');
                tempSpan.style.cssText = 'position: absolute; visibility: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; font-weight: 600;';
                tempSpan.textContent = firstPart;
                document.body.appendChild(tempSpan);
                const commandWidth = tempSpan.offsetWidth + 20; // Add some padding
                document.body.removeChild(tempSpan);
                
                textarea.style.setProperty('--command-width', commandWidth + 'px');
            } else {
                // No valid command, show normal text
                textOverlay.style.display = 'none';
                textarea.style.color = '';
                textarea.style.textShadow = '';
                textarea.classList.remove('has-command');
            }
            
            // Update tab attachment preview
            updateTabAttachmentPreview(textarea);
            
            // Check for @tab functionality
            handleTabSuggestions(e);
        });
        
        // Function to show tab attachments in input area
        function updateTabAttachmentPreview(textarea) {
            let previewContainer = document.getElementById('tab-preview-container');
            
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.id = 'tab-preview-container';
                previewContainer.style.cssText = `
                    display: none;
                    padding: 8px 12px;
                    background: rgba(30, 30, 30, 0.9);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    overflow-x: auto;
                    overflow-y: hidden;
                    white-space: nowrap;
                    max-height: 60px;
                    position: relative;
                `;
                
                // Create scrollable content container
                const scrollContainer = document.createElement('div');
                scrollContainer.id = 'tab-scroll-container';
                scrollContainer.style.cssText = `
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    min-height: 44px;
                    padding: 2px 0;
                `;
                
                previewContainer.appendChild(scrollContainer);
                
                // Insert above the input form
                const inputContainer = textarea.closest('.input-container');
                inputContainer.insertBefore(previewContainer, inputContainer.firstChild);
            }
            
            const scrollContainer = document.getElementById('tab-scroll-container');
            
            // Check if there are attached tabs
            if (textarea.attachedTabs && textarea.attachedTabs.size > 0) {
                previewContainer.style.display = 'block';
                scrollContainer.innerHTML = '';
                
                for (const [tabId, tabData] of textarea.attachedTabs) {
                        const preview = document.createElement('div');
                        preview.className = 'tab-preview-item';
                        preview.style.cssText = `
                            display: inline-flex;
                            align-items: center;
                        background: rgba(50, 50, 50, 0.8);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 6px 10px;
                        gap: 8px;
                            font-size: 12px;
                        color: #ffffff;
                        white-space: nowrap;
                        flex-shrink: 0;
                        transition: all 0.2s ease;
                        cursor: pointer;
                        `;
                        
                        const icon = document.createElement('img');
                        icon.src = tabData.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjwvc3ZnPg==';
                    icon.style.cssText = 'width: 16px; height: 16px; flex-shrink: 0;';
                        icon.onerror = () => {
                            icon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjwvc3ZnPg==';
                        };
                        
                        const title = document.createElement('span');
                    title.textContent = tabData.title.length > 25 ? tabData.title.substring(0, 25) + '...' : tabData.title;
                    title.style.cssText = 'flex-shrink: 0; max-width: 150px; overflow: hidden; text-overflow: ellipsis;';
                        
                        const removeBtn = document.createElement('button');
                        removeBtn.textContent = '×';
                        removeBtn.style.cssText = `
                            background: none;
                            border: none;
                        color: rgba(255, 255, 255, 0.6);
                            font-size: 16px;
                            cursor: pointer;
                            padding: 0 0 0 4px;
                            line-height: 1;
                        flex-shrink: 0;
                        transition: color 0.2s ease;
                    `;
                    
                    removeBtn.onmouseover = () => {
                        removeBtn.style.color = '#ff6b6b';
                    };
                    
                    removeBtn.onmouseout = () => {
                        removeBtn.style.color = 'rgba(255, 255, 255, 0.6)';
                    };
                    
                    removeBtn.onclick = (e) => {
                        e.stopPropagation();
                            textarea.attachedTabs.delete(tabId);
                            updateTabAttachmentPreview(textarea);
                            textarea.focus();
                        };
                    
                    // Add hover effect to preview item
                    preview.onmouseenter = () => {
                        preview.style.background = 'rgba(70, 70, 70, 0.9)';
                        preview.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        preview.style.transform = 'translateY(-1px)';
                    };
                    
                    preview.onmouseleave = () => {
                        preview.style.background = 'rgba(50, 50, 50, 0.8)';
                        preview.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        preview.style.transform = 'translateY(0)';
                    };
                        
                        preview.appendChild(icon);
                        preview.appendChild(title);
                        preview.appendChild(removeBtn);
                    scrollContainer.appendChild(preview);
                }
            } else {
                previewContainer.style.display = 'none';
            }
        }
        
        // Add @tab dropdown functionality
        let tabDropdown = null;
        let selectedTabIndex = -1;
        let currentTabs = [];
        
        function handleTabSuggestions(event) {
            const textarea = event.target;
            const value = textarea.value;
            const cursorPosition = textarea.selectionStart;
            
            // Find if we're typing @ at the cursor position
            const textBeforeCursor = value.substring(0, cursorPosition);
            const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
            
            if (lastAtSymbol !== -1 && lastAtSymbol === textBeforeCursor.length - 1) {
                // User just typed @, show tab suggestions
                showTabDropdown(textarea);
            } else if (lastAtSymbol !== -1) {
                // Check if we're still in an @mention
                const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
                const hasSpace = textAfterAt.includes(' ');
                
                if (!hasSpace && tabDropdown) {
                    // Still typing the @mention, filter the dropdown
                    filterTabDropdown(textAfterAt.toLowerCase());
                } else if (tabDropdown) {
                    // We've moved past the @mention
                    hideTabDropdown();
                }
            } else if (tabDropdown) {
                // No @ symbol, hide dropdown
                hideTabDropdown();
            }
        }
        
        function showTabDropdown(textarea) {
            // Get list of tabs from background
            chrome.runtime.sendMessage({ type: 'GET_TAB_INFO' }, (response) => {
                if (response && response.tabs) {
                    currentTabs = response.tabs;
                    createTabDropdown(textarea, response.tabs);
                }
            });
        }
        
        function createTabDropdown(textarea, tabs) {
            // Remove existing dropdown if any
            if (tabDropdown) {
                tabDropdown.remove();
            }
            
            // Create dropdown container
            tabDropdown = document.createElement('div');
            tabDropdown.className = 'tab-dropdown';
            tabDropdown.style.cssText = `
                position: absolute;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                min-width: 300px;
                max-width: 400px;
            `;
            
            // Create tab items
            tabs.forEach((tab, index) => {
                const tabItem = document.createElement('div');
                tabItem.className = 'tab-item';
                tabItem.dataset.tabIndex = index;
                tabItem.style.cssText = `
                    padding: 10px 15px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: background 0.15s;
                    border-bottom: 1px solid #f0f0f0;
                `;
                
                // Add favicon
                const favicon = document.createElement('img');
                favicon.src = tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjwvc3ZnPg==';
                favicon.style.cssText = 'width: 16px; height: 16px; flex-shrink: 0;';
                favicon.onerror = () => {
                    favicon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjwvc3ZnPg==';
                };
                
                // Add tab title and URL
                const tabInfo = document.createElement('div');
                tabInfo.style.cssText = 'flex: 1; overflow: hidden;';
                
                const tabTitleContainer = document.createElement('div');
                tabTitleContainer.style.cssText = 'display: flex; align-items: center; gap: 5px;';
                
                const tabTitle = document.createElement('span');
                tabTitle.textContent = tab.title || 'Untitled';
                tabTitle.style.cssText = 'font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                
                // Add cached indicator if tab has screenshot
                if (tab.hasScreenshot) {
                    const cachedIndicator = document.createElement('span');
                    cachedIndicator.textContent = '📸';
                    cachedIndicator.title = 'Screenshot cached';
                    cachedIndicator.style.cssText = 'font-size: 12px; opacity: 0.7;';
                    tabTitleContainer.appendChild(cachedIndicator);
                }
                
                tabTitleContainer.appendChild(tabTitle);
                
                const tabUrl = document.createElement('div');
                tabUrl.textContent = new URL(tab.url).hostname;
                tabUrl.style.cssText = 'font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                
                tabInfo.appendChild(tabTitleContainer);
                tabInfo.appendChild(tabUrl);
                
                tabItem.appendChild(favicon);
                tabItem.appendChild(tabInfo);
                
                // Hover effect
                tabItem.addEventListener('mouseenter', () => {
                    tabItem.style.background = '#f5f5f5';
                    selectedTabIndex = index;
                    updateSelectedTab();
                });
                
                tabItem.addEventListener('mouseleave', () => {
                    if (selectedTabIndex !== index) {
                        tabItem.style.background = '';
                    }
                });
                
                // Click to insert
                tabItem.addEventListener('click', () => {
                    insertTabReference(textarea, tab);
                });
                
                tabDropdown.appendChild(tabItem);
            });
            
            // Position dropdown below textarea
            const rect = textarea.getBoundingClientRect();
            const inputWrapper = textarea.closest('.input-wrapper');
            const wrapperRect = inputWrapper.getBoundingClientRect();
            
            tabDropdown.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
            tabDropdown.style.left = (rect.left - wrapperRect.left) + 'px';
            tabDropdown.style.right = (wrapperRect.right - rect.right) + 'px';
            
            // Add to wrapper
            inputWrapper.appendChild(tabDropdown);
            
            // Reset selection
            selectedTabIndex = 0;
            updateSelectedTab();
        }
        
        function filterTabDropdown(searchText) {
            if (!tabDropdown || !currentTabs) return;
            
            const tabItems = tabDropdown.querySelectorAll('.tab-item');
            let visibleCount = 0;
            let firstVisibleIndex = -1;
            
            tabItems.forEach((item, index) => {
                const tab = currentTabs[index];
                const matchesSearch = tab.title.toLowerCase().includes(searchText) || 
                                    tab.url.toLowerCase().includes(searchText);
                
                if (matchesSearch) {
                    item.style.display = '';
                    visibleCount++;
                    if (firstVisibleIndex === -1) {
                        firstVisibleIndex = index;
                    }
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Update selection to first visible item
            if (visibleCount > 0) {
                selectedTabIndex = firstVisibleIndex;
                updateSelectedTab();
            } else {
                hideTabDropdown();
            }
        }
        
        function updateSelectedTab() {
            if (!tabDropdown) return;
            
            const tabItems = tabDropdown.querySelectorAll('.tab-item');
            tabItems.forEach((item, index) => {
                if (index === selectedTabIndex) {
                    item.style.background = '#f5f5f5';
                } else {
                    item.style.background = '';
                }
            });
        }
        
        function insertTabReference(textarea, tab) {
            const value = textarea.value;
            const cursorPosition = textarea.selectionStart;
            const textBeforeCursor = value.substring(0, cursorPosition);
            const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
            
            if (lastAtSymbol !== -1) {
                // Store tab data
                if (!textarea.attachedTabs) {
                    textarea.attachedTabs = new Map();
                }
                textarea.attachedTabs.set(tab.id, tab);
                
                // Replace the @ symbol and search text with the tab title
                const textBeforeAt = value.substring(0, lastAtSymbol);
                const textAfterCursor = value.substring(cursorPosition);
                const tabReference = `@${tab.title}`;
                textarea.value = textBeforeAt + tabReference + ' ' + textAfterCursor;
                
                // Update preview
                updateTabAttachmentPreview(textarea);
                
                // Set cursor position after the tab reference
                const newCursorPosition = lastAtSymbol + tabReference.length + 1;
                textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                
                // Get screenshot from cache (should be instant)
                captureTabScreenshot(tab.id).then(screenshot => {
                    if (screenshot) {
                        tabScreenshots.set(tab.id, {
                            tabId: tab.id,
                            title: tab.title,
                            url: tab.url,
                            screenshot: screenshot
                        });
                        console.log('[Sidebar] Got screenshot for tab:', tab.title);
                    }
                }).catch(error => {
                    console.error('[Sidebar] Failed to get tab screenshot:', error);
                });
                
                // Trigger input event to update any listeners
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            hideTabDropdown();
            textarea.focus();
        }
        
        function captureTabScreenshot(tabId) {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    type: 'CAPTURE_TAB_SCREENSHOT',
                    tabId: tabId
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else if (response && response.success) {
                        resolve(response.screenshot);
                    } else {
                        reject(new Error(response?.error || 'Failed to capture screenshot'));
                    }
                });
            });
        }
        
        function hideTabDropdown() {
            if (tabDropdown) {
                tabDropdown.remove();
                tabDropdown = null;
                selectedTabIndex = -1;
                currentTabs = [];
            }
        }
        
        // Handle keyboard navigation in dropdown
        textarea.addEventListener('keydown', function(e) {
            if (!tabDropdown) return;
            
            const visibleItems = Array.from(tabDropdown.querySelectorAll('.tab-item')).filter(item => item.style.display !== 'none');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedTabIndex = Math.min(selectedTabIndex + 1, visibleItems.length - 1);
                    updateSelectedTab();
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    selectedTabIndex = Math.max(selectedTabIndex - 1, 0);
                    updateSelectedTab();
                    break;
                    
                case 'Enter':
                    if (selectedTabIndex >= 0 && currentTabs[selectedTabIndex]) {
                        e.preventDefault();
                        insertTabReference(textarea, currentTabs[selectedTabIndex]);
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    hideTabDropdown();
                    break;
            }
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (tabDropdown && !tabDropdown.contains(e.target) && e.target !== textarea) {
                hideTabDropdown();
            }
        });
        
        // Sync scroll
        textarea.addEventListener('scroll', function() {
            textOverlay.scrollTop = textarea.scrollTop;
            textOverlay.scrollLeft = textarea.scrollLeft;
        });
        
        // Handle resize
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const styles = window.getComputedStyle(entry.target);
                textOverlay.style.width = entry.target.offsetWidth + 'px';
                textOverlay.style.height = entry.target.offsetHeight + 'px';
            }
        });
        resizeObserver.observe(textarea);
    }
    
    // Add minimalistic heartbeat text where the button was
    const messagesContainer = document.getElementById('messages');
    const heartbeatTextDiv = document.createElement('div');
    heartbeatTextDiv.style.cssText = 'text-align: center; margin: 12px 0; padding: 8px 0;';
    
    const heartbeatText = document.createElement('span');
    heartbeatText.textContent = 'Hi Prachi';
    heartbeatText.style.cssText = `
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 18px;
        font-weight: 300;
        color: #ff6b9d;
        animation: heartbeat 2s ease-in-out infinite;
        display: inline-block;
    `;
    
    // Add heartbeat animation CSS
    if (!document.getElementById('heartbeat-styles')) {
        const style = document.createElement('style');
        style.id = 'heartbeat-styles';
        style.textContent = `
            @keyframes heartbeat {
                0% {
                    transform: scale(1);
                    opacity: 0.7;
                }
                50% {
                    transform: scale(1.08);
                    opacity: 1;
                }
                100% {
                    transform: scale(1);
                    opacity: 0.7;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    heartbeatTextDiv.appendChild(heartbeatText);
    messagesContainer.appendChild(heartbeatTextDiv);

    // Removed DOM controls section - buttons moved or removed
}); 