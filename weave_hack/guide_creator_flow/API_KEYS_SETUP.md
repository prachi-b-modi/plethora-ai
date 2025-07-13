# API Keys Setup Guide

## Required API Keys

To use the Web Search Assistant, you need two API keys:

### 1. OpenAI API Key
- **Purpose**: Powers the LLM for analysis and summarization
- **Get it from**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Setup**: Create an account, generate an API key

### 2. Exa API Key  
- **Purpose**: Enables semantic web search functionality
- **Get it from**: [Exa Dashboard](https://dashboard.exa.ai/)
- **Free tier**: 1000 searches included with signup

## Setting Environment Variables

### macOS/Linux:
```bash
export OPENAI_API_KEY="your-openai-api-key-here"
export EXA_API_KEY="your-exa-api-key-here"
```

### Windows:
```cmd
set OPENAI_API_KEY=your-openai-api-key-here
set EXA_API_KEY=your-exa-api-key-here
```

### Using .env file (recommended):
Create a `.env` file in the project root:
```
OPENAI_API_KEY=your-openai-api-key-here
EXA_API_KEY=your-exa-api-key-here
```

## Verification

Test your setup by running:
```bash
python -c "
import os
print('OpenAI Key:', '✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Missing')
print('Exa Key:', '✅ Set' if os.getenv('EXA_API_KEY') else '❌ Missing')
"
``` 