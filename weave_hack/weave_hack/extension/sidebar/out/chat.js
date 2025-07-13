// Chat functionality for Dynamic Script Runner
let isLoading = false;
let pendingMessage = null;

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
    
    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Show loading
    isLoading = true;
    updateSendButton();
    showLoading();
    
    // Store message and request page context
    pendingMessage = message;
    window.parent.postMessage({ type: 'GET_PAGE_CONTEXT' }, '*');
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
                        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    }
                    
                    .command-badge[data-command="/memory"] {
                        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
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
    
    // Convert newlines to <br> but not inside <pre> tags
    const parts = formattedContent.split(/(<pre[\s\S]*?<\/pre>)/);
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
    sendBtn.textContent = isLoading ? '...' : 'Send';
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
        background: #22c55e;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 8px;
    `;
    
    // Add event listener instead of inline onclick
    button.addEventListener('click', executeScript);
    
    buttonDiv.appendChild(avatar);
    buttonDiv.appendChild(button);
    
    messagesContainer.appendChild(buttonDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function executeScript() {
    window.parent.postMessage({ type: 'EXECUTE_GENERATED_SCRIPT' }, '*');
    addMessage('Script executed! Check the page for changes.', 'ai');
}

// Initialize with welcome message
document.addEventListener('DOMContentLoaded', function() {
    // Add welcome message
    addMessage(`Hello! I'm connected to your Universal Web Command Center. Here are the available commands:

📋 **Available Commands:**
• **/help** - Show available commands
• **/web [query]** - Search the web using AI
• **/memory save [content]** - Save information
• **/memory search [query]** - AI-powered memory search
• **/memory list [limit]** - List memories
• **/memory delete [id]** - Delete a memory
• **Plain text** - Defaults to web search

I can also help you generate scripts to automate this webpage. Just describe what you want to do!`, 'ai');

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
        
        // Add CSS for command highlighting if not already added
        if (!document.getElementById('input-command-styles')) {
            const style = document.createElement('style');
            style.id = 'input-command-styles';
            style.textContent = `
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

    // Create a container for DOM-related buttons
    const domControlsDiv = document.createElement('div');
    domControlsDiv.style.cssText = 'text-align: center; margin: 10px 0;';
    
    // Show Page Info button
    const domButton = document.createElement('button');
    domButton.textContent = '🔍 Show Page Info';
    domButton.style.cssText = `
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
        margin-right: 10px;
    `;
    domButton.addEventListener('click', showDOMInfo);
    domButton.addEventListener('mouseover', () => {
        domButton.style.background = '#2563eb';
    });
    domButton.addEventListener('mouseout', () => {
        domButton.style.background = '#3b82f6';
    });
    
    // Export JSON button
    const exportButton = document.createElement('button');
    exportButton.textContent = '💾 Export as JSON';
    exportButton.style.cssText = `
        background: #10b981;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
    `;
    exportButton.addEventListener('click', exportDOMData);
    exportButton.addEventListener('mouseover', () => {
        exportButton.style.background = '#059669';
    });
    exportButton.addEventListener('mouseout', () => {
        exportButton.style.background = '#10b981';
    });
    
    domControlsDiv.appendChild(domButton);
    domControlsDiv.appendChild(exportButton);
    testButtonDiv.parentNode.insertBefore(domControlsDiv, testButtonDiv.nextSibling);
}); 