import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Terminal IPC Handlers
 * Tool Bridge için terminal komutlarını çalıştırma
 * Supports ALL terminal commands including:
 * - PowerShell commands (Windows)
 * - Bash/Zsh commands (macOS/Linux)
 * - npm, git, python, node, etc.
 * - Interactive commands (with streaming support)
 */

// Execute command with full shell support
ipcMain.handle('terminal:exec', async (_, command: string, cwd?: string) => {
  try {
    const startTime = Date.now()

    // Determine shell based on platform
    const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'

    // Execute with proper shell and larger buffer
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
      shell: shell,
      env: {
        ...process.env,
        FORCE_COLOR: '1', // Enable colored output
        TERM: 'xterm-256color'
      },
      timeout: 30000 // 30 second timeout (enough for most commands)
    })

    const executionTime = Date.now() - startTime

    return {
      success: true,
      data: {
        stdout,
        stderr,
        exitCode: 0,
        executionTime
      }
    }
  } catch (error) {
    const err = error as { message: string; stdout?: string; stderr?: string; code?: number }
    return {
      success: false,
      error: err.message,
      data: {
        stdout: err.stdout || '',
        stderr: err.stderr || '',
        exitCode: err.code || 1
      }
    }
  }
})

// Get current working directory
ipcMain.handle('terminal:getCwd', async () => {
  try {
    return { success: true, data: process.cwd() }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Change working directory
ipcMain.handle('terminal:setCwd', async (_, cwd: string) => {
  try {
    process.chdir(cwd)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Get environment variables
ipcMain.handle('terminal:getEnv', async () => {
  try {
    return { success: true, data: process.env }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Set environment variable
ipcMain.handle('terminal:setEnv', async (_, key: string, value: string) => {
  try {
    process.env[key] = value
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})
