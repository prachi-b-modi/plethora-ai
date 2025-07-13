# MCP Server Setup for Cursor

This guide explains how to set up the Stagehand MCP server to work with Cursor using **local Chrome** instead of Browserbase.

## Prerequisites

1. **Node.js 18+** installed
2. **Chrome browser** installed on your system
3. **Anthropic API key** from [Anthropic Console](https://console.anthropic.com/)

## Setup Steps

### 1. Install Dependencies

```bash
cd automate
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=your_actual_api_key_here
```

### 3. Configure Cursor

Add this configuration to your Cursor settings (typically in `~/.cursor/mcp_servers.json`):

```json
{
  "mcpServers": {
    "stagehand": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/Users/barathwajanandan/Documents/Glu-tools/automate",
      "env": {
        "ANTHROPIC_API_KEY": "your_anthropic_api_key"
      }
    }
  }
}
```

**Important**: Replace `your_anthropic_api_key` with your actual API key, and update the `cwd` path to match your project location.

### 4. Test the Setup

You can test the MCP server directly:

```bash
npm run mcp
```

This should start the MCP server and wait for connections.

## Available Tools

Once configured, you'll have access to these tools in Cursor:

- **`init_browser`** - Initialize the browser session (local Chrome)
- **`navigate`** - Navigate to a URL
- **`act`** - Take actions using natural language (e.g., "click the login button")
- **`extract`** - Extract structured data from pages
- **`observe`** - Observe page elements for planning
- **`screenshot`** - Take screenshots
- **`close_browser`** - Close the browser session

## Usage Examples

```typescript
// Initialize browser
await init_browser()

// Navigate to a page
await navigate("https://example.com")

// Take an action
await act("click the search button")

// Extract data
await extract("get all product names", {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: { type: "string" }
    }
  }
})

// Take a screenshot
await screenshot()

// Close when done
await close_browser()
```

## Key Differences from Browserbase

- ✅ **Uses local Chrome** - No need for Browserbase account
- ✅ **Faster startup** - No remote connection overhead
- ✅ **Better debugging** - Can see browser window
- ✅ **No usage limits** - Run as much as you want locally
- ⚠️ **Requires Chrome** - Must have Chrome installed locally

## Troubleshooting

### Browser Won't Start
- Make sure Chrome is installed and accessible
- Check if Chrome is already running with `--remote-debugging-port`
- Try closing all Chrome instances and restart

### MCP Server Won't Connect
- Verify the `cwd` path in your Cursor configuration
- Check that all dependencies are installed (`npm install`)
- Ensure your API key is valid and set correctly

### Permission Issues
- Make sure the `mcp-server.ts` file has execute permissions
- Check that Node.js can access Chrome executable

## Configuration Options

You can modify `stagehand.config.ts` to customize:

- Browser viewport size
- Timeout settings
- Model configuration
- Debug verbosity

The key setting is `env: "LOCAL"` which ensures local Chrome usage instead of Browserbase. 