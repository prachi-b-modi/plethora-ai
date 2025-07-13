// Background service worker for Dynamic Script Runner extension
console.log('[Background] Service worker starting...');

import { ClaudeService } from './services/claude-service';
import { MessageType, IMessage, IChatMessage } from '../shared/types/messages';
import { getEnabledUserscripts, getAllUserscripts } from '../shared/userscripts/manager';

// Initialize services
const claudeService = new ClaudeService();

// Track active tabs and their states
interface TabState {
  sidebarOpen: boolean;
  lastGeneratedCode?: string;
}
const tabStates = new Map<number, TabState>();

// Track conversation history per tab
const conversationHistory = new Map<number, Array<{role: 'user' | 'assistant', content: string}>>();

// Tab screenshot cache
interface TabScreenshotCache {
  tabId: number;
  url: string;
  title: string;
  screenshot: string;
  timestamp: number;
}

const tabScreenshotCache = new Map<number, TabScreenshotCache>();
const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 20; // Maximum number of cached screenshots

// Function to capture and cache tab screenshot
async function captureAndCacheTab(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    // Skip special URLs that can't be captured
    if (!tab.url || 
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('file://') && tab.url.endsWith('.pdf')) {
      console.log('[Background] Skipping screenshot for special URL:', tab.url);
      return;
    }
    
    // Capture screenshot
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90
    });
    
    // Store in cache
    tabScreenshotCache.set(tabId, {
      tabId,
      url: tab.url,
      title: tab.title || 'Untitled',
      screenshot,
      timestamp: Date.now()
    });
    
    console.log('[Background] Cached screenshot for tab:', tab.title, 'Cache size:', tabScreenshotCache.size);
    
    // Clean up old cache entries if we exceed max size
    if (tabScreenshotCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(tabScreenshotCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      toRemove.forEach(([id]) => tabScreenshotCache.delete(id));
    }
  } catch (error) {
    console.error('[Background] Error capturing tab screenshot:', error);
  }
}

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('[Background] Tab activated:', activeInfo.tabId);
  
  // Small delay to ensure tab is fully rendered
  setTimeout(() => {
    captureAndCacheTab(activeInfo.tabId);
  }, 300);
});

// Listen for tab updates (page load, navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Capture when page completes loading
  if (changeInfo.status === 'complete') {
    console.log('[Background] Tab loaded:', tabId, tab.title);
    
    // Small delay to ensure page is fully rendered
    setTimeout(() => {
      captureAndCacheTab(tabId);
    }, 500);
  }
});

// Register userscripts on startup
async function registerUserscripts() {
  console.log('[Background] Registering userscripts...');
  
  try {
    // Check if scripting API is available
    if (!chrome.scripting) {
      console.error('[Background] chrome.scripting API not available');
      return;
    }

    // First, unregister all existing userscripts
    try {
      const existingScripts = await chrome.scripting.getRegisteredContentScripts();
      const userscriptIds = existingScripts
        .filter(script => script.id.startsWith('us-'))
        .map(script => script.id);
      
      if (userscriptIds.length > 0) {
        console.log('[Background] Unregistering existing userscripts:', userscriptIds);
        await chrome.scripting.unregisterContentScripts({
          ids: userscriptIds
        });
      }
    } catch (error) {
      console.error('[Background] Error unregistering scripts:', error);
    }

    // Get all enabled userscripts
    const enabledScripts = await getEnabledUserscripts();
    console.log('[Background] Found enabled userscripts:', enabledScripts.length);

    // Register each enabled script
    for (const script of enabledScripts) {
      try {
        const scriptId = `us-${script.id}`;
        const registration = {
          id: scriptId,
          matches: script.metadata.matches,
          js: [`userscripts/${script.id}.js`],
          runAt: script.metadata.runAt as chrome.scripting.RunAt,
          world: 'ISOLATED' as chrome.scripting.ExecutionWorld,
          allFrames: true
        };
        
        console.log('[Background] Registering script:', scriptId, registration);
        
        await chrome.scripting.registerContentScripts([registration]);
        console.log('[Background] Successfully registered:', scriptId);
      } catch (error) {
        console.error('[Background] Error registering script:', script.id, error);
      }
    }
    
    console.log('[Background] Userscript registration complete');
  } catch (error) {
    console.error('[Background] Fatal error in registerUserscripts:', error);
  }
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    console.log('[Background] First time installation');
    // Set default storage values
    chrome.storage.local.set({
      scripts: [],
      settings: {
        apiKey: '',
        theme: 'light'
      }
    });
  }
  
  // Register userscripts on install/update
  await registerUserscripts();
});

// Register userscripts on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Extension starting up');
  await registerUserscripts();
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Background] Extension icon clicked for tab:', tab.id);
  
  if (!tab.id) return;
  
  try {
    // Send message to content script to toggle sidebar
    const response = await chrome.tabs.sendMessage(tab.id, { 
      type: 'TOGGLE_SIDEBAR' 
    });
    
    console.log('[Background] Toggle sidebar response:', response);
    
    // Update tab state
    const currentState = tabStates.get(tab.id) || { sidebarOpen: false };
    tabStates.set(tab.id, { 
      sidebarOpen: !currentState.sidebarOpen 
    });
    
  } catch (error) {
    console.error('[Background] Error toggling sidebar:', error);
    
    // Content script might not be injected yet, inject it
    console.log('[Background] Injecting content script...');
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content-script.js']
    });
    
    // Try again after injection
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id!, { type: 'TOGGLE_SIDEBAR' });
    }, 100);
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Message received:', request, 'from:', sender.tab?.url);
  
  switch (request.type) {
    case 'CONTENT_SCRIPT_READY':
      console.log('[Background] Content script ready on:', request.url);
      sendResponse({ status: 'OK', message: 'Background acknowledged' });
      break;
      
    case 'userscripts:changed':
      // Re-register userscripts when they change
      console.log('[Background] Userscripts changed, re-registering...');
      registerUserscripts().then(() => {
        sendResponse({ status: 'OK' });
      }).catch(error => {
        sendResponse({ status: 'ERROR', error: error.message });
      });
      return true; // Will send response asynchronously
      
    case 'GET_TAB_INFO':
      // Return information about all open tabs
      chrome.tabs.query({}, (tabs) => {
        const tabInfo = tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          hasScreenshot: tabScreenshotCache.has(tab.id!)
        }));
        sendResponse({ tabs: tabInfo });
      });
      return true; // Will send response asynchronously
      
    case MessageType.CHAT_MESSAGE:
      // Handle chat message from sidebar
      handleChatMessage(request, sender, sendResponse);
      return true; // Will send response asynchronously
      
    case MessageType.EXECUTE_SCRIPT:
    case 'EXECUTE_SCRIPT':
      // Execute a script in the current tab
      if (sender.tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          func: (code: string) => {
            try {
              // Create a function from the code string and execute it
              const scriptFunc = new Function(code);
              return scriptFunc();
            } catch (error) {
              console.error('[Script Execution Error]:', error);
              throw error;
            }
          },
          args: [request.code || request.payload?.code]
        }).then(results => {
          sendResponse({ success: true, results });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      }
      return true; // Will send response asynchronously
      
    case 'GET_LAST_SCRIPT':
      // Get the last generated script for this tab
      const tabState = tabStates.get(sender.tab?.id!);
      if (tabState && tabState.lastGeneratedCode) {
        sendResponse({ code: tabState.lastGeneratedCode });
      } else {
        sendResponse({ error: 'No script available' });
      }
      break;
      
    case 'EXECUTE_SCRIPT_VIA_API':
      // Execute the last generated script using chrome.debugger API to bypass all security
      (async () => {
        if (sender.tab?.id) {
          const state = tabStates.get(sender.tab.id);
          if (state && state.lastGeneratedCode) {
            const tabId = sender.tab.id;
            
            // Log the script that will be executed
            console.log('[Background] Executing generated script:');
            console.log('================== SCRIPT START ==================');
            console.log(state.lastGeneratedCode);
            console.log('================== SCRIPT END ====================');
            
            try {
              // Attach debugger to the tab
              await chrome.debugger.attach({ tabId }, '1.3');
              
              // Execute the script using Runtime.evaluate
              const result = await chrome.debugger.sendCommand(
                { tabId },
                'Runtime.evaluate',
                {
                  expression: state.lastGeneratedCode,
                  userGesture: true,
                  awaitPromise: true,
                  returnByValue: true,
                  allowUnsafeEvalBlockedByCSP: true // This bypasses CSP
                }
              );
              
              // Detach debugger
              await chrome.debugger.detach({ tabId });
              
              console.log('[Background] Script executed via debugger:', result);
              sendResponse({ success: true, results: [result] });
              
            } catch (error) {
              // Make sure to detach debugger even if there's an error
              try {
                await chrome.debugger.detach({ tabId });
              } catch (detachError) {
                // Ignore detach errors
              }
              
              console.error('[Background] Debugger execution error:', error);
              sendResponse({ success: false, error: error.message });
            }
          } else {
            sendResponse({ success: false, error: 'No script available' });
          }
        } else {
          sendResponse({ success: false, error: 'No tab ID found' });
        }
      })();
      return true; // Will send response asynchronously
      
    case 'EXECUTE_TEST_SCRIPT':
      // Execute a hardcoded test script using debugger API
      (async () => {
        if (sender.tab?.id) {
          const tabId = sender.tab.id;
          const testCode = request.code || 'document.body.style.backgroundColor = "red";';
          
          // Log the script that will be executed
          console.log('[Background] Executing test script:');
          console.log('================== SCRIPT START ==================');
          console.log(testCode);
          console.log('================== SCRIPT END ====================');
          
          try {
            // Attach debugger to the tab
            await chrome.debugger.attach({ tabId }, '1.3');
            
            // Execute the test script
            const result = await chrome.debugger.sendCommand(
              { tabId },
              'Runtime.evaluate',
              {
                expression: testCode,
                userGesture: true,
                awaitPromise: true,
                returnByValue: true,
                allowUnsafeEvalBlockedByCSP: true
              }
            );
            
            // Detach debugger
            await chrome.debugger.detach({ tabId });
            
            console.log('[Background] Test script executed:', result);
            sendResponse({ success: true, result });
            
          } catch (error) {
            // Make sure to detach debugger even if there's an error
            try {
              await chrome.debugger.detach({ tabId });
            } catch (detachError) {
              // Ignore detach errors
            }
            
            console.error('[Background] Test script execution error:', error);
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'No tab ID found' });
        }
      })();
      return true; // Will send response asynchronously
      
    case 'CAPTURE_TAB_SCREENSHOT':
      // Get screenshot from cache or capture new one
      (async () => {
        const targetTabId = request.tabId;
        if (!targetTabId) {
          sendResponse({ success: false, error: 'No tab ID provided' });
          return;
        }
        
        try {
          // Check cache first
          const cached = tabScreenshotCache.get(targetTabId);
          const now = Date.now();
          
          if (cached && (now - cached.timestamp) < MAX_CACHE_AGE) {
            console.log('[Background] Using cached screenshot for tab:', targetTabId);
            sendResponse({
              success: true,
              screenshot: cached.screenshot,
              fromCache: true
            });
            return;
          }
          
          // Cache miss or expired, capture new screenshot
          console.log('[Background] Cache miss, capturing new screenshot for tab:', targetTabId);
          
          // Get current active tab to restore later
          const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          
          // Switch to the target tab to capture it
          await chrome.tabs.update(targetTabId, { active: true });
          
          // Small delay to ensure tab is fully loaded
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Capture and cache
          await captureAndCacheTab(targetTabId);
          
          // Restore original tab
          if (currentTab && currentTab.id !== targetTabId) {
            await chrome.tabs.update(currentTab.id, { active: true });
          }
          
          // Get the newly cached screenshot
          const newCached = tabScreenshotCache.get(targetTabId);
          if (newCached) {
            sendResponse({
              success: true,
              screenshot: newCached.screenshot,
              fromCache: false
            });
          } else {
            throw new Error('Failed to cache screenshot');
          }
        } catch (error) {
          console.error('[Background] Error capturing tab screenshot:', error);
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true; // Will send response asynchronously
      
    case 'SAVE_PAGE_TO_MEMORY':
      // Save current page to memory backend
      (async () => {
        if (sender.tab?.id) {
          try {
            // Get current tab info
            const tab = await chrome.tabs.get(sender.tab.id);
            
            // Take a screenshot
            const screenshot = await chrome.tabs.captureVisibleTab();
            
            // Log the screenshot format for debugging
            console.log('[Background] Screenshot data URL prefix:', screenshot.substring(0, 50));
            
            // Remove the data URL prefix (keep only base64 part)
            // Handle different possible formats: data:image/png;base64, or data:image/jpeg;base64,
            const base64Image = screenshot.replace(/^data:image\/[a-z]+;base64,/i, '');
            
            // Validate base64 data
            if (!base64Image || base64Image === screenshot) {
              console.error('[Background] Failed to extract base64 from screenshot');
              console.error('[Background] Original format:', screenshot.substring(0, 100));
              throw new Error('Invalid screenshot format');
            }
            
            console.log('[Background] Base64 image length:', base64Image.length);
            console.log('[Background] First 100 chars of base64:', base64Image.substring(0, 100));
            
            // Send to backend API
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
            
            // Check if it worked
            if (response.ok) {
              const result = await response.json();
              console.log('[Background] Page saved successfully:', result);
              sendResponse({
                success: true,
                url: tab.url,
                title: tab.title,
                memory_id: result.memory_id,
                summary: result.summary
              });
            } else {
              const errorText = await response.text();
              console.error('[Background] Failed to save page:', errorText);
              sendResponse({
                success: false,
                error: errorText
              });
            }
          } catch (error) {
            console.error('[Background] Error saving page:', error);
            sendResponse({
              success: false,
              error: error.message
            });
          }
        } else {
          sendResponse({
            success: false,
            error: 'No tab ID found'
          });
        }
      })();
      return true; // Will send response asynchronously
      
    default:
      console.log('[Background] Unknown message type:', request.type);
      sendResponse({ status: 'ERROR', message: 'Unknown message type' });
  }
});

// Clean up tab states when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('[Background] Tab closed:', tabId);
  tabStates.delete(tabId);
  tabScreenshotCache.delete(tabId);
  conversationHistory.delete(tabId);
});

// Handle chat messages
async function handleChatMessage(
  request: IMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) {
  const tabId = sender.tab?.id || request.tabId;
  const chatMessage = request.payload as IChatMessage;
  
  console.log('[Background] Handling chat message:', chatMessage);
  
  try {
    // Get or create conversation history for this tab
    if (!conversationHistory.has(tabId!)) {
      conversationHistory.set(tabId!, []);
    }
    const history = conversationHistory.get(tabId!)!;
    
    // Add user message to history
    history.push({ role: 'user', content: chatMessage.content });
    
    // Check if this is a script generation request
    const isScriptRequest = chatMessage.content.toLowerCase().includes('script') ||
                          chatMessage.content.toLowerCase().includes('change') ||
                          chatMessage.content.toLowerCase().includes('fill') ||
                          chatMessage.content.toLowerCase().includes('click') ||
                          chatMessage.content.toLowerCase().includes('automate') ||
                          chatMessage.content.toLowerCase().includes('background') ||
                          chatMessage.content.toLowerCase().includes('color') ||
                          chatMessage.content.toLowerCase().includes('hide') ||
                          chatMessage.content.toLowerCase().includes('show') ||
                          chatMessage.content.toLowerCase().includes('remove') ||
                          chatMessage.content.toLowerCase().includes('make') ||
                          chatMessage.content.toLowerCase().includes('set') ||
                          chatMessage.content.toLowerCase().includes('turn') ||
                          chatMessage.content.toLowerCase().includes('play') ||
                          chatMessage.content.toLowerCase().includes('type') ||
                          chatMessage.content.toLowerCase().includes('search') ||
                          chatMessage.content.toLowerCase().includes('find') ||
                          chatMessage.content.toLowerCase().includes('scroll') ||
                          chatMessage.content.toLowerCase().includes('navigate');
    
    let response: string;
    
    if (isScriptRequest && chatMessage.context) {
      // Generate script using Claude
      const generatedCode = await claudeService.generateScript(
        chatMessage.content,
        chatMessage.context
      );
      
      // Log what we got from Claude
      console.log('[Background] Generated code from Claude:', generatedCode);
      
      // Check if Claude returned actual code or explanatory text
      // If it contains common code patterns, it's likely code
      const looksLikeCode = generatedCode.includes('document.') || 
                           generatedCode.includes('querySelector') ||
                           generatedCode.includes('function') ||
                           generatedCode.includes('const ') ||
                           generatedCode.includes('let ') ||
                           generatedCode.includes('var ') ||
                           generatedCode.includes('if (') ||
                           generatedCode.includes('console.log');
      
      if (looksLikeCode) {
        // Format response with code wrapped in markdown
        response = `Here's the script:\n\n\`\`\`javascript\n${generatedCode}\n\`\`\``;
        
        // Store the generated code for execution
        tabStates.set(tabId!, { 
          ...tabStates.get(tabId!) || { sidebarOpen: true },
          lastGeneratedCode: generatedCode 
        });
      } else {
        // Claude returned explanatory text instead of code
        // Try to extract code from the response if it contains code blocks
        const codeMatch = generatedCode.match(/```(?:javascript|js)?\n?([\s\S]*?)```/);
        if (codeMatch && codeMatch[1]) {
          const extractedCode = codeMatch[1].trim();
          response = `Here's the script:\n\n\`\`\`javascript\n${extractedCode}\n\`\`\``;
          
          // Store the extracted code
          tabStates.set(tabId!, { 
            ...tabStates.get(tabId!) || { sidebarOpen: true },
            lastGeneratedCode: extractedCode 
          });
        } else {
          // No code found, just return the response as is
          response = generatedCode;
        }
      }
      
    } else {
      // Regular chat response
      response = await claudeService.chat(chatMessage.content, history);
    }
    
    // Add assistant response to history
    history.push({ role: 'assistant', content: response });
    
    // Keep history size manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    sendResponse({
      type: MessageType.CHAT_RESPONSE,
      payload: { content: response }
    });
    
  } catch (error) {
    console.error('[Background] Error handling chat message:', error);
    sendResponse({
      type: MessageType.ERROR,
      error: error.message || 'Failed to process message'
    });
  }
}

// Log when service worker is activated
self.addEventListener('activate', (event) => {
  console.log('[Background] Service worker activated');
});

console.log('[Background] Service worker initialized'); 