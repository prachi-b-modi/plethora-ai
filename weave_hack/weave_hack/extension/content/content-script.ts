// Content script for Dynamic Script Runner extension
console.log('[Content Script] Dynamic Script Runner loaded on:', window.location.href);

// Debug: Log when content script is initialized
console.log('[Content Script] Initializing...');

// Sidebar state
let sidebarVisible = false;
let sidebarElement: HTMLElement | null = null;

// DOM Scanner Functions
function cssPath(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  
  const segments: string[] = [];
  let current: Element | null = el;
  
  while (current && current.nodeType === 1 && segments.length < 4) {
    let selector = current.localName;
    if (!selector) break;
    
    // Check for data-testid or aria-label
    const testId = current.getAttribute('data-testid');
    const ariaLabel = current.getAttribute('aria-label');
    
    if (testId) {
      segments.unshift(`[data-testid="${CSS.escape(testId)}"]`);
      break;
    }
    if (ariaLabel) {
      segments.unshift(`[aria-label="${CSS.escape(ariaLabel)}"]`);
      break;
    }
    
    // Add nth-of-type if needed
    const parent = current.parentNode;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.localName === selector
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    segments.unshift(selector);
    current = current.parentElement;
  }
  
  return segments.join(' > ');
}

function scanDOM(): any {
  console.log('[Content Script] Scanning DOM for interactive elements...');
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (element: Element) => {
        const el = element as HTMLElement;
        const tag = el.tagName?.toLowerCase();
        
        // Skip invisible elements
        if (!el.offsetParent && el.style.display !== 'none') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Accept interactive elements
        if (['a', 'button', 'select', 'textarea'].includes(tag)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        if (tag === 'input' && (el as HTMLInputElement).type !== 'hidden') {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        if (el.onclick || el.getAttribute('role') === 'button' || el.hasAttribute('onclick')) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        // Also include elements with click handlers
        if (el.style.cursor === 'pointer') {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  const MAX_ELEMENTS = 250;
  const elements: any[] = [];
  
  while (elements.length < MAX_ELEMENTS && walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;
    const rect = el.getBoundingClientRect();
    
    // Skip elements outside viewport
    if (rect.width === 0 || rect.height === 0) continue;
    
    const elementInfo = {
      selector: cssPath(el),
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      classes: el.className ? el.className.split(/\s+/).filter(Boolean) : undefined,
      role: el.getAttribute('role') || undefined,
      type: (el as HTMLInputElement).type || undefined,
      name: el.getAttribute('name') || undefined,
      placeholder: (el as HTMLInputElement).placeholder || undefined,
      ariaLabel: el.getAttribute('aria-label') || undefined,
      text: el.innerText?.trim().slice(0, 50) || undefined,
      value: (el as HTMLInputElement).value || undefined,
      dataTestId: el.getAttribute('data-testid') || undefined,
      href: (el as HTMLAnchorElement).href || undefined,
      bbox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };
    
    // Clean up undefined values
    Object.keys(elementInfo).forEach(key => {
      if (elementInfo[key] === undefined) {
        delete elementInfo[key];
      }
    });
    
    elements.push(elementInfo);
  }
  
  // Also gather page metadata
  const pageContext = {
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname,
    path: window.location.pathname,
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    forms: Array.from(document.forms).map(form => ({
      id: form.id || undefined,
      name: form.name || undefined,
      action: form.action || undefined,
      method: form.method || undefined
    })).filter(f => f.id || f.name),
    elements: elements
  };
  
  console.log(`[Content Script] Found ${elements.length} interactive elements`);
  return pageContext;
}

// Create the sidebar element
function createSidebar(): HTMLElement {
  console.log('[Content Script] Creating sidebar...');
  
  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'dsr-sidebar';
  sidebar.className = 'dsr-sidebar';
  
  // Set initial styles
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: #ffffff;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 2147483647;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  `;
  
  // Create iframe to load enhanced HTML app with tabs
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('sidebar/index-with-agent.html');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: white;
  `;
  
  sidebar.appendChild(iframe);
  
  // Listen for messages from the iframe
  window.addEventListener('message', (event) => {
    if (event.data.type === 'CLOSE_SIDEBAR') {
      console.log('[Content Script] Close sidebar message from iframe');
      toggleSidebar();
    } else if (event.data.type === 'GET_PAGE_CONTEXT') {
      console.log('[Content Script] Page context requested');
      // Scan DOM for interactive elements
      const domContext = scanDOM();
      
      // Send page context back to iframe
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'PAGE_CONTEXT',
          context: {
            url: window.location.href,
            title: document.title,
            selectedText: window.getSelection()?.toString() || '',
            domElements: domContext
          }
        }, '*');
      }
    } else if (event.data.type === 'EXECUTE_GENERATED_SCRIPT') {
      console.log('[Content Script] Execute generated script requested');
      // Request script execution from background using chrome.scripting API
      chrome.runtime.sendMessage({
        type: 'EXECUTE_SCRIPT_VIA_API'
      }, (response) => {
        console.log('[Content Script] Script execution response:', response);
        
        // Notify sidebar of result
        if (iframe.contentWindow) {
          if (response && response.success) {
            iframe.contentWindow.postMessage({
              type: 'SCRIPT_EXECUTED',
              success: true
            }, '*');
          } else {
            iframe.contentWindow.postMessage({
              type: 'SCRIPT_EXECUTED',
              success: false,
              error: response?.error || 'Script execution failed'
            }, '*');
          }
        }
      });
    }
  });
  
  return sidebar;
}

// Toggle sidebar visibility
function toggleSidebar() {
  console.log('[Content Script] Toggling sidebar...');
  
  if (!sidebarElement) {
    // Create sidebar if it doesn't exist
    sidebarElement = createSidebar();
    document.body.appendChild(sidebarElement);
    
    // Force reflow to ensure transition works
    sidebarElement.offsetHeight;
  }
  
  // Toggle visibility
  sidebarVisible = !sidebarVisible;
  
  if (sidebarVisible) {
    sidebarElement.style.transform = 'translateX(0)';
    // Add padding to body to prevent content overlap
    document.body.style.marginRight = '400px';
    document.body.style.transition = 'margin-right 0.3s ease-in-out';
  } else {
    sidebarElement.style.transform = 'translateX(100%)';
    // Remove body padding
    document.body.style.marginRight = '0';
  }
  
  console.log('[Content Script] Sidebar is now:', sidebarVisible ? 'visible' : 'hidden');
  
  // Debug: Log sidebar element details
  if (sidebarElement) {
    console.log('[Content Script] Sidebar element:', {
      id: sidebarElement.id,
      transform: sidebarElement.style.transform,
      zIndex: sidebarElement.style.zIndex,
      position: sidebarElement.style.position,
      width: sidebarElement.style.width,
      height: sidebarElement.style.height,
      right: sidebarElement.style.right,
      top: sidebarElement.style.top,
      visibility: sidebarElement.style.visibility,
      display: sidebarElement.style.display
    });
  }
}

// Listen for messages from the extension (background or popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content Script] Message received:', request);
  
  // Handle different message types
  switch (request.type) {
    case 'PING':
      console.log('[Content Script] Responding to ping');
      sendResponse({ status: 'PONG', url: window.location.href });
      break;
      
    case 'TOGGLE_SIDEBAR':
      console.log('[Content Script] Toggle sidebar requested');
      toggleSidebar();
      sendResponse({ status: 'OK', visible: sidebarVisible });
      break;
      
    default:
      console.log('[Content Script] Unknown message type:', request.type);
      sendResponse({ status: 'ERROR', message: 'Unknown message type' });
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Debug: Notify background script that content script is ready
chrome.runtime.sendMessage({ 
  type: 'CONTENT_SCRIPT_READY', 
  url: window.location.href 
}, (response) => {
  console.log('[Content Script] Background acknowledged:', response);
});

// Add a visual indicator that the extension is active (temporary for debugging)
const debugIndicator = document.createElement('div');
debugIndicator.style.cssText = `
  position: fixed;
  bottom: 10px;
  left: 10px;
  background: #4CAF50;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 12px;
  z-index: 999999;
  pointer-events: none;
`;
debugIndicator.textContent = 'DSR Active';
document.body.appendChild(debugIndicator);

// Remove debug indicator after 3 seconds
setTimeout(() => {
  debugIndicator.remove();
}, 3000);

console.log('[Content Script] Initialization complete'); 