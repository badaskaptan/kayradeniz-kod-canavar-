/**
 * List Directory Tool
 * Lists files and directories in a workspace path
 * Based on Continue.dev's lsTool
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg, getBooleanArg } from '../parseArgs'

const TOOL_NAME = 'list_directory'
const TOOL_GROUP = 'built-in'
const MAX_LS_ENTRIES = 200

/**
 * Resolve directory path (handle "." and "./" cases)
 */
function resolveDirPath(dirPath?: string): string {
  if (!dirPath || dirPath === '.') {
    return ''
  }
  if (dirPath.startsWith('./')) {
    return dirPath.slice(2)
  }
  if (dirPath.startsWith('.\\')) {
    return dirPath.slice(2)
  }
  // Normalize path separators
  return dirPath.replace(/\\/g, '/')
}

/**
 * Implementation
 */
export const lsImpl: ToolImpl = async (args, extras) => {
  const dirPath = resolveDirPath(getStringArg(args, 'dirPath', true))
  const recursive = getBooleanArg(args, 'recursive', false) ?? false

  try {
    // Read directory using Tool Bridge
    const result = await extras.ide.fs.readDirectory(dirPath || '.')

    if (!result.success || !result.data) {
      throw new Error(result.error || `Directory "${dirPath || '.'}" not found`)
    }

    const items = result.data

    // Sort: directories first, then files, both alphabetically
    const sortedItems = items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    // Format entries
    let entries = sortedItems.map((item) => {
      const prefix = item.type === 'directory' ? '📁' : '📄'
      const suffix = item.type === 'directory' ? '/' : ''
      return `${prefix} ${item.name}${suffix}`
    })

    // Truncate if needed
    let truncated = false
    if (entries.length > MAX_LS_ENTRIES) {
      truncated = true
      entries = entries.slice(0, MAX_LS_ENTRIES)
    }

    const displayPath = dirPath || '.'
    const content =
      entries.length > 0 ? entries.join('\n') : `No files/folders found in ${displayPath}`

    const contextItems: ContextItem[] = [
      {
        name: 'Directory Listing',
        description: `Files/folders in ${displayPath}`,
        content,
        status: `${entries.length} item(s)`
      }
    ]

    // Add truncation warning if needed
    if (truncated) {
      let warningContent = `${items.length - MAX_LS_ENTRIES} entries were truncated (showing first ${MAX_LS_ENTRIES})`
      if (recursive) {
        warningContent += '. Try using a non-recursive search.'
      }
      contextItems.push({
        name: 'Truncation Warning',
        description: '',
        content: warningContent,
        status: 'Warning'
      })
    }

    return contextItems
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to list directory "${dirPath || '.'}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const listDirectoryTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'List Directory',
  wouldLikeTo: 'list directory {{{ dirPath }}}',
  isCurrently: 'listing directory {{{ dirPath }}}',
  hasAlready: 'listed directory {{{ dirPath }}}',
  readonly: true,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'FolderIcon',
  function: {
    name: TOOL_NAME,
    description: `List files and directories in a workspace path. Use this to explore the project structure.

Shows all files including build/, dist/, node_modules/ etc. (no filtering).
Results are limited to ${MAX_LS_ENTRIES} entries to prevent overwhelming output.

Directories are shown with 📁 prefix and / suffix.
Files are shown with 📄 prefix.`,
    parameters: {
      type: 'object',
      required: [],
      properties: {
        dirPath: {
          type: 'string',
          description: 'The directory path relative to workspace root (default: "." for root)',
          required: false
        },
        recursive: {
          type: 'boolean',
          description: 'List subdirectories recursively (default: false)',
          required: false
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To list files and directories, use the ${TOOL_NAME} tool. For example, to list the src directory:`,
    exampleArgs: [
      ['dirPath', 'src'],
      ['recursive', 'false']
    ]
  },
  implementation: lsImpl
}
