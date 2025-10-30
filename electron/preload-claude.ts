// Electron Preload - Claude API Bridge
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('claudeAPI', {
  // ============================================
  // API Key Management
  // ============================================
  
  getApiKey: (): Promise<string | undefined> => 
    ipcRenderer.invoke('claude:getApiKey'),
  
  saveApiKey: (apiKey: string): Promise<{ success: boolean }> => 
    ipcRenderer.invoke('claude:saveApiKey', apiKey),
  
  validateApiKey: (apiKey: string): Promise<{ valid: boolean }> => 
    ipcRenderer.invoke('claude:validateApiKey', apiKey),
  
  clearApiKey: (): Promise<{ success: boolean }> => 
    ipcRenderer.invoke('claude:clearApiKey'),
  
  hasApiKey: (): Promise<boolean> => 
    ipcRenderer.invoke('claude:hasApiKey'),

  // ============================================
  // Claude Conversation
  // ============================================
  
  sendMessage: (message: string, context?: any): Promise<{
    success: boolean;
    response?: string;
    error?: string;
  }> => 
    ipcRenderer.invoke('claude:sendMessage', message, context),
  
  listTools: (): Promise<Array<{
    name: string;
    description: string;
    input_schema: any;
  }>> => 
    ipcRenderer.invoke('claude:listTools'),
  
  executeTool: (toolName: string, params: any): Promise<{
    success: boolean;
    response?: string;
    error?: string;
  }> => 
    ipcRenderer.invoke('claude:executeTool', toolName, params),
  
  clearHistory: (): Promise<{ success: boolean }> => 
    ipcRenderer.invoke('claude:clearHistory'),

  // ============================================
  // Streaming & Events
  // ============================================
  
  onStreamingResponse: (callback: (chunk: string) => void) => {
    const listener = (_event: any, chunk: string) => callback(chunk);
    ipcRenderer.on('claude:streamingChunk', listener);
    
    // Cleanup function
    return () => {
      ipcRenderer.removeListener('claude:streamingChunk', listener);
    };
  },
  
  onToolUsed: (callback: (tool: { name: string; id: string }) => void) => {
    const listener = (_event: any, tool: { name: string; id: string }) => callback(tool);
    ipcRenderer.on('claude:toolUsed', listener);
    
    // Cleanup function
    return () => {
      ipcRenderer.removeListener('claude:toolUsed', listener);
    };
  }
});
