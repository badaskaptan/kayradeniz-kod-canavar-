import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import icon from '../../resources/icon.png?asset'

// Import IPC Handlers (Tool Bridge)
import './ipc'

// Import Claude MCP Service
import { ClaudeMCPService } from './claude-service'

let claudeService: ClaudeMCPService

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
}
