/**
 * Search Handlers for Tool Bridge
 * Implements grep and glob search functionality
 */

import { ipcMain } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { glob } from 'glob'
import type {
  ToolBridgeResult,
  ToolBridgeSearchMatch,
  ToolBridgeGrepOptions,
  ToolBridgeGlobOptions
} from '../../shared/toolBridge'

const WORKSPACE_ROOT = process.cwd()

/**
 * Escape regex special characters for literal search
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Search file contents recursively
 */
async function searchInFiles(
  dir: string,
  pattern: RegExp,
  options: ToolBridgeGrepOptions,
  results: ToolBridgeSearchMatch[]
): Promise<void> {
  if (results.length >= (options.maxResults || 100)) {
    return
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (results.length >= (options.maxResults || 100)) {
        break
      }

      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(WORKSPACE_ROOT, fullPath)

      // Check exclude pattern
      if (options.excludePattern && new RegExp(options.excludePattern).test(relativePath)) {
        continue
      }

      // Check include pattern
      if (options.includePattern && !new RegExp(options.includePattern).test(relativePath)) {
        continue
      }

      if (entry.isDirectory()) {
        // Skip common directories
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === '.vscode'
        ) {
          continue
        }

        await searchInFiles(fullPath, pattern, options, results)
      } else if (entry.isFile()) {
        // Skip binary files
        if (
          entry.name.endsWith('.jpg') ||
          entry.name.endsWith('.png') ||
          entry.name.endsWith('.gif') ||
          entry.name.endsWith('.pdf') ||
          entry.name.endsWith('.zip') ||
          entry.name.endsWith('.exe')
        ) {
          continue
        }

        try {
          const content = await fs.readFile(fullPath, 'utf-8')
          const lines = content.split('\n')

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= (options.maxResults || 100)) {
              break
            }

            const line = lines[i]
            const match = pattern.exec(line)

            if (match) {
              results.push({
                file: relativePath.replace(/\\/g, '/'),
                line: i + 1,
                column: match.index + 1,
                content: line.trim(),
                matchText: match[0]
              })
            }
          }
        } catch (error) {
          // Skip files that can't be read (binary, permission issues, etc.)
          continue
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
    return
  }
}

/**
 * Handle grep search
 */
export function setupSearchHandlers(): void {
  ipcMain.handle(
    'toolbridge:search:grep',
    async (
      _event,
      options: ToolBridgeGrepOptions
    ): Promise<ToolBridgeResult<ToolBridgeSearchMatch[]>> => {
      try {
        const { pattern, isRegex, caseSensitive = true, maxResults = 100 } = options

        // Create regex pattern
        let regexPattern: RegExp
        if (isRegex) {
          regexPattern = new RegExp(pattern, caseSensitive ? 'g' : 'gi')
        } else {
          const escaped = escapeRegex(pattern)
          regexPattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi')
        }

        // Search workspace
        const results: ToolBridgeSearchMatch[] = []
        await searchInFiles(WORKSPACE_ROOT, regexPattern, { ...options, maxResults }, results)

        return {
          success: true,
          data: results
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle(
    'toolbridge:search:glob',
    async (_event, options: ToolBridgeGlobOptions): Promise<ToolBridgeResult<string[]>> => {
      try {
        const { pattern, maxResults = 100, excludePattern, followSymlinks = false } = options

        // Default exclusions
        const ignore = [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          '.vscode/**',
          '*.log',
          '.env'
        ]

        if (excludePattern) {
          ignore.push(excludePattern)
        }

        // Search using glob
        const files = await glob(pattern, {
          cwd: WORKSPACE_ROOT,
          ignore,
          nodir: true,
          follow: followSymlinks,
          absolute: false
        })

        // Limit results
        const limitedFiles = files.slice(0, maxResults)

        // Normalize paths (use forward slashes)
        const normalizedFiles = limitedFiles.map((f) => f.replace(/\\/g, '/'))

        return {
          success: true,
          data: normalizedFiles
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )
}
