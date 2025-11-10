import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import icon from '../../resources/icon.png?asset'

// Import IPC Handlers (Tool Bridge)
import './ipc'

// Import Claude MCP Service
import { ClaudeMCPService } from './claude-service'

// Import Night Orders Command (Phase 2)
import { NightOrdersCommand } from './night-orders-command'
import { ShipsLogbook } from '../shared/ships-logbook'

let claudeService: ClaudeMCPService
let nightOrdersCommand: NightOrdersCommand
let shipsLogbook: ShipsLogbook

/**
 * Open URL - uses Microsoft Edge for localhost, default browser for others
 * This ensures localhost dev servers open in Edge while external URLs use system default
 */
function openUrl(url: string): void {
  // Check if URL is localhost or 127.0.0.1
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1')

  if (!isLocalhost) {
    // Not localhost - use default browser (supports exe, bat, file:// etc.)
    shell.openExternal(url)
    return
  }

  // Localhost - prefer Microsoft Edge
  if (process.platform === 'win32') {
    // Windows: Use Microsoft Edge
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    exec(`"${edgePath}" "${url}"`, (error) => {
      if (error) {
        // Fallback to default browser if Edge not found
        console.log('Edge not found, using default browser')
        shell.openExternal(url)
      }
    })
  } else if (process.platform === 'darwin') {
    // macOS: Try to use Edge, fallback to Safari or default
    exec(`open -a "Microsoft Edge" "${url}"`, (error) => {
      if (error) {
        shell.openExternal(url)
      }
    })
  } else {
    // Linux or other: Use default browser
    shell.openExternal(url)
  }
}

function createApplicationMenu(mainWindow: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Workspace',
          accelerator: 'CmdOrCtrl+K CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu:open-workspace')
          }
        },
        { type: 'separator' },
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-file')
          }
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu:open-file')
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:save')
          }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu:save-as')
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle File Explorer',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('menu:toggle-explorer')
          }
        },
        {
          label: 'Toggle Terminal',
          accelerator: 'CmdOrCtrl+`',
          click: () => {
            mainWindow.webContents.send('menu:toggle-terminal')
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools()
          }
        },
        { type: 'separator' },
        {
          label: 'Open DevTools (Detached)',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow.webContents.openDevTools({ mode: 'detach' })
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            openUrl('https://github.com/luma-ai/docs')
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            openUrl('https://github.com/luma-ai/issues')
          }
        },
        { type: 'separator' },
        {
          label: 'About LUMA',
          click: () => {
            mainWindow.webContents.send('menu:about')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow(): void {
  // Initialize Ship's Logbook and Night Orders Command (Phase 2)
  const userDataPath = app.getPath('userData')
  shipsLogbook = new ShipsLogbook(userDataPath)
  nightOrdersCommand = new NightOrdersCommand(shipsLogbook, {
    maxRetries: 3,
    autoEscalate: true,
    contextWindowSize: 5,
    enableReflexion: true
  })
  console.log('🌙 Night Orders Command initialized in main process')

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Create application menu
  createApplicationMenu(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Use Edge for localhost URLs, default browser for others
    openUrl(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize Claude MCP Service
  claudeService = new ClaudeMCPService()

  // IPC: Open URL in Edge (preferred browser)
  ipcMain.handle('shell:openUrl', async (_, url: string) => {
    try {
      openUrl(url)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Setup Claude IPC Handlers
  setupClaudeHandlers()

  // Setup Night Orders IPC Handlers
  setupNightOrdersHandlers()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// ============================================
// Claude MCP IPC Handlers
// ============================================
function setupClaudeHandlers(): void {
  // Get the main window reference
  const getMainWindow = (): BrowserWindow | null => {
    const windows = BrowserWindow.getAllWindows()
    return windows.length > 0 ? windows[0] : null
  }

  // Workspace path ayarla
  ipcMain.handle('claude:setWorkspacePath', (_event, workspacePath: string) => {
    claudeService.setWorkspacePath(workspacePath)
    return { success: true }
  })

  // API Key Management
  ipcMain.handle('claude:getApiKey', async () => {
    return claudeService.getApiKey()
  })

  ipcMain.handle('claude:saveApiKey', async (_event, apiKey: string) => {
    claudeService.setApiKey(apiKey)
    return { success: true }
  })

  ipcMain.handle('claude:validateApiKey', async (_event, apiKey: string) => {
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

  // Claude Conversation
  ipcMain.handle('claude:sendMessage', async (_event, message: string, context?: unknown) => {
    const mainWindow = getMainWindow()
    return await claudeService.sendMessage(message, context, mainWindow || undefined)
  })

  ipcMain.handle('claude:listTools', async () => {
    return claudeService.listTools()
  })

  ipcMain.handle('claude:executeTool', async (_event, toolName: string, params: unknown) => {
    return await claudeService.executeTool(toolName, params)
  })

  ipcMain.handle('claude:clearHistory', async () => {
    claudeService.clearHistory()
    return { success: true }
  })

  // 🎭 User Profile Handlers
  ipcMain.handle('claude:setUserProfile', async (_event, profile: unknown) => {
    claudeService.setUserProfile(profile)
    return { success: true }
  })

  ipcMain.handle('claude:getUserProfile', async () => {
    return claudeService.getUserProfile()
  })

  ipcMain.handle('claude:clearUserProfile', async () => {
    claudeService.clearUserProfile()
    return { success: true }
  })

  // 🧠 MCP Learning Handlers
  ipcMain.handle('claude:getLearningStats', async () => {
    return claudeService.getLearningStatistics()
  })

  ipcMain.handle('claude:getLearnedPatterns', async () => {
    return claudeService.getLearnedPatterns()
  })

  ipcMain.handle('claude:getRecentActivities', async (_event, count?: number) => {
    return claudeService.getRecentActivities(count)
  })

  ipcMain.handle('claude:findMatchingPattern', async (_event, userRequest: string) => {
    return await claudeService.findMatchingPattern(userRequest)
  })

  // 📡 Activity Observer IPC Handlers (Dual-Teacher Support)
  ipcMain.handle(
    'claude:startObservation',
    async (
      _event,
      {
        teacher,
        message,
        context
      }: { teacher: 'CLAUDE' | 'OPENAI'; message: string; context?: unknown }
    ) => {
      try {
        const observationId = claudeService['activityObserver'].startObservation(
          teacher,
          message,
          typeof context === 'string' ? context : JSON.stringify(context)
        )
        return { success: true, observationId }
      } catch (error) {
        console.error('[IPC] Failed to start observation:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  ipcMain.handle(
    'claude:recordToolCall',
    async (
      _event,
      {
        observationId,
        toolName,
        params,
        result,
        success,
        executionTime
      }: {
        observationId: string
        toolName: string
        params: unknown
        result: unknown
        success: boolean
        executionTime: number
      }
    ) => {
      try {
        claudeService['activityObserver'].recordToolCall(
          observationId,
          toolName,
          params,
          String(result),
          success,
          executionTime
        )
        return { success: true }
      } catch (error) {
        console.error('[IPC] Failed to record tool call:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  ipcMain.handle(
    'claude:completeObservation',
    async (
      _event,
      {
        observationId,
        response,
        success
      }: {
        observationId: string
        response: unknown
        success: boolean
      }
    ) => {
      try {
        claudeService['activityObserver'].completeObservation(
          observationId,
          String(response),
          success
        )
        return { success: true }
      } catch (error) {
        console.error('[IPC] Failed to complete observation:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )
}

// ============================================
// Night Orders IPC Handlers (Phase 2)
// ============================================
function setupNightOrdersHandlers(): void {
  // Issue new Night Orders from natural language
  ipcMain.handle('nightOrders:issueFromNaturalLanguage', async (_event, userRequest: string) => {
    try {
      const order = await nightOrdersCommand.issueOrdersFromNaturalLanguage(userRequest)
      return { success: true, order }
    } catch (error) {
      console.error('[Night Orders] Failed to issue orders:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Get current active order
  ipcMain.handle('nightOrders:getCurrentOrder', async () => {
    try {
      const order = nightOrdersCommand.getCurrentOrder()
      return { success: true, order }
    } catch (error) {
      console.error('[Night Orders] Failed to get current order:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Get next pending task
  ipcMain.handle('nightOrders:getNextPendingTask', async () => {
    try {
      const task = nightOrdersCommand.getNextPendingTask()
      return { success: true, task }
    } catch (error) {
      console.error('[Night Orders] Failed to get next task:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Execute next pending task (Phase 2.3)
  ipcMain.handle('nightOrders:executeNextTask', async () => {
    try {
      const result = await nightOrdersCommand.executeNextTask()
      return result
    } catch (error) {
      console.error('[Night Orders] Failed to execute task:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Record task execution
  ipcMain.handle(
    'nightOrders:recordTaskExecution',
    async (
      _event,
      {
        taskId,
        officer,
        action,
        result,
        details
      }: {
        taskId: number
        officer: string
        action: string
        result: 'success' | 'partial' | 'failed'
        details: {
          problems?: string[]
          filesModified?: string[]
          toolsUsed?: string[]
          outputSummary?: string
          needsReview?: boolean
        }
      }
    ) => {
      try {
        const currentOrder = nightOrdersCommand.getCurrentOrder()
        if (!currentOrder) {
          return { success: false, error: 'No active Night Order' }
        }

        const task = currentOrder.taskBreakdown.find((t) => t.taskId === taskId)
        if (!task) {
          return { success: false, error: `Task ${taskId} not found` }
        }

        nightOrdersCommand.recordTaskExecution(task, officer as 'coder', action, result, details)

        return { success: true }
      } catch (error) {
        console.error('[Night Orders] Failed to record task execution:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Get mission statistics
  ipcMain.handle('nightOrders:getStatistics', async () => {
    try {
      const stats = nightOrdersCommand.getStatistics()
      return { success: true, stats }
    } catch (error) {
      console.error('[Night Orders] Failed to get statistics:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Complete current order
  ipcMain.handle('nightOrders:completeOrder', async (_event, success: boolean) => {
    try {
      nightOrdersCommand.completeOrder(success)
      return { success: true }
    } catch (error) {
      console.error('[Night Orders] Failed to complete order:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Update configuration
  ipcMain.handle('nightOrders:updateConfig', async (_event, config: Record<string, unknown>) => {
    try {
      nightOrdersCommand.updateConfig(config)
      return { success: true }
    } catch (error) {
      console.error('[Night Orders] Failed to update config:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Get configuration
  ipcMain.handle('nightOrders:getConfig', async () => {
    try {
      const config = nightOrdersCommand.getConfig()
      return { success: true, config }
    } catch (error) {
      console.error('[Night Orders] Failed to get config:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Start autonomous execution
  ipcMain.handle('nightOrders:startAutonomous', async () => {
    try {
      nightOrdersCommand.startAutonomousExecution()
      return { success: true }
    } catch (error) {
      console.error('[Night Orders] Failed to start autonomous execution:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Stop autonomous execution
  ipcMain.handle('nightOrders:stopAutonomous', async () => {
    try {
      nightOrdersCommand.stopAutonomousExecution()
      return { success: true }
    } catch (error) {
      console.error('[Night Orders] Failed to stop autonomous execution:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  console.log('🌙 Night Orders IPC handlers initialized')
}
