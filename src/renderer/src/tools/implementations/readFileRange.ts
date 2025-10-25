/**
 * Read File Range Tool
 * Reads specific line ranges from a file
 * Based on Continue.dev's readRangeInFile
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg, getNumberArg } from '../parseArgs'

const TOOL_NAME = 'read_file_range'
const TOOL_GROUP = 'built-in'
const MAX_RANGE_LINES = 500

/**
 * Implementation
 */
export const readFileRangeImpl: ToolImpl = async (args, extras) => {
  // Parse arguments
  const filepath = getStringArg(args, 'filepath')
  const startLine = getNumberArg(args, 'start_line')
  const endLine = getNumberArg(args, 'end_line')

  if (!filepath) {
    throw new Error('filepath argument is required')
  }

  if (startLine === undefined || endLine === undefined) {
    throw new Error('start_line and end_line arguments are required')
  }

  // Validate line numbers
  if (startLine < 1) {
    throw new Error(`start_line must be >= 1 (got ${startLine}). Line numbers are 1-based.`)
  }

  if (endLine < startLine) {
    throw new Error(`end_line (${endLine}) must be >= start_line (${startLine})`)
  }

  const rangeSize = endLine - startLine + 1
  if (rangeSize > MAX_RANGE_LINES) {
    throw new Error(
      `Requested range is too large (${rangeSize} lines). Maximum allowed is ${MAX_RANGE_LINES} lines. Consider breaking your request into smaller ranges.`
    )
  }

  try {
    // Read full file first
    const result = await extras.ide.fs.readFile(filepath)
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to read file')
    }

    const fileContent = result.data
    const lines = fileContent.split('\n')
    const totalLines = lines.length

    // Check if range is valid for this file
    if (startLine > totalLines) {
      throw new Error(
        `start_line (${startLine}) exceeds file length. File '${filepath}' has ${totalLines} lines.`
      )
    }

    // Adjust endLine if it exceeds file length
    const actualEndLine = Math.min(endLine, totalLines)

    // Extract range (convert to 0-based indexing)
    const rangeLines = lines.slice(startLine - 1, actualEndLine)
    const rangeContent = rangeLines.join('\n')

    const contextItem: ContextItem = {
      name: `${filepath} (lines ${startLine}-${actualEndLine})`,
      description: `Lines ${startLine} to ${actualEndLine} of ${filepath}`,
      content: rangeContent,
      uri: {
        type: 'file',
        value: filepath
      }
    }

    return [contextItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to read file range '${filepath}' (lines ${startLine}-${endLine}): ${errorMessage}`
    )
  }
}

/**
 * Tool definition
 */
export const readFileRangeTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Read File Range',
  wouldLikeTo: 'read lines {{{ start_line }}}-{{{ end_line }}} of {{{ filepath }}}',
  isCurrently: 'reading lines {{{ start_line }}}-{{{ end_line }}} of {{{ filepath }}}',
  hasAlready: 'read lines {{{ start_line }}}-{{{ end_line }}} of {{{ filepath }}}',
  readonly: true,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'DocumentIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Read a specific range of lines from a file in the workspace. Use this when you need to read a large file in chunks or focus on specific sections. Line numbers are 1-based (first line is line 1).',
    parameters: {
      type: 'object',
      required: ['filepath', 'start_line', 'end_line'],
      properties: {
        filepath: {
          type: 'string',
          description:
            'The path to the file relative to the workspace root (e.g. "src/components/Header.tsx")'
        },
        start_line: {
          type: 'number',
          description: 'The starting line number (1-based, inclusive). Must be >= 1.'
        },
        end_line: {
          type: 'number',
          description:
            'The ending line number (1-based, inclusive). Must be >= start_line. To read a single line, use start_line === end_line.'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To read a specific range of lines from a file, use the ${TOOL_NAME} tool. For example, to read lines 10-20 from 'src/utils/helper.ts', you would respond with:`,
    exampleArgs: [
      ['filepath', 'src/utils/helper.ts'],
      ['start_line', '10'],
      ['end_line', '20']
    ]
  },
  implementation: readFileRangeImpl
}
