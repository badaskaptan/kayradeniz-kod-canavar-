/**
 * Read File Tool
 * Reads the contents of a file from the workspace
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'read_file'
const TOOL_GROUP = 'built-in'

/**
 * Tool implementation
 */
export const readFileImpl: ToolImpl = async (args, extras) => {
  let filepath = getStringArg(args, 'filepath')

  // 🔧 Smart filename normalization
  // "readme" → "README.md" (common patterns)
  if (filepath.toLowerCase() === 'readme') {
    filepath = 'README.md'
  } else if (filepath.toLowerCase() === 'license') {
    filepath = 'LICENSE'
  } else if (filepath.toLowerCase() === 'changelog') {
    filepath = 'CHANGELOG.md'
  }

  try {
    // Read file using Tool Bridge API
    const result = await extras.ide.fs.readFile(filepath)

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to read file')
    }

    const contextItem: ContextItem = {
      name: filepath.split(/[\\/]/).pop() || filepath,
      description: filepath,
      content: result.data,
      uri: {
        type: 'file',
        value: filepath
      }
    }

    return [contextItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read file "${filepath}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const readFileTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Read File',
  wouldLikeTo: 'read {{{ filepath }}}',
  isCurrently: 'reading {{{ filepath }}}',
  hasAlready: 'read {{{ filepath }}}',
  readonly: true,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'DocumentIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Read the contents of an existing file from the workspace. Use this when you need to view or analyze file contents.',
    parameters: {
      type: 'object',
      required: ['filepath'],
      properties: {
        filepath: {
          type: 'string',
          description:
            'The path of the file to read, relative to the workspace root (NOT absolute path or URI)',
          required: true
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To read a file with a known filepath, use the ${TOOL_NAME} tool. For example, to read a file located at 'src/utils/helper.ts', you would respond with:`,
    exampleArgs: [['filepath', 'src/utils/helper.ts']]
  },
  implementation: readFileImpl
}
