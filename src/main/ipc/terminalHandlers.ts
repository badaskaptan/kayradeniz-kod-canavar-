import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Terminal IPC Handlers
 * Tool Bridge için terminal komutlarını çalıştırma
 */

// Execute command
ipcMain.handle('terminal:exec', async (_, command: string, cwd?: string) => {
  try {
    const startTime = Date.now()
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB
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
