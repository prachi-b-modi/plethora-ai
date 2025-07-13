# Dynamic Script Runner - Chrome Extension

A powerful Chrome extension that lets you run dynamic JavaScript on any website through natural language commands, powered by Claude AI.

## Features

- 🤖 **AI-Powered Script Generation** - Describe what you want in plain English, and Claude will generate the JavaScript
- 💬 **Chat Interface** - Beautiful sidebar with conversation history
- ⚡ **Instant Execution** - Run generated scripts with one click
- 🎯 **Smart Context** - AI understands the current page context
- 📦 **Script Library** - Save and reuse your favorite scripts (coming soon)

## Installation

### Prerequisites

- Node.js 18+ and npm
- Chrome browser
- Claude API key from [Anthropic Console](https://console.anthropic.com/)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dynamic-script-runner.git
   cd dynamic-script-runner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Claude API**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your Claude API key
   # CLAUDE_API_KEY=your_actual_api_key_here
   ```

4. **Build the extension**
   ```bash
   npm run build:dev
   ```

5. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Usage

1. **Open the sidebar** - Click the extension icon on any webpage
2. **Chat with AI** - Type what you want to do, for example:
   - "Change the background color to light blue"
   - "Make all text larger"
   - "Hide all images"
   - "Fill out the search box with 'hello world'"
3. **Review the code** - Claude will show you the generated JavaScript
4. **Run the script** - Click the green "▶️ Run Script" button

## Examples

### Change Page Appearance
```
User: Make the page dark mode
AI: *generates script to invert colors and adjust brightness*
```

### Form Automation
```
User: Fill all empty input fields with test data
AI: *generates script to find and fill form fields*
```

### Content Manipulation
```
User: Remove all ads and popups
AI: *generates script to hide common ad elements*
```

## Development

### Project Structure
```
extension/
├── background/          # Background service worker
│   └── services/       # Claude API integration
├── content/            # Content scripts
├── sidebar/            # Chat interface
│   └── public/        # Static HTML/JS/CSS
└── shared/            # Shared types and utilities
```

### Available Scripts

- `npm run dev` - Build in development mode with watch
- `npm run build` - Build for production
- `npm run clean` - Clean build directory

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required
CLAUDE_API_KEY=your_claude_api_key_here

# Optional (defaults shown)
CLAUDE_MODEL=claude-3-sonnet-20240229
```

## Security

- Scripts run in the context of the current page
- No external API calls unless explicitly requested
- All scripts are shown before execution
- Extension requires user approval for each script

## Troubleshooting

### API Key Issues
- Make sure your `.env` file exists and contains a valid API key
- Rebuild the extension after adding the API key
- Check the console for error messages

### Script Execution Issues
- Some websites have strict Content Security Policies that may block scripts
- Try on a different website if scripts don't run
- Check the browser console for error messages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details
