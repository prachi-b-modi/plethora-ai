# Web Search Assistant

A CrewAI Flow application that performs intelligent web searches using Exa AI's semantic search engine and provides comprehensive summaries of findings. **Now available as both a CLI tool and REST API server!**

## Features

- **Semantic Web Search**: Uses Exa AI's neural search to find relevant content based on meaning, not just keywords
- **Intelligent Research Crew**: Two-agent system with specialized roles:
  - **Search Researcher**: Finds and analyzes web content using Exa search tools
  - **Summarizer**: Creates clear, comprehensive summaries from research findings
- **Recent Content Focus**: Searches prioritize content from the past week
- **Structured Output**: Provides organized summaries with key insights and source citations
- **🆕 REST API Server**: FastAPI-based server for easy integration
- **🆕 Interactive Documentation**: Automatic API docs with Swagger UI

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   pip install -e .
   ```

3. Set up your API keys as environment variables:
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export EXA_API_KEY="your-exa-api-key"
   ```

## Getting API Keys

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or log in
3. Generate a new API key

### Exa API Key
1. Visit [Exa Dashboard](https://dashboard.exa.ai/)
2. Sign up for an account (1000 free searches included)
3. Copy your API key from the dashboard

## Usage

### 🆕 API Server (Recommended)

Start the FastAPI server:
```bash
server
# or
python -m guide_creator_flow.server
```

The server will be available at:
- **API Endpoint**: `http://localhost:8000`
- **Interactive Docs**: `http://localhost:8000/docs`
- **Alternative Docs**: `http://localhost:8000/redoc`

#### API Endpoints

**POST /search** - Main search endpoint
```bash
curl -X POST 'http://localhost:8000/search' \
  -H 'Content-Type: application/json' \
  -d '{"query": "latest AI developments", "include_sources": true}'
```

**GET /search/{query}** - Simple search endpoint
```bash
curl 'http://localhost:8000/search/latest%20AI%20developments'
```

**GET /health** - Health check
```bash
curl 'http://localhost:8000/health'
```

**GET /info** - API information
```bash
curl 'http://localhost:8000/info'
```

#### Example Response
```json
{
  "query": "latest AI developments",
  "summary": "Comprehensive summary with key findings and insights...",
  "timestamp": "2024-01-15T10:30:00Z",
  "processing_time": 15.3,
  "sources_included": true,
  "status": "completed"
}
```

#### Using the API in Python
```python
import requests

response = requests.post(
    'http://localhost:8000/search',
    json={"query": "sustainable energy trends 2024"}
)

result = response.json()
print(result['summary'])
```

#### Test the API
Run the example client:
```bash
python examples/client_example.py
```

### Command Line Interface

**Interactive Mode:**
```bash
search
# or
run_search
```

**Programmatic Usage:**
```python
from guide_creator_flow.main import WebSearchFlow

# Create and run search flow
flow = WebSearchFlow()
flow.kickoff()
```

**View Flow Diagram:**
```bash
plot
```

## How It Works

1. **Input**: You provide a search query (e.g., "latest developments in AI")
2. **Search**: The research agent uses Exa's semantic search to find relevant, recent content
3. **Analysis**: The agent analyzes search results for quality, relevance, and key insights
4. **Summary**: The summarizer creates a comprehensive yet concise summary
5. **Output**: You receive a structured summary with key findings and source links

## Example Usage

### CLI Example
```
🔍 Web Search Assistant Ready!
==================================================
Enter your search query: sustainable energy trends 2024

🔎 Searching for: 'sustainable energy trends 2024'
⏳ Performing web search and analysis...

📡 Initiating web search crew...
✅ Search and analysis completed!

💾 Saving results...
📄 Results saved to: search_results_sustainable_energy_trends_20.txt

🎯 SEARCH SUMMARY:
==================================================
[Comprehensive summary with key findings, trends, and sources]
==================================================
✨ Search completed successfully!
```

### API Example
```bash
# Start the server
server

# Make a search request
curl -X POST 'http://localhost:8000/search' \
  -H 'Content-Type: application/json' \
  -d '{"query": "quantum computing breakthroughs 2024"}'
```

## Configuration

The application uses YAML configuration files:

- `src/guide_creator_flow/crews/poem_crew/config/agents.yaml`: Agent definitions
- `src/guide_creator_flow/crews/poem_crew/config/tasks.yaml`: Task configurations

## Dependencies

- **CrewAI**: Multi-agent AI framework for orchestrating the research workflow
- **Exa AI**: Semantic search engine for finding relevant web content
- **OpenAI**: LLM for intelligent analysis and summarization
- **FastAPI**: Modern web framework for the API server
- **Uvicorn**: ASGI server for running the FastAPI application

## Output

Results include:
- Executive summary answering your query
- Key findings organized into sections
- Important insights and takeaways
- Source citations for credibility
- Relevant data points and statistics
- Processing time and metadata (API only)

## Customization

You can modify the search behavior by editing:
- Search parameters in `src/guide_creator_flow/tools/custom_tool.py`
- Agent personalities in the YAML config files
- Task descriptions for different types of research
- API response format in `src/guide_creator_flow/server.py`

## Deployment

### Local Development
```bash
# Install dependencies
pip install -e .

# Start development server with auto-reload
python -m guide_creator_flow.server
```

### Production Deployment
```bash
# Install production dependencies
pip install -e .

# Start production server
uvicorn guide_creator_flow.server:app --host 0.0.0.0 --port 8000
```

### Docker (Optional)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -e .
EXPOSE 8000
CMD ["uvicorn", "guide_creator_flow.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Troubleshooting

**Missing API Keys**: Ensure both `OPENAI_API_KEY` and `EXA_API_KEY` are set as environment variables.

**Search Errors**: Check your Exa API key and ensure you haven't exceeded your usage limits.

**No Results**: Try rephrasing your query or making it more specific.

**Server Not Starting**: Make sure port 8000 is available or specify a different port.

**API Errors**: Check the `/health` endpoint and server logs for detailed error information.

## API Documentation

When the server is running, visit:
- **Swagger UI**: `http://localhost:8000/docs` - Interactive API documentation
- **ReDoc**: `http://localhost:8000/redoc` - Alternative documentation format
- **Info Endpoint**: `http://localhost:8000/info` - API usage information
