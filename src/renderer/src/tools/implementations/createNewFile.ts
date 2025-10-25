/**
 * Create New File Tool
 * Creates a new file with specified contents
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'create_new_file'
const TOOL_GROUP = 'built-in'

/**
 * Tool implementation
 */
export const createNewFileImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, 'filepath')
  const contents = getStringArg(args, 'contents', true) // Allow empty content

  try {
    // Check if file already exists
    const exists = await extras.ide.fs.exists(filepath)
    if (exists.success && exists.data) {
      throw new Error(
        `File "${filepath}" already exists. Use the edit_file tool to modify existing files.`
      )
    }

    // Write the new file
    const result = await extras.ide.fs.writeFile(filepath, contents)

    if (!result.success) {
      throw new Error(result.error || 'Failed to create file')
    }

    // Note: File opening in editor not implemented in ToolBridge yet

    const contextItem: ContextItem = {
      name: filepath.split(/[\\/]/).pop() || filepath,
      description: filepath,
      content: 'File created successfully',
      status: 'Created',
      uri: {
        type: 'file',
        value: filepath
      }
    }

    return [contextItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create file "${filepath}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const createNewFileTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Create New File',
  wouldLikeTo: 'create {{{ filepath }}}',
  isCurrently: 'creating {{{ filepath }}}',
  hasAlready: 'created {{{ filepath }}}',
  readonly: false,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'DocumentPlusIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Create a new file with specified contents. Only use this when a file does NOT exist. If the file exists, use edit_file instead.',
    parameters: {
      type: 'object',
      required: ['filepath', 'contents'],
      properties: {
        filepath: {
          type: 'string',
          description:
            'The path where the new file should be created, relative to the workspace root',
          required: true
        },
        contents: {
          type: 'string',
          description: 'The contents to write to the new file',
          required: true
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  systemMessageDescription: {
    prefix: `To create a NEW file, use the ${TOOL_NAME} tool with the filepath and contents. For example:`,
    exampleArgs: [
      ['filepath', 'src/components/Button.tsx'],
      ['contents', 'export default function Button() { return <button>Click</button> }']
    ]
  },
  implementation: createNewFileImpl
}
