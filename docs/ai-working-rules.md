# AI Working Rules for Chrome Extension Development

## Core Philosophy

I am your pair-programmer, not just a code generator. We work together to build this Chrome extension systematically, with clear communication and gradual progress.

## Working Principles

### 1. Structured Approach
- **Plan Before Code**: Always create a clear plan before implementation
- **Incremental Progress**: Build features step-by-step with validation at each stage
- **Test Early and Often**: Verify each component works before moving to the next

### 2. Code Organization
- **Clear Separation of Concerns**:
  - `extension/` - Chrome extension specific code
  - `extension/sidebar/` - Next.js sidebar application
  - `extension/content/` - Content scripts for DOM manipulation
  - `extension/background/` - Background service worker
  - `extension/shared/` - Shared utilities and types

- **Naming Conventions**:
  - Components: PascalCase (e.g., `ChatInterface.tsx`)
  - Utilities: camelCase (e.g., `messageHandler.ts`)
  - Types: PascalCase with 'I' prefix for interfaces (e.g., `IMessage`)
  - Constants: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)

### 3. Development Patterns

#### Extension Architecture Pattern
```
- Background Service Worker: Handles tab management, API calls, storage
- Content Script: DOM manipulation, script execution
- Sidebar App: User interface, chat management
- Message Passing: Chrome runtime messages for communication
```

#### Component Pattern
```
- Container Components: Handle logic and state
- Presentational Components: Pure UI rendering
- Hooks: Reusable logic extraction
- Services: API calls and external integrations
```

### 4. Task Granularity

- **Start Broad**: Initial setup and architecture decisions
- **Get Specific**: Individual features and components as complexity grows
- **Stay Focused**: One subtask at a time, with clear completion criteria

### 5. Communication Protocol

- **Debug Statements**: Liberal use of console.log with prefixes:
  ```javascript
  console.log('[Sidebar]', 'Message received:', data);
  console.log('[Content]', 'Script executing:', script);
  console.log('[Background]', 'Tab updated:', tabId);
  ```

- **Error Handling**: Always wrap risky operations in try-catch:
  ```javascript
  try {
    // operation
  } catch (error) {
    console.error('[Component] Error:', error);
    // user-friendly error handling
  }
  ```

### 6. Progress Tracking

- **Task Lists**: Maintain detailed task lists with checkboxes
- **Commits**: Descriptive commits after each major subtask
- **Documentation**: Update docs as features are implemented

### 7. Build Process Rules

- **Asset Handling**: Ensure all CSS, images, and static files are properly bundled
- **Manifest Validation**: Check manifest.json matches actual file structure
- **Development Mode**: Include source maps and debug helpers
- **Production Mode**: Optimize and minify for performance

### 8. Testing Strategy

- **Manual Testing**: Load unpacked extension after each build
- **Console Monitoring**: Check for errors in extension and web console
- **Cross-Site Testing**: Verify functionality on different websites
- **Edge Cases**: Test with various DOM structures and page states

## Specific Guidelines for This Project

### Phase 1: Extension Setup
1. Create basic manifest.json
2. Set up content script injection
3. Implement sidebar toggle mechanism
4. Verify extension loads without errors

### Phase 2: Sidebar UI
1. Set up Next.js in sidebar directory
2. Create collapsible sidebar component
3. Implement smooth animations
4. Ensure proper CSS isolation

### Phase 3: Chat Interface
1. Build chat UI components
2. Add message input and display
3. Integrate Claude API (with placeholder)
4. Implement conversation state management

### Phase 4: Advanced Features
1. Tab context with @ mentions
2. Script preview and execution
3. Script library/toolbox
4. Error handling and user feedback

## Debug Checklist

When things go wrong:
1. Check Chrome extension console (chrome://extensions)
2. Check webpage console for content script errors
3. Verify message passing between components
4. Ensure all files are included in manifest.json
5. Check for CORS or CSP issues

## Remember

- Small, tested changes are better than large, untested ones
- User feedback at each step helps course-correct early
- Documentation prevents future confusion
- Clean code is easier to debug than clever code 