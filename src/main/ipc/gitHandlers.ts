/**
 * Git Operations IPC Handlers
 *
 * Provides Git functionality through child_process.exec
 * - git status: Show repository status
 * - git diff: Show file changes
 * - git log: Show commit history
 * - git add: Stage files
 * - git commit: Commit changes
 */

import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'
import type {
  ToolBridgeResult,
  ToolBridgeGitStatusResult,
  ToolBridgeGitDiffOptions,
  ToolBridgeGitLogOptions,
  ToolBridgeGitAddOptions,
  ToolBridgeGitCommitOptions
} from '../../shared/toolBridge'

const execAsync = promisify(exec)

// Workspace root - should be set from main process
const WORKSPACE_ROOT = process.cwd()

/**
 * Execute git command safely
 */
async function executeGitCommand(
  command: string,
  cwd: string = WORKSPACE_ROOT
): Promise<{ stdout: string; stderr: string }> {
  try {
    // Check if directory is a git repository
    try {
      await fs.access(path.join(cwd, '.git'))
    } catch {
      throw new Error('Not a git repository')
    }

    // Execute git command with timeout
    const result = await execAsync(command, {
      cwd,
      timeout: 30000, // 30 second timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })

    return result
  } catch (error: unknown) {
    throw new Error(`Git command failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Parse git status output
 */
function parseGitStatus(output: string): ToolBridgeGitStatusResult {
  const lines = output.split('\n').filter((line) => line.trim())

  const result: ToolBridgeGitStatusResult = {
    branch: '',
    ahead: 0,
    behind: 0,
    staged: [],
    modified: [],
    untracked: []
  }

  for (const line of lines) {
    // Branch info: ## main...origin/main [ahead 2, behind 1]
    if (line.startsWith('##')) {
      const branchMatch = line.match(/## ([^\s.]+)/)
      if (branchMatch) {
        result.branch = branchMatch[1]
      }

      const aheadMatch = line.match(/ahead (\d+)/)
      if (aheadMatch) {
        result.ahead = parseInt(aheadMatch[1], 10)
      }

      const behindMatch = line.match(/behind (\d+)/)
      if (behindMatch) {
        result.behind = parseInt(behindMatch[1], 10)
      }
      continue
    }

    // File status: XY filename
    const statusCode = line.substring(0, 2)
    const filename = line.substring(3).trim()

    // Staged changes (X is not space or ?)
    if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
      result.staged.push(filename)
    }

    // Modified changes (Y is not space)
    if (statusCode[1] !== ' ' && statusCode[1] !== '?') {
      result.modified.push(filename)
    }

    // Untracked files
    if (statusCode === '??') {
      result.untracked.push(filename)
    }
  }

  return result
}

/**
 * Setup Git IPC handlers
 */
export function setupGitHandlers(): void {
  /**
   * Git Status - Show repository status
   */
  ipcMain.handle(
    'toolbridge:git:status',
    async (_, workspaceRoot?: string): Promise<ToolBridgeResult<ToolBridgeGitStatusResult>> => {
      try {
        const cwd = workspaceRoot || WORKSPACE_ROOT

        // Execute git status --porcelain=v2 --branch
        const { stdout } = await executeGitCommand('git status --porcelain=v2 --branch', cwd)

        const status = parseGitStatus(stdout)

        return {
          success: true,
          data: status
        }
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : String(error) || 'Failed to get git status'
        }
      }
    }
  )

  /**
   * Git Diff - Show file changes
   */
  ipcMain.handle(
    'toolbridge:git:diff',
    async (_, options: ToolBridgeGitDiffOptions): Promise<ToolBridgeResult<string>> => {
      try {
        const cwd = options.workspaceRoot || WORKSPACE_ROOT

        // Build git diff command
        let command = 'git diff'

        // Diff type: staged, unstaged, or commit range
        if (options.staged) {
          command += ' --cached'
        } else if (options.fromCommit || options.toCommit) {
          // Commit range diff
          const from = options.fromCommit || 'HEAD'
          const to = options.toCommit || ''
          command += ` ${from}${to ? '..' + to : ''}`
        }

        // Specific file
        if (options.file) {
          command += ` -- "${options.file}"`
        }

        // Context lines
        if (options.contextLines !== undefined) {
          command += ` -U${options.contextLines}`
        }

        // Execute git diff
        const { stdout } = await executeGitCommand(command, cwd)

        return {
          success: true,
          data: stdout
        }
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error) || 'Failed to get git diff'
        }
      }
    }
  )

  /**
   * Git Log - Show commit history
   */
  ipcMain.handle(
    'toolbridge:git:log',
    async (_, options: ToolBridgeGitLogOptions): Promise<ToolBridgeResult<string>> => {
      try {
        const cwd = options.workspaceRoot || WORKSPACE_ROOT

        // Build git log command
        let command = 'git log'

        // Number of commits
        const maxCount = options.maxCount || 10
        command += ` -n ${maxCount}`

        // Format options
        if (options.oneline) {
          command += ' --oneline'
        } else {
          command += ' --pretty=format:"%h - %an, %ar : %s"'
        }

        if (options.graph) {
          command += ' --graph'
        }

        if (options.stat) {
          command += ' --stat'
        }

        // Specific file
        if (options.file) {
          command += ` -- "${options.file}"`
        }

        // Execute git log
        const { stdout } = await executeGitCommand(command, cwd)

        return {
          success: true,
          data: stdout
        }
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error) || 'Failed to get git log'
        }
      }
    }
  )

  /**
   * Git Add - Stage files
   */
  ipcMain.handle(
    'toolbridge:git:add',
    async (_, options: ToolBridgeGitAddOptions): Promise<ToolBridgeResult<string>> => {
      try {
        const cwd = options.workspaceRoot || WORKSPACE_ROOT

        // Build git add command
        let command = 'git add'

        if (options.all) {
          // Add all files
          command += ' -A'
        } else if (options.update) {
          // Update tracked files only
          command += ' -u'
        } else if (options.files && options.files.length > 0) {
          // Add specific files
          const files = options.files.map((f) => `"${f}"`).join(' ')
          command += ` ${files}`
        } else {
          throw new Error('Must specify files, all: true, or update: true')
        }

        // Execute git add
        const { stdout, stderr } = await executeGitCommand(command, cwd)

        return {
          success: true,
          data: stdout || stderr || 'Files staged successfully'
        }
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error) || 'Failed to stage files'
        }
      }
    }
  )

  /**
   * Git Commit - Commit changes
   */
  ipcMain.handle(
    'toolbridge:git:commit',
    async (_, options: ToolBridgeGitCommitOptions): Promise<ToolBridgeResult<string>> => {
      try {
        const cwd = options.workspaceRoot || WORKSPACE_ROOT

        // Validate commit message
        if (!options.message || !options.message.trim()) {
          throw new Error('Commit message is required')
        }

        // Build git commit command
        const message = options.message.replace(/"/g, '\\"')
        let command = `git commit -m "${message}"`

        // Amend previous commit
        if (options.amend) {
          command += ' --amend'
        }

        // Allow empty commit
        if (options.allowEmpty) {
          command += ' --allow-empty'
        }

        // Execute git commit
        const { stdout, stderr } = await executeGitCommand(command, cwd)

        return {
          success: true,
          data: stdout || stderr || 'Commit successful'
        }
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : String(error) || 'Failed to commit changes'
        }
      }
    }
  )
}
