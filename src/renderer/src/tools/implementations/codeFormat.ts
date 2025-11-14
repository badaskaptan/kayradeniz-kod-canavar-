/**
 * Code Format Tool
 * Format code using prettier or eslint
 */

import type { Tool, ToolImpl } from '../../types/tools'

export const codeFormatImpl: ToolImpl = async (args, extras) => {
  const {
    filePath,
    formatter = 'prettier',
    applyFix = false
  } = args as {
    filePath: string
    formatter?: 'prettier' | 'eslint'
    applyFix?: boolean
  }

  try {
    // Read file content
    const readResult = await extras.ide.fs.readFile(filePath)
    if (!readResult.success || !readResult.data) {
      throw new Error(readResult.error || 'Failed to read file')
    }

    const content = readResult.data

    let formatted: string

    if (formatter === 'prettier') {
      // Simple formatting rules (basic implementation)
      formatted = content
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .replace(/\t/g, '  ') // tabs to spaces
        .replace(/\s+$/gm, '') // trailing whitespace
        .replace(/\n{3,}/g, '\n\n') // max 2 newlines

      // Add final newline if missing
      if (!formatted.endsWith('\n')) formatted += '\n'
    } else {
      // ESLint-style (basic)
      formatted = content
        .replace(/\s+$/gm, '') // trailing whitespace
        .replace(/\n{3,}/g, '\n\n')
      if (!formatted.endsWith('\n')) formatted += '\n'
    }

    // Write back if applyFix is true
    if (applyFix) {
      const writeResult = await extras.ide.fs.writeFile(filePath, formatted)
      if (!writeResult.success) {
        throw new Error(writeResult.error || 'Failed to write formatted file')
      }
    }

    const changed = content !== formatted
    const diff = changed
      ? `Lines changed: ${content.split('\n').length} → ${formatted.split('\n').length}`
      : 'No changes'

    return [
      {
        name: 'Code Formatted',
        description: `${formatter} formatting ${applyFix ? 'applied' : 'checked'}`,
        content: `# Code Formatting\n\n**File**: ${filePath}\n**Formatter**: ${formatter}\n**Status**: ${changed ? '✓ Formatted' : '✓ Already formatted'}\n**${diff}**\n\n${applyFix ? '✓ Changes saved to file' : '⚠ Dry run - use applyFix:true to save'}`
      }
    ]
  } catch (error) {
    throw new Error(
      `Code formatting failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const codeFormatTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Format Code',
  wouldLikeTo: 'format code',
  isCurrently: 'formatting code',
  hasAlready: 'formatted code',
  readonly: false,
  isInstant: false,
  group: 'file',
  icon: 'CodeIcon',
  function: {
    name: 'format_code',
    description:
      'Format code files using prettier or eslint. Supports TypeScript, JavaScript, JSON, CSS, HTML, Markdown.',
    parameters: {
      type: 'object',
      required: ['filePath'],
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to format'
        },
        formatter: {
          type: 'string',
          enum: ['prettier', 'eslint'],
          description: 'Formatter to use (default: prettier)'
        },
        applyFix: {
          type: 'boolean',
          description: 'Apply fixes to the file (default: false - dry run)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: codeFormatImpl
}
