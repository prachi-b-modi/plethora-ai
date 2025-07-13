# Task List: Chrome Extension for Dynamic Script Execution

## Relevant Files

- `extension/manifest.json` - Chrome extension manifest file
- `extension/content/content-script.ts` - Main content script for DOM manipulation
- `extension/background/service-worker.ts` - Background service worker for tab management
- `extension/sidebar/src/app/page.tsx` - Main sidebar application entry
- `extension/sidebar/src/components/Sidebar.tsx` - Collapsible sidebar component
- `extension/shared/types/index.ts` - Shared TypeScript interfaces
- `extension/shared/utils/messageHandler.ts` - Chrome runtime message handling
- `webpack.config.js` - Build configuration for extension bundling

### Notes

- Build process should handle both extension files and Next.js sidebar app
- Use `npm run build` to compile the entire extension
- Load unpacked extension from `dist/` directory in Chrome

## Tasks

- [x] 1.0 Set up basic Chrome extension structure with manifest and content script injection
  - [x] 1.1 Create manifest.json with proper permissions and content script configuration
  - [x] 1.2 Set up basic content script that logs to console when injected
  - [x] 1.3 Create background service worker with basic message handling
  - [x] 1.4 Set up webpack configuration for building the extension
  - [x] 1.5 Create npm scripts for development and production builds
  - [x] 1.6 Test extension loads without errors in Chrome

- [x] 2.0 Implement collapsible sidebar mechanism with show/hide functionality
  - [x] 2.1 Create sidebar HTML structure to be injected into pages
  - [x] 2.2 Implement CSS for sidebar positioning and animations
  - [x] 2.3 Add toggle logic triggered by extension icon click
  - [x] 2.4 Ensure sidebar doesn't interfere with page layout
  - [x] 2.5 Add shadow DOM to isolate sidebar styles
  - [x] 2.6 Test sidebar on various websites

- [x] 3.0 Create Next.js sidebar application with basic chat UI
  - [x] 3.1 Initialize Next.js app in sidebar directory
  - [x] 3.2 Create basic chat interface component with message list and input
  - [x] 3.3 Implement chat message components with proper styling
  - [x] 3.4 Add TypeScript interfaces for messages and chat state
  - [x] 3.5 Configure Next.js for extension environment
  - [x] 3.6 Integrate sidebar app into extension build process

- [ ] 4.0 Integrate message passing between content script, background, and sidebar
  - [x] 4.1 Set up message types and interfaces in shared types
  - [x] 4.2 Implement message handler utility for consistent communication
  - [x] 4.3 Create message routing in background service worker
  - [x] 4.4 Connect sidebar app to extension messaging system
  - [x] 4.5 Add debug logging for all message passing
  - [ ] 4.6 Test bi-directional communication between all components

- [ ] 5.0 Add Claude API integration and basic chat functionality
  - [x] 5.1 Create API service module with Claude integration
  - [x] 5.2 Add configuration for API key with placeholder
  - [x] 5.3 Implement chat message sending to Claude API
  - [x] 5.4 Handle API responses and display in chat
  - [x] 5.5 Add error handling for API failures
  - [x] 5.6 Test end-to-end chat functionality

- [ ] 6.0 Integrate Stagehand agent workflow for browser automation
  - [ ] 6.1 Create local WebSocket/HTTP server wrapper for Stagehand agent
  - [ ] 6.2 Implement agent command protocol between extension and server
  - [ ] 6.3 Add UI controls in sidebar for agent task execution
  - [ ] 6.4 Create message types for agent status updates and results
  - [ ] 6.5 Implement agent task queue and execution management
  - [ ] 6.6 Add visual feedback for agent actions in current tab
  - [ ] 6.7 Handle agent authentication and session persistence
  - [ ] 6.8 Test multi-tab automation scenarios through extension UI 