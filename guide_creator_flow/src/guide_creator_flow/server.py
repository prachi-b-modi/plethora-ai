#!/usr/bin/env python
"""
FastAPI server for the Universal Command Center
Provides REST API endpoints for chat, web search, memory, and more
"""

import os
import time
from typing import Optional, Dict, Any, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn
import weave

from guide_creator_flow.commands.router import CommandRouter

# Initialize FastAPI app
app = FastAPI(
    title="Universal Command Center API",
    description="AI-powered command center with chat, web search, memory, and more using CrewAI",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors and provide helpful debugging info"""
    body = await request.body()
    print(f"❌ Validation Error for {request.method} {request.url}")
    print(f"❌ Raw body: {body.decode('utf-8')}")
    print(f"❌ Content-Type: {request.headers.get('content-type')}")
    print(f"❌ Validation errors: {exc.errors()}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": f"Validation error: {exc.errors()}",
            "received_body": body.decode('utf-8'),
            "content_type": request.headers.get('content-type')
        }
    )

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class SearchRequest(BaseModel):
    query: str = Field(..., description="The search query to research", min_length=1, max_length=10000)  # Increased from 500 to 10000
    include_sources: bool = Field(True, description="Whether to include source URLs in the response")

class SearchResponse(BaseModel):
    query: str = Field(..., description="The original search query")
    summary: str = Field(..., description="Comprehensive summary of findings")
    timestamp: str = Field(..., description="When the search was completed")
    processing_time: float = Field(..., description="Time taken to process the request in seconds")
    sources_included: bool = Field(..., description="Whether sources were included in the summary")
    status: str = Field(..., description="Status of the search operation")

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")
    query: Optional[str] = Field(None, description="The query that caused the error")
    timestamp: str = Field(..., description="When the error occurred")

class PageSaveRequest(BaseModel):
    url: str = Field(..., description="URL of the page to save")
    screenshot: str = Field(..., description="Base64 encoded screenshot of the page")
    title: Optional[str] = Field(None, description="Page title")
    content: Optional[str] = Field(None, description="Optional text content for fallback")

class PageSaveResponse(BaseModel):
    success: bool = Field(..., description="Whether the save was successful")
    memory_id: str = Field(..., description="ID of the saved memory")
    url: str = Field(..., description="URL that was saved")
    summary: str = Field(..., description="AI-generated summary of the page")
    timestamp: str = Field(..., description="When the page was saved")

class Memory(BaseModel):
    id: str = Field(..., description="Unique memory identifier")
    content: str = Field(..., description="Memory content")
    timestamp: str = Field(..., description="ISO timestamp when memory was created")
    created_at: str = Field(..., description="Human-readable creation date")
    type: Optional[str] = Field(None, description="Memory type (e.g., 'webpage', 'note')")
    url: Optional[str] = Field(None, description="Associated URL if applicable")
    title: Optional[str] = Field(None, description="Title if applicable")

class MemoriesResponse(BaseModel):
    memories: List[Memory] = Field(..., description="List of memories")
    total_count: int = Field(..., description="Total number of memories")
    displayed_count: int = Field(..., description="Number of memories returned")
    has_more: bool = Field(..., description="Whether there are more memories available")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Web Search Assistant API"
    }

# Today file endpoint
@app.get("/today_file")
async def get_today_file():
    """Get the content of today.txt file"""
    try:
        # Use the specific path provided
        file_path = "/Users/barathwajanandan/Documents/Glu-tools/guide_creator_flow/data/today.txt"
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
            
            return {
                "status": "success",
                "content": file_content,
                "file_path": file_path,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "not_found",
                "message": f"today.txt file not found at {file_path}",
                "searched_paths": [file_path],
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error reading today.txt file: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

# Initialize command router
router = CommandRouter()

# Main search endpoint
@app.post("/search", response_model=SearchResponse)
async def search_web(request: SearchRequest) -> SearchResponse:
    """
    Universal command endpoint - handles all slash commands and chat
    
    - **query**: The command and query (e.g., "/web AI news", "/memory save info", or just "Hello AI")
    - **include_sources**: Whether to include source URLs in web search responses
    
    Available commands:
    - `/web [query]` - Search the web
    - `/memory [subcommand]` - Manage local knowledge base
    - `/chat [message]` - Have a conversation with AI (also the default)
    - `/help [command]` - Get help
    
    Queries without a slash default to AI chat conversation.
    """
    start_time = time.time()
    
    # Log the incoming request for debugging
    print(f"🔍 Received request - Query: {request.query[:100]}...")
    print(f"🔍 Include sources: {request.include_sources}")
    
    try:
        # Validate environment variables for web search
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=500, 
                detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
            )
        
        # Only check for EXA_API_KEY if it's a web search command
        if request.query.strip().startswith('/web') and not os.getenv("EXA_API_KEY"):
            raise HTTPException(
                status_code=500, 
                detail="Exa API key not configured. Please set EXA_API_KEY environment variable for web search."
            )
        
        # Route the command
        result = await router.route(request.query)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        if result.success:
            # Return structured response
            return SearchResponse(
                query=request.query,
                summary=str(result.data),
                timestamp=datetime.now().isoformat(),
                processing_time=round(processing_time, 2),
                sources_included=request.include_sources,
                status="completed"
            )
        else:
            # Handle command errors
            raise HTTPException(
                status_code=400,
                detail={
                    "error": result.error,
                    "metadata": result.metadata,
                    "query": request.query,
                    "timestamp": datetime.now().isoformat(),
                    "processing_time": round(processing_time, 2)
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Command execution failed: {str(e)}"
        
        # Log error (in production, use proper logging)
        print(f"ERROR: {error_msg}")
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": error_msg,
                "query": request.query,
                "timestamp": datetime.now().isoformat(),
                "processing_time": round(processing_time, 2)
            }
        )

# Alternative GET endpoint for simple queries
@app.get("/search/{query:path}")
async def search_web_simple(query: str) -> SearchResponse:
    """
    Simple GET endpoint for commands and chat
    
    - **query**: The command/query as a URL parameter (e.g., "web/AI news", "Hello AI")
    
    Note: Use URL encoding for slashes in commands (e.g., %2Fweb for /web)
    """
    # Convert URL-encoded slash back
    query = query.replace("%2F", "/")
    request = SearchRequest(query=query, include_sources=True)
    return await search_web(request)

# Page save endpoint for browser extensions
@app.post("/save_page", response_model=PageSaveResponse)
async def save_page(request: PageSaveRequest) -> PageSaveResponse:
    """
    Save a web page with AI-generated summary from screenshot
    
    This endpoint is designed for browser extensions to save web pages using screenshots.
    
    - **url**: The URL of the page
    - **screenshot**: Base64 encoded screenshot of the page
    - **title**: Optional page title
    - **content**: Optional text content (fallback if image analysis fails)
    """
    try:
        # Validate environment variables
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=500, 
                detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
            )
        
        # Import memory handler to use the image analysis method directly
        from guide_creator_flow.commands.memory import MemoryHandler
        memory_handler = MemoryHandler()
        
        # Use the image-based save method
        result = await memory_handler._handle_save_page_image(
            url=request.url,
            screenshot_base64=request.screenshot,
            title=request.title
        )
        
        if result.success:
            # Extract summary from the result
            summary = result.data
            # Try to extract just the summary part
            if "Visual Summary:" in summary:
                summary_start = summary.find("Visual Summary:") + len("Visual Summary:")
                summary = summary[summary_start:].strip()
            
            return PageSaveResponse(
                success=True,
                memory_id=result.metadata.get("memory_id", ""),
                url=request.url,
                summary=summary[:500] + "..." if len(summary) > 500 else summary,
                timestamp=datetime.now().isoformat()
            )
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": result.error,
                    "metadata": result.metadata
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to save page: {str(e)}"
        print(f"ERROR: {error_msg}")
        
        # If screenshot analysis fails and we have text content, try text-based save
        if request.content:
            try:
                # Fallback to text-based save
                command = f"/memory save_page {request.url} {request.content}"
                result = await router.route(command)
                
                if result.success:
                    return PageSaveResponse(
                        success=True,
                        memory_id=result.metadata.get("memory_id", ""),
                        url=request.url,
                        summary="Saved with text content (screenshot analysis failed)",
                        timestamp=datetime.now().isoformat()
                    )
            except:
                pass
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": error_msg,
                "url": request.url,
                "timestamp": datetime.now().isoformat()
            }
        )

@app.post("/analyze_tabs")
async def analyze_tabs(request: Request):
    """Analyze multiple tab screenshots with a user query."""
    try:
        print(f"\n{'='*80}")
        print(f"SERVER DEBUG: Received analyze_tabs request")
        
        data = await request.json()
        
        # Extract images, query, and tab URLs
        images = data.get("images", [])
        query = data.get("query", "")
        tab_urls = data.get("tab_urls", [])  # Extract tab URLs if provided
        
        print(f"SERVER DEBUG: Images count: {len(images)}")
        print(f"SERVER DEBUG: Query: {query}")
        print(f"SERVER DEBUG: Tab URLs count: {len(tab_urls)}")
        print(f"SERVER DEBUG: Tab URLs: {tab_urls}")
        
        if not images:
            raise HTTPException(status_code=400, detail="No images provided")
        
        if not query:
            raise HTTPException(status_code=400, detail="No query provided")
        
        # Log request details
        print(f"SERVER DEBUG: Analyzing {len(images)} tab screenshots with query: {query}")
        
        # Create a specialized handler for multi-tab analysis
        from guide_creator_flow.commands.tab_analyzer import TabAnalyzerHandler
        analyzer = TabAnalyzerHandler()
        
        # Process the images, query, and tab URLs
        print(f"SERVER DEBUG: Calling analyzer.analyze_tabs...")
        result = await analyzer.analyze_tabs(images, query, tab_urls)
        
        print(f"SERVER DEBUG: Result success: {result.success}")
        print(f"SERVER DEBUG: Result data length: {len(result.data) if result.data else 0}")
        print(f"SERVER DEBUG: Result data preview: {result.data[:200] if result.data else 'None'}...")
        
        response_data = {
            "success": result.success,
            "data": result.data,
            "metadata": result.metadata,
            "error": result.error
        }
        
        print(f"SERVER DEBUG: Sending response with data length: {len(str(response_data))}")
        print(f"{'='*80}\n")
        
        return response_data
        
    except Exception as e:
        print(f"\nSERVER ERROR in analyze_tabs: {str(e)}")
        print(f"SERVER ERROR type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        print(f"{'='*80}\n")
        raise HTTPException(status_code=500, detail=str(e))

# Get API information
@app.get("/info")
async def get_api_info():
    """Get API information and usage instructions"""
    return {
        "service": "Universal Command Center API",
        "version": "2.0.0",
        "description": "AI-powered command center with chat, web search, memory, and more using CrewAI",
        "endpoints": {
            "POST /search": "Main endpoint for commands and chat",
            "GET /search/{query}": "Simple endpoint with query as URL parameter", 
            "GET /memories": "Get all memories in structured JSON format",
            "DELETE /memories/{id}": "Delete a specific memory by ID",
            "POST /save_page": "Save web page with AI summary (for browser extensions)",
            "POST /analyze_tabs": "Analyze multiple tab screenshots with AI vision (includes YouTube transcript extraction)",
            "GET /health": "Health check endpoint",
            "GET /info": "This endpoint",
            "GET /docs": "Interactive API documentation",
            "GET /redoc": "Alternative API documentation"
        },
        "required_env_vars": [
            "OPENAI_API_KEY",
            "EXA_API_KEY (for web search)"
        ],
        "example_usage": {
            "chat": "curl -X POST 'http://localhost:8000/search' -H 'Content-Type: application/json' -d '{\"query\": \"What is quantum computing?\"}'",
            "web_search": "curl -X POST 'http://localhost:8000/search' -H 'Content-Type: application/json' -d '{\"query\": \"/web latest AI developments\"}'", 
            "memory": "curl -X POST 'http://localhost:8000/search' -H 'Content-Type: application/json' -d '{\"query\": \"/memory save Important note\"}'",
            "memories_api": "curl 'http://localhost:8000/memories?limit=10&offset=0'",
            "simple_get": "curl 'http://localhost:8000/search/Hello%20AI'"
        }
    }

# Memories API endpoint
@app.get("/memories", response_model=MemoriesResponse)
async def get_memories(
    limit: Optional[int] = None, 
    offset: Optional[int] = 0,
    type: Optional[str] = None
) -> MemoriesResponse:
    """
    Get all memories in structured JSON format for client-side consumption
    
    - **limit**: Maximum number of memories to return (optional)
    - **offset**: Number of memories to skip for pagination (default: 0)
    - **type**: Filter by memory type ('webpage', 'note', etc.) (optional)
    """
    try:
        # Import memory handler
        from guide_creator_flow.commands.memory import MemoryHandler
        memory_handler = MemoryHandler()
        
        # Load all memories
        memories = memory_handler._load_memories()
        
        # Filter by type if specified
        if type:
            memories = [m for m in memories if m.get('type') == type]
        
        # Sort by timestamp (newest first)
        memories.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Calculate pagination
        total_count = len(memories)
        start_idx = offset or 0
        end_idx = start_idx + limit if limit else len(memories)
        paginated_memories = memories[start_idx:end_idx]
        
        # Convert to Memory objects
        memory_objects = []
        for mem in paginated_memories:
            memory_objects.append(Memory(
                id=mem['id'],
                content=mem['content'],
                timestamp=mem['timestamp'],
                created_at=mem['created_at'],
                type=mem.get('type'),
                url=mem.get('url'),
                title=mem.get('title')
            ))
        
        return MemoriesResponse(
            memories=memory_objects,
            total_count=total_count,
            displayed_count=len(memory_objects),
            has_more=end_idx < total_count
        )
        
    except Exception as e:
                 raise HTTPException(
             status_code=500,
             detail=f"Failed to retrieve memories: {str(e)}"
         )

# Delete memory endpoint
@app.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str):
    """
    Delete a specific memory by its ID
    
    - **memory_id**: The unique identifier of the memory to delete
    """
    try:
        # Import memory handler
        from guide_creator_flow.commands.memory import MemoryHandler
        memory_handler = MemoryHandler()
        
        # Try to delete the memory
        result = await memory_handler._handle_delete(memory_id)
        
        if result.success:
            return {
                "success": True,
                "message": f"Memory {memory_id} deleted successfully",
                "deleted_id": memory_id
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Memory with ID {memory_id} not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete memory: {str(e)}"
        )

def start_server(host: str = "0.0.0.0", port: int = 8000, reload: bool = False):
    """Start the FastAPI server"""
    print(f"🚀 Starting Universal Command Center API server...")
    print(f"📡 Server will be available at: http://{host}:{port}")
    print(f"📚 API Documentation: http://{host}:{port}/docs")
    print(f"💬 Example chat: http://{host}:{port}/search/Hello%20AI")
    print(f"🔍 Example web search: http://{host}:{port}/search/%2Fweb%20latest%20AI%20news")
    
    # Initialize Weave for tracing LLM calls
    try:
        weave.init("guide-creator-flow")
        print("✅ Weave tracing initialized")
    except Exception as e:
        print(f"⚠️  Weave initialization failed: {e}")
        print("   Continuing without tracing...")
    
    uvicorn.run(
        "guide_creator_flow.server:app", 
        host=host, 
        port=port, 
        reload=reload,
        log_level="info"
    )

if __name__ == "__main__":
    start_server(reload=True) 