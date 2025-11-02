import { ipcMain, dialog } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * File System IPC Handlers
 * Tool Bridge için fiziksel dosya sistemine erişim
 */

// Read file
ipcMain.handle('fs:readFile', async (_, filePath: string, encoding = 'utf-8') => {
  try {
    const content = await fs.readFile(filePath, encoding as BufferEncoding)
    return { success: true, data: content }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Write file
ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string, encoding = 'utf-8') => {
  try {
    await fs.writeFile(filePath, content, encoding as BufferEncoding)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Delete file
ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
  try {
    await fs.unlink(filePath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Move/rename file
ipcMain.handle('fs:moveFile', async (_, source: string, destination: string) => {
  try {
    await fs.rename(source, destination)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Create directory
ipcMain.handle('fs:createDirectory', async (_, dirPath: string) => {
  try {
    await fs.mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// List directory
ipcMain.handle('fs:readDirectory', async (_, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const items = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name)
        const stats = await fs.stat(fullPath)

        return {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime
        }
      })
    )

    return { success: true, data: items }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Get file stats
ipcMain.handle('fs:getStats', async (_, filePath: string) => {
  try {
    const stats = await fs.stat(filePath)
    return {
      success: true,
      data: {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Check if file exists
ipcMain.handle('fs:exists', async (_, filePath: string) => {
  try {
    await fs.access(filePath)
    return { success: true, data: true }
  } catch {
    return { success: true, data: false }
  }
})

// Open file dialog
ipcMain.handle(
  'dialog:openFile',
  async (
    _,
    options?: {
      title?: string
      filters?: Array<{ name: string; extensions: string[] }>
      allowMultiple?: boolean
      defaultPath?: string
    }
  ) => {
    try {
      const result = await dialog.showOpenDialog({
        title: options?.title,
        defaultPath: options?.defaultPath,
        filters: options?.filters,
        properties: options?.allowMultiple ? ['openFile', 'multiSelections'] : ['openFile']
      })

      if (result.canceled) {
        return { success: true, data: null }
      }

      return { success: true, data: result.filePaths }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
)

// Open directory dialog
ipcMain.handle(
  'dialog:openDirectory',
  async (
    _,
    options?: {
      title?: string
      defaultPath?: string
    }
  ) => {
    try {
      const result = await dialog.showOpenDialog({
        title: options?.title,
        defaultPath: options?.defaultPath,
        properties: ['openDirectory']
      })

      if (result.canceled) {
        return { success: true, data: null }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
)

// Save file dialog
ipcMain.handle(
  'dialog:saveFile',
  async (
    _,
    options?: {
      title?: string
      defaultPath?: string
      filters?: Array<{ name: string; extensions: string[] }>
    }
  ) => {
    try {
      const result = await dialog.showSaveDialog({
        title: options?.title,
        defaultPath: options?.defaultPath,
        filters: options?.filters
      })

      if (result.canceled) {
        return { success: true, data: null }
      }

      return { success: true, data: result.filePath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
)
