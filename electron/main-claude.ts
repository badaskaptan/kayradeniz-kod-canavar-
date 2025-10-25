// Electron Main Process - Claude MCP Integration
import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { ClaudeMCPService } from '../src/main/claude-service'

let mainWindow: BrowserWindow | null = null
let claudeService: ClaudeMCPService

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Development'ta
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  claudeService = new ClaudeMCPService()

  createWindow()

  // ============================================
  // API Key Management IPC Handlers
  // ============================================

  ipcMain.handle('claude:getApiKey', async () => {
    return claudeService.getApiKey()
  })

  ipcMain.handle('claude:saveApiKey', async (event, apiKey: string) => {
    claudeService.setApiKey(apiKey)
    return { success: true }
  })

  ipcMain.handle('claude:validateApiKey', async (event, apiKey: string) => {
    const isValid = await claudeService.validateApiKey(apiKey)
    return { valid: isValid }
  })

  ipcMain.handle('claude:clearApiKey', async () => {
    claudeService.clearApiKey()
    return { success: true }
  })

  ipcMain.handle('claude:hasApiKey', async () => {
    return claudeService.hasApiKey()
  })

  // ============================================
  // Claude Conversation IPC Handlers
  // ============================================

  ipcMain.handle('claude:sendMessage', async (event, message: string, context?: any) => {
    return await claudeService.sendMessage(message, context, mainWindow || undefined)
  })

  ipcMain.handle('claude:listTools', async () => {
    return claudeService.listTools()
  })

  ipcMain.handle('claude:executeTool', async (event, toolName: string, params: any) => {
    return await claudeService.executeTool(toolName, params)
  })

  ipcMain.handle('claude:clearHistory', async () => {
    claudeService.clearHistory()
    return { success: true }
  })

  // ============================================
  // App Lifecycle
  // ============================================

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
