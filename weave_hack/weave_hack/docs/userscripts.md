# Userscript System Documentation

## Overview

This Chrome extension includes a Greasemonkey/Tampermonkey-style userscript system that allows running custom scripts on specific websites without being blocked by Content Security Policy (CSP).

## How It Works

1. **Script Registration**: Userscripts are registered using Chrome's `chrome.scripting.registerContentScripts()` API
2. **Isolated World**: Scripts run in an isolated world, bypassing page CSP restrictions
3. **Persistent Storage**: Scripts are stored in `chrome.storage.local` and persisted across sessions

## Architecture

### Components

1. **Parser** (`extension/shared/userscripts/parser.ts`)
   - Parses userscript headers (`// ==UserScript==`)
   - Extracts metadata: `@name`, `@match`, `@run-at`, etc.
   - Converts Greasemonkey patterns to Chrome match patterns

2. **Storage Manager** (`extension/shared/userscripts/manager.ts`)
   - CRUD operations for userscripts
   - Stores scripts in `chrome.storage.local`
   - Notifies background script of changes

3. **Background Service Worker** (`extension/background/service-worker.ts`)
   - Registers/unregisters scripts on startup
   - Listens for `userscripts:changed` messages
   - Uses `chrome.scripting` API for registration

4. **Build Script** (`scripts/build-userscripts.js`)
   - Reads from `userscripts-dev.json` (development)
   - Generates individual `.js` files in `extension/userscripts/`
   - Creates `index.json` manifest

## Usage

### Development Workflow

1. **Add a userscript to `userscripts-dev.json`**:
```json
{
  "scripts": {
    "us_unique_id": {
      "id": "us_unique_id",
      "metadata": {
        "name": "Script Name",
        "matches": ["https://example.com/*"],
        "runAt": "document_end"
      },
      "source": "// ==UserScript==\n// @name Script Name\n// ...",
      "enabled": true
    }
  }
}
```

2. **Build the extension**:
```bash
npm run build
```

3. **Load in Chrome**:
   - Navigate to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `dist` directory

### Userscript Header Format

```javascript
// ==UserScript==
// @name         My Script
// @description  Script description
// @version      1.0
// @author       Your Name
// @match        https://example.com/*
// @match        https://another.com/*
// @exclude      https://example.com/admin/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

// Your script code here
console.log('Script is running!');
```

### Supported Metadata

- `@name` - Script name (required)
- `@description` - Script description
- `@version` - Version number
- `@author` - Author name
- `@match` / `@include` - URL patterns where script runs (required, multiple allowed)
- `@exclude` / `@exclude-match` - URL patterns to exclude
- `@run-at` - When to inject: `document-start`, `document-end`, `document-idle`
- `@grant` - Permissions (currently for documentation only)

## Examples

### Hello World
```javascript
// ==UserScript==
// @name         Hello World
// @match        https://example.com/*
// @run-at       document-end
// ==/UserScript==

console.log('Hello from userscript!');
document.body.style.backgroundColor = 'lightblue';
```

### GitHub Enhancer
```javascript
// ==UserScript==
// @name         GitHub Enhancer
// @match        https://github.com/*
// @run-at       document-end
// ==/UserScript==

// Add copy buttons to code blocks
document.querySelectorAll('pre').forEach(pre => {
  const btn = document.createElement('button');
  btn.textContent = 'Copy';
  btn.onclick = () => navigator.clipboard.writeText(pre.textContent);
  pre.appendChild(btn);
});
```

## API Integration (Future)

The system is designed to support dynamic script management:

```typescript
// Add a new userscript
await addUserscript(scriptSource);

// Update existing script
await updateUserscript(id, { source: newSource });

// Toggle enabled state
await toggleUserscript(id);

// Delete script
await deleteUserscript(id);
```

## Security Considerations

1. **Isolated World**: Scripts run in Chrome's isolated world, separate from page scripts
2. **No eval()**: Scripts are loaded as files, not evaluated as strings
3. **Match Patterns**: Chrome validates match patterns for security
4. **Storage Limits**: Chrome storage has size limits (~5MB)

## Limitations

1. **No GM_* APIs**: Unlike Greasemonkey, we don't support GM_xmlhttpRequest, etc.
2. **Chrome APIs**: Limited access to Chrome extension APIs from content scripts
3. **Cross-origin**: Subject to same-origin policy for fetch/XHR

## Troubleshooting

1. **Script not running**: Check console for errors, verify match patterns
2. **Registration errors**: Check background script console
3. **Build issues**: Ensure `userscripts-dev.json` is valid JSON

## Future Enhancements

1. **UI for script management**: Add/edit/delete scripts from extension popup
2. **Script library**: Import scripts from URL or repository
3. **GM API compatibility**: Implement common Greasemonkey APIs
4. **Script updates**: Auto-update scripts from remote sources
5. **Script sync**: Sync scripts across devices 