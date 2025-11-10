/**
 * Claude's Official Text Editor Tool
 * Implements text_editor_20250728 with commands: view, str_replace, create, insert
 * Based on Anthropic's official tool specification
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg, getNumberArg, getArrayArg } from '../parseArgs'

const TOOL_NAME = 'str_replace_editor'
const TOOL_GROUP = 'built-in'

/**
 * Resolve path (handle "." and "./" cases)
 */
function resolvePath(path?: string): string {
  if (!path || path === '.') {
    return ''
  }
  if (path.startsWith('./')) {
    return path.slice(2)
  }
  if (path.startsWith('.\\')) {
    return path.slice(2)
  }
  // Normalize path separators
  return path.replace(/\\/g, '/')
}

/**
 * Format file content with line numbers
 */
function formatWithLineNumbers(content: string): string {
  const lines = content.split('\n')
  return lines.map((line, idx) => `${idx + 1}: ${line}`).join('\n')
}

/**
 * Implementation
 */
export const strReplaceEditorImpl: ToolImpl = async (args, extras) => {
  const command = getStringArg(args, 'command', true)
  const path = resolvePath(getStringArg(args, 'path', true))

  try {
    switch (command) {
      case 'view': {
        // View file or directory
        const viewRange = getArrayArg(args, 'view_range', false) as [number, number] | undefined

        // Check if path is a directory
        const dirResult = await extras.ide.fs.readDirectory(path || '.')

        if (dirResult.success && dirResult.data) {
          // It's a directory - list contents
          const items = dirResult.data
          const sortedItems = items.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1
            }
            return a.name.localeCompare(b.name)
          })

          const entries = sortedItems.map((item) => {
            const prefix = item.type === 'directory' ? '📁' : '📄'
            const suffix = item.type === 'directory' ? '/' : ''
            return `${prefix} ${item.name}${suffix}`
          })

          const content =
            entries.length > 0 ? entries.join('\n') : `No files/folders found in ${path || '.'}`

          return [
            {
              name: 'Directory Listing',
              description: `Contents of ${path || '.'}`,
              content,
              status: `${entries.length} item(s)`
            }
          ]
        }

        // It's a file - read content
        const fileResult = await extras.ide.fs.readFile(path)

        if (!fileResult.success || fileResult.data === undefined) {
          throw new Error(fileResult.error || `File "${path}" not found`)
        }

        let content = fileResult.data

        // Apply view range if specified
        if (viewRange && Array.isArray(viewRange) && viewRange.length === 2) {
          const lines = content.split('\n')
          const [start, end] = viewRange
          const startIdx = Math.max(0, start - 1) // 1-indexed to 0-indexed
          const endIdx = end === -1 ? lines.length : end
          content = lines.slice(startIdx, endIdx).join('\n')
        }

        // Format with line numbers
        const formattedContent = formatWithLineNumbers(content)

        return [
          {
            name: 'File Content',
            description: `Contents of ${path}`,
            content: formattedContent,
            status: 'Success'
          }
        ]
      }

      case 'str_replace': {
        // Replace string in file
        const oldStr = getStringArg(args, 'old_str', true)
        const newStr = getStringArg(args, 'new_str', true)

        if (!oldStr) {
          throw new Error('old_str parameter is required for str_replace command')
        }

        // Read file
        const fileResult = await extras.ide.fs.readFile(path)
        if (!fileResult.success || fileResult.data === undefined) {
          throw new Error(fileResult.error || `File "${path}" not found`)
        }

        const content = fileResult.data

        // Count occurrences
        const occurrences = (content.match(new RegExp(escapeRegExp(oldStr), 'g')) || []).length

        if (occurrences === 0) {
          throw new Error(`String not found in ${path}:\n${oldStr}`)
        }

        if (occurrences > 1) {
          throw new Error(
            `Multiple matches (${occurrences}) found for replacement in ${path}.\n` +
              `Please provide a more specific old_str that matches exactly once.`
          )
        }

        // Replace string
        const newContent = content.replace(oldStr, newStr || '')

        // Write back
        const writeResult = await extras.ide.fs.writeFile(path, newContent)

        if (!writeResult.success) {
          throw new Error(writeResult.error || `Failed to write to ${path}`)
        }

        return [
          {
            name: 'Replacement Result',
            description: `Replaced text in ${path}`,
            content: 'Successfully replaced text at exactly one location.',
            status: 'Success'
          }
        ]
      }

      case 'create': {
        // Create new file
        const fileText = getStringArg(args, 'file_text', true) || ''

        // Check if file already exists
        const existsResult = await extras.ide.fs.readFile(path)
        if (existsResult.success) {
          throw new Error(`File "${path}" already exists. Use str_replace to modify it.`)
        }

        // Create file
        const writeResult = await extras.ide.fs.writeFile(path, fileText)

        if (!writeResult.success) {
          throw new Error(writeResult.error || `Failed to create ${path}`)
        }

        return [
          {
            name: 'File Created',
            description: `Created new file ${path}`,
            content: `Successfully created ${path} (${fileText.length} characters)`,
            status: 'Success'
          }
        ]
      }

      case 'insert': {
        // Insert text at specific line
        const insertLine = getNumberArg(args, 'insert_line') ?? 0
        const newStr = getStringArg(args, 'new_str', true) || ''

        // Read file
        const fileResult = await extras.ide.fs.readFile(path)
        if (!fileResult.success || fileResult.data === undefined) {
          throw new Error(fileResult.error || `File "${path}" not found`)
        }

        const lines = fileResult.data.split('\n')

        // Insert at specified line (0 = beginning)
        if (insertLine < 0 || insertLine > lines.length) {
          throw new Error(`Invalid insert_line: ${insertLine}. File has ${lines.length} lines.`)
        }

        lines.splice(insertLine, 0, newStr)
        const newContent = lines.join('\n')

        // Write back
        const writeResult = await extras.ide.fs.writeFile(path, newContent)

        if (!writeResult.success) {
          throw new Error(writeResult.error || `Failed to write to ${path}`)
        }

        return [
          {
            name: 'Insert Result',
            description: `Inserted text in ${path}`,
            content: `Successfully inserted text at line ${insertLine}`,
            status: 'Success'
          }
        ]
      }

      default:
        throw new Error(`Unknown command: ${command}. Supported: view, str_replace, create, insert`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Text editor tool failed: ${errorMessage}`)
  }
}

/**
 * Helper: Escape regex special characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Tool definition
 */
export const strReplaceEditorTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Text Editor',
  wouldLikeTo: 'edit {{{ path }}}',
  isCurrently: 'editing {{{ path }}}',
  hasAlready: 'edited {{{ path }}}',
  readonly: false,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'FileEditIcon',
  function: {
    name: TOOL_NAME,
    description: `Claude's official text editor tool for viewing and modifying files.

**Commands:**
- \`view\`: Read file content or list directory. Supports line ranges via view_range parameter.
- \`str_replace\`: Replace exact string match in file (must match exactly once).
- \`create\`: Create new file with specified content.
- \`insert\`: Insert text at specific line number (0 = beginning).

**Important:**
- All file paths are relative to workspace root
- File contents in view command include line numbers (e.g., "1: first line")
- str_replace requires exact match including whitespace/indentation
- str_replace will fail if string appears 0 or >1 times
- insert_line is 0-indexed (0 = before first line)`,
    parameters: {
      type: 'object',
      required: ['command', 'path'],
      properties: {
        command: {
          type: 'string',
          enum: ['view', 'str_replace', 'create', 'insert'],
          description: 'Command to execute: view, str_replace, create, or insert'
        },
        path: {
          type: 'string',
          description: 'File or directory path (relative to workspace root)'
        },
        view_range: {
          type: 'array',
          items: { type: 'number' },
          description:
            '[view only] Array of [start_line, end_line]. Lines are 1-indexed. Use -1 for end to read to EOF.'
        },
        old_str: {
          type: 'string',
          description:
            '[str_replace only] Exact string to replace (must match exactly once including whitespace)'
        },
        new_str: {
          type: 'string',
          description: '[str_replace/insert only] New text to insert/replace with'
        },
        file_text: {
          type: 'string',
          description: '[create only] Content for new file'
        },
        insert_line: {
          type: 'number',
          description: '[insert only] Line number after which to insert (0 = beginning of file)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  systemMessageDescription: {
    prefix: `To view or edit files, use the ${TOOL_NAME} tool. Examples:`,
    exampleArgs: [
      ['command', 'view'],
      ['path', 'src/index.ts'],
      ['view_range', '[1, 50]']
    ]
  },
  implementation: strReplaceEditorImpl
}
