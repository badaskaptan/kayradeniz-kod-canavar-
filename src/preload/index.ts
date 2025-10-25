import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ToolBridgeAPI } from '../shared/toolBridge'

// Custom APIs for renderer (Tool Bridge)
const api: ToolBridgeAPI = {
  // File System APIs
  fs: {
    readFile: (path: string, encoding = 'utf-8') =>
      ipcRenderer.invoke('fs:readFile', path, encoding),
    writeFile: (path: string, content: string, encoding = 'utf-8') =>
      ipcRenderer.invoke('fs:writeFile', path, content, encoding),
    deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
    createDirectory: (path: string) => ipcRenderer.invoke('fs:createDirectory', path),
    readDirectory: (path: string) => ipcRenderer.invoke('fs:readDirectory', path),
    getStats: (path: string) => ipcRenderer.invoke('fs:getStats', path),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path)
  },

  // Dialog APIs
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    openDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options)
  },

  // Terminal APIs
  terminal: {
    exec: (command: string, cwd?: string) => ipcRenderer.invoke('terminal:exec', command, cwd),
    getCwd: () => ipcRenderer.invoke('terminal:getCwd'),
    setCwd: (cwd: string) => ipcRenderer.invoke('terminal:setCwd', cwd),
    getEnv: () => ipcRenderer.invoke('terminal:getEnv'),
    setEnv: (key: string, value: string) => ipcRenderer.invoke('terminal:setEnv', key, value)
  },

  // Search APIs
  search: {
    grep: (options) => ipcRenderer.invoke('toolbridge:search:grep', options),
    glob: (options) => ipcRenderer.invoke('toolbridge:search:glob', options)
  },

  git: {
    status: (workspaceRoot) => ipcRenderer.invoke('toolbridge:git:status', workspaceRoot),
    diff: (options) => ipcRenderer.invoke('toolbridge:git:diff', options),
    log: (options) => ipcRenderer.invoke('toolbridge:git:log', options),
    add: (options) => ipcRenderer.invoke('toolbridge:git:add', options),
    commit: (options) => ipcRenderer.invoke('toolbridge:git:commit', options)
  }
}

// Claude API
const claudeAPI = {
  // API Key Management
  getApiKey: () => ipcRenderer.invoke('claude:getApiKey'),
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('claude:saveApiKey', apiKey),
  validateApiKey: (apiKey: string) => ipcRenderer.invoke('claude:validateApiKey', apiKey),
  clearApiKey: () => ipcRenderer.invoke('claude:clearApiKey'),
  hasApiKey: () => ipcRenderer.invoke('claude:hasApiKey'),

  // Workspace
  setWorkspacePath: (workspacePath: string) =>
    ipcRenderer.invoke('claude:setWorkspacePath', workspacePath),

  // Conversation
  sendMessage: (message: string, context?: unknown) =>
    ipcRenderer.invoke('claude:sendMessage', message, context),
  listTools: () => ipcRenderer.invoke('claude:listTools'),
  executeTool: (toolName: string, params: unknown) =>
    ipcRenderer.invoke('claude:executeTool', toolName, params),
  clearHistory: () => ipcRenderer.invoke('claude:clearHistory'),

  // 🎭 User Profile Management
  setUserProfile: (profile: unknown) => ipcRenderer.invoke('claude:setUserProfile', profile),
  getUserProfile: () => ipcRenderer.invoke('claude:getUserProfile'),
  clearUserProfile: () => ipcRenderer.invoke('claude:clearUserProfile'),

  // Streaming
  onStreamingResponse: (callback: (chunk: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: string): void => callback(chunk)
    ipcRenderer.on('claude:streamingChunk', listener)
    return () => ipcRenderer.removeListener('claude:streamingChunk', listener)
  },

  onToolUsed: (callback: (tool: { name: string; id: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      tool: { name: string; id: string }
    ): void => callback(tool)
    ipcRenderer.on('claude:toolUsed', listener)
    return () => ipcRenderer.removeListener('claude:toolUsed', listener)
  },

  // 🧠 MCP Learning API
  getLearningStats: () => ipcRenderer.invoke('claude:getLearningStats'),
  getLearnedPatterns: () => ipcRenderer.invoke('claude:getLearnedPatterns'),
  getRecentActivities: (count?: number) => ipcRenderer.invoke('claude:getRecentActivities', count),
  findMatchingPattern: (userRequest: string) =>
    ipcRenderer.invoke('claude:findMatchingPattern', userRequest)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('claudeAPI', claudeAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.claudeAPI = claudeAPI
}
