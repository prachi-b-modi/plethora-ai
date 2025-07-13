// Configuration for the extension
export const config = {
  // Claude API settings
  claude: {
    // API key loaded from .env file
    apiKey: process.env.CLAUDE_API_KEY || '',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
  },
  
  // Python API settings for Universal Web Command Center
  pythonApi: {
    url: 'http://localhost:8000/search',  // Changed to /search endpoint
    // Add any other Python API specific settings here
  },
  
  // Extension settings
  extension: {
    debugMode: true,
  }
};

// Check if API key is configured
if (!config.claude.apiKey) {
  console.warn('[Config] Claude API key not found. Please create a .env file with CLAUDE_API_KEY=your_key_here');
} 