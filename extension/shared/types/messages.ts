// Message types for extension communication

export enum MessageType {
  // Chat messages
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  CHAT_RESPONSE = 'CHAT_RESPONSE',
  
  // Script execution
  EXECUTE_SCRIPT = 'EXECUTE_SCRIPT',
  SCRIPT_RESULT = 'SCRIPT_RESULT',
  
  // Tab management
  GET_TAB_CONTENT = 'GET_TAB_CONTENT',
  TAB_CONTENT_RESPONSE = 'TAB_CONTENT_RESPONSE',
  
  // UI control
  TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR',
  CLOSE_SIDEBAR = 'CLOSE_SIDEBAR',
  
  // Status
  CONTENT_SCRIPT_READY = 'CONTENT_SCRIPT_READY',
  ERROR = 'ERROR',
}

export interface IMessage {
  type: MessageType;
  payload?: any;
  error?: string;
  tabId?: number;
}

export interface IChatMessage {
  content: string;
  context?: {
    url: string;
    title: string;
    selectedText?: string;
  };
}

export interface IScriptExecution {
  code: string;
  description: string;
}

export interface ITabContent {
  tabId: number;
  title: string;
  url: string;
  content: string;
} 