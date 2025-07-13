import { config } from '../../shared/config';

interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ClaudeResponse {
  content: { text: string }[];
}

interface PythonAPIResponse {
  query: string;
  summary: string;
  timestamp: string;
  processing_time: number;
  sources_included: boolean;
  status: string;
  error?: string;
}

export class ClaudeService {
  private apiUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    // Use Python API instead of Anthropic
    this.apiUrl = config.pythonApi.url;
    this.apiKey = config.claude.apiKey;
    this.model = config.claude.model;
  }

  async generateScript(userMessage: string, context: any): Promise<string> {
    console.log('[Claude Service] Generating script for:', userMessage);
    console.log('[Claude Service] Context:', context);
    
    // Check if API key is configured (might not be needed for Python API)
    if (!this.apiKey || this.apiKey === 'YOUR_CLAUDE_API_KEY_HERE') {
      console.warn('[Claude Service] API key not configured, proceeding anyway');
    }

    // Build a comprehensive prompt that includes context
    const prompt = `You are a browser automation assistant. Generate JavaScript code to fulfill the user's request.

Context:
- Current URL: ${context.url || 'unknown'}
- Page Title: ${context.title || 'unknown'}
- Selected Text: ${context.selectedText || 'none'}

User Request: ${userMessage}

Generate ONLY executable JavaScript code without any explanations or markdown. The code should:
1. Be immediately executable in the browser console
2. Use standard DOM APIs (document.querySelector, etc.)
3. Include error handling
4. Be concise and efficient

Available DOM elements: ${JSON.stringify(context.domElements?.elements?.slice(0, 20) || [])}`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: prompt  // Changed from "message" to "query"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Claude Service] API error:', response.status, errorText);
        
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data: PythonAPIResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Extract code from the summary field
      const generatedCode = data.summary || '';
      
      // Try to extract JavaScript code if it's wrapped in the response
      const codeMatch = generatedCode.match(/```(?:javascript|js)?\n?([\s\S]*?)```/);
      if (codeMatch && codeMatch[1]) {
        return codeMatch[1].trim();
      }
      
      console.log('[Claude Service] Generated code:', generatedCode);
      return generatedCode;
      
    } catch (error) {
      console.error('[Claude Service] Error generating script:', error);
      throw error;
    }
  }

  async chat(message: string, conversationHistory: ClaudeMessage[] = []): Promise<string> {
    console.log('[Claude Service] Chat message:', message);
    
    try {
      // For chat messages, we can use the Python API's command system
      // If message starts with /, it's a command, otherwise it's a web search
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message  // Changed from "message" to "query"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Claude Service] Chat API error:', response.status, errorText);
        
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data: PythonAPIResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Return the summary field which contains the actual response
      return data.summary || 'Sorry, I couldn\'t generate a response.';
      
    } catch (error) {
      console.error('[Claude Service] Chat error:', error);
      return `Sorry, there was an error connecting to the command center: ${error.message}`;
    }
  }
} 