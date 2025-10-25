import type { Task, TaskResult, ToolBridgeAPI } from '../types'

/**
 * Code Executor Agent
 *
 * Görevler:
 * 1. Terminal komutlarını çalıştır
 * 2. Dosya operasyonları (CRUD)
 * 3. Çoklu adım işlemleri yönet
 * 4. Hata yönetimi ve raporlama
 */

export interface ExecutionContext {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'create-dir'
  path: string
  content?: string
  encoding?: string
}

export class CodeExecutorAgent {
  private api: ToolBridgeAPI

  constructor(api: ToolBridgeAPI) {
    this.api = api
  }

  /**
   * Task'ı çalıştır
   */
  async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      // Task type'a göre execution
      switch (task.type) {
        case 'execution':
          return await this.executeCommand(task, startTime)
        case 'file-operation':
          return await this.executeFileOperation(task, startTime)
        default:
          throw new Error(`Unsupported task type: ${task.type}`)
      }
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Terminal komutu çalıştır
   */
  private async executeCommand(task: Task, startTime: number): Promise<TaskResult> {
    const { metadata } = task
    const command = metadata?.command as string | undefined

    if (!command) {
      throw new Error('No command specified in task metadata')
    }

    const context = metadata?.context as ExecutionContext | undefined

    // CWD ayarla
    if (context?.cwd) {
      await this.api.terminal.setCwd(context.cwd)
    }

    // Environment variables ayarla
    if (context?.env) {
      for (const [key, value] of Object.entries(context.env)) {
        await this.api.terminal.setEnv(key, value)
      }
    }

    // Komutu çalıştır
    const result = await this.api.terminal.exec(command)

    if (!result.success) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: result.error || 'Command execution failed',
        output: result.data?.stderr
      }
    }

    return {
      success: true,
      executionTime: Date.now() - startTime,
      output: result.data?.stdout || '',
      metadata: {
        exitCode: result.data?.exitCode,
        stderr: result.data?.stderr
      }
    }
  }

  /**
   * Dosya operasyonu gerçekleştir
   */
  private async executeFileOperation(task: Task, startTime: number): Promise<TaskResult> {
    const { metadata } = task
    const operation = metadata?.operation as FileOperation | undefined

    if (!operation) {
      throw new Error('No file operation specified in task metadata')
    }

    let result: { success: boolean; data?: unknown; error?: string }

    switch (operation.type) {
      case 'read':
        result = await this.api.fs.readFile(operation.path, operation.encoding || 'utf-8')
        break

      case 'write':
        if (!operation.content) {
          throw new Error('No content specified for write operation')
        }
        result = await this.api.fs.writeFile(
          operation.path,
          operation.content,
          operation.encoding || 'utf-8'
        )
        break

      case 'delete':
        result = await this.api.fs.deleteFile(operation.path)
        break

      case 'create-dir':
        result = await this.api.fs.createDirectory(operation.path)
        break

      default:
        throw new Error(`Unsupported file operation: ${operation.type}`)
    }

    if (!result.success) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: result.error || 'File operation failed'
      }
    }

    return {
      success: true,
      executionTime: Date.now() - startTime,
      output: operation.type === 'read' ? String(result.data) : `${operation.type} successful`,
      metadata: {
        operation: operation.type,
        path: operation.path
      }
    }
  }

  /**
   * Batch file operations
   */
  async executeBatchFileOperations(operations: FileOperation[]): Promise<TaskResult> {
    const startTime = Date.now()
    const results: Array<{ operation: FileOperation; success: boolean; error?: string }> = []

    for (const operation of operations) {
      try {
        const task: Task = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'file-operation',
          title: `${operation.type} ${operation.path}`,
          description: `${operation.type} ${operation.path}`,
          status: 'pending',
          priority: 5,
          assignedAgent: 'executor',
          createdAt: new Date(),
          metadata: { operation }
        }

        const result = await this.executeFileOperation(task, startTime)
        results.push({
          operation,
          success: result.success,
          error: result.error
        })

        if (!result.success) {
          // Batch işlemde hata oluşursa dur
          break
        }
      } catch (error) {
        results.push({
          operation,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
        break
      }
    }

    const allSuccessful = results.every((r) => r.success)

    return {
      success: allSuccessful,
      executionTime: Date.now() - startTime,
      output: `Batch operation: ${results.filter((r) => r.success).length}/${results.length} successful`,
      metadata: { results }
    }
  }

  /**
   * Directory içeriğini listele
   */
  async listDirectory(path: string): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      const result = await this.api.fs.readDirectory(path)

      if (!result.success) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          error: result.error || 'Failed to read directory'
        }
      }

      return {
        success: true,
        executionTime: Date.now() - startTime,
        output: JSON.stringify(result.data, null, 2),
        metadata: {
          path,
          items: result.data
        }
      }
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Dosya var mı kontrol et
   */
  async checkFileExists(path: string): Promise<boolean> {
    const result = await this.api.fs.exists(path)
    return result.success && result.data === true
  }

  /**
   * Dosya/dizin bilgilerini al
   */
  async getFileStats(path: string): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      const result = await this.api.fs.getStats(path)

      if (!result.success) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          error: result.error || 'Failed to get file stats'
        }
      }

      return {
        success: true,
        executionTime: Date.now() - startTime,
        output: JSON.stringify(result.data, null, 2),
        metadata: {
          path,
          stats: result.data
        }
      }
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Dialog ile dosya seç
   */
  async openFileDialog(
    title: string = 'Select File',
    filters?: Array<{ name: string; extensions: string[] }>
  ): Promise<string[] | null> {
    const result = await this.api.dialog.openFile({
      title,
      filters,
      allowMultiple: true
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  /**
   * Dialog ile dizin seç
   */
  async openDirectoryDialog(title: string = 'Select Directory'): Promise<string | null> {
    const result = await this.api.dialog.openDirectory({ title })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }

  /**
   * Dialog ile kaydetme yeri seç
   */
  async saveFileDialog(
    title: string = 'Save File',
    defaultPath?: string,
    filters?: Array<{ name: string; extensions: string[] }>
  ): Promise<string | null> {
    const result = await this.api.dialog.saveFile({
      title,
      defaultPath,
      filters
    })

    if (!result.success || !result.data) {
      return null
    }

    return result.data
  }
}
