export interface Memory {
  id: string;
  title?: string;
  content?: string;
  timestamp?: string;
  [key: string]: any;
}

class MemoriesClient {
  private baseUrl = 'http://localhost:8000';

  async getMemories(): Promise<Memory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/memories`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch memories: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch memories:', error);
      throw error;
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/memories/${memoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete memory: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/memories`);
      return response.ok;
    } catch (error) {
      console.error('Memories service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const memoriesClient = new MemoriesClient(); 