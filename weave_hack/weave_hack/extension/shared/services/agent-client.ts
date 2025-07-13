// Agent Server Client for Chrome Extension
// Handles communication with the local Stagehand agent server

export interface AgentTask {
  id: string;
  task: string;
  options?: {
    maxSteps?: number;
    screenshot?: boolean;
  };
}

export interface AgentTaskStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    currentStep: number;
    totalSteps: number;
    lastAction?: string;
  };
  result?: any;
  error?: string;
}

export interface AgentEvent {
  type: 'task-created' | 'task-started' | 'task-update' | 'task-completed' | 'task-failed' | 'screenshot' | 'data-extracted' | 'error' | 'init';
  task?: AgentTaskStatus;
  taskId?: string;
  data?: any;
  error?: string;
  tasks?: AgentTaskStatus[];
}

class AgentClient {
  private baseUrl = 'http://localhost:3456';
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(event: AgentEvent) => void>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  // WebSocket connection management
  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(`ws://localhost:3456`);

      this.ws.onopen = () => {
        console.log('Connected to agent server');
        this.isConnecting = false;
        this.emit('connected', {} as AgentEvent);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AgentEvent;
          this.handleEvent(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('Disconnected from agent server');
        this.isConnecting = false;
        this.emit('disconnected', {} as AgentEvent);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to connect to agent server:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect to agent server...');
      this.connect();
    }, 5000);
  }

  private handleEvent(event: AgentEvent) {
    // Emit to specific event type listeners
    this.emit(event.type, event);
    
    // Emit to general listeners
    this.emit('event', event);
  }

  private emit(eventType: string, event: AgentEvent) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  // Public API
  
  on(eventType: string, listener: (event: AgentEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async createTask(task: string, options?: AgentTask['options']): Promise<{ taskId: string }> {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, options }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }

    return response.json();
  }

  async getTask(taskId: string): Promise<AgentTaskStatus> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get task: ${response.statusText}`);
    }

    return response.json();
  }

  async listTasks(): Promise<AgentTaskStatus[]> {
    const response = await fetch(`${this.baseUrl}/tasks`);
    
    if (!response.ok) {
      throw new Error(`Failed to list tasks: ${response.statusText}`);
    }

    return response.json();
  }

  async cancelTask(taskId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel task: ${response.statusText}`);
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const agentClient = new AgentClient(); 