/**
 * Create Directory Tool
 * Creates a new directory in the workspace
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'create_directory'
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
  return path.replace(/\\/g, '/')
}

/**
 * Implementation
 */
export const createDirectoryImpl: ToolImpl = async (args, extras) => {
  const dirPath = resolvePath(getStringArg(args, 'path', true))

  if (!dirPath) {
    throw new Error('Directory path is required')
  }

  try {
    // Create directory using Tool Bridge
    const result = await extras.ide.fs.createDirectory(dirPath)

    if (!result.success) {
      throw new Error(result.error || 'Failed to create directory')
    }

    return [
      {
        name: 'Directory Created',
        description: `Created directory: ${dirPath}`,
        content: `Successfully created directory: ${dirPath}`,
        status: 'Success'
      }
    ]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create directory "${dirPath}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const createDirectoryTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Create Directory',
  wouldLikeTo: 'create directory {{{ path }}}',
  isCurrently: 'creating directory {{{ path }}}',
  hasAlready: 'created directory {{{ path }}}',
  readonly: false,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'FolderPlusIcon',
  function: {
    name: TOOL_NAME,
    description: `Create a new directory in the workspace.

Creates all parent directories if they don't exist (like mkdir -p).

Example:
- create_directory(path="src/components/NewFeature")
- create_directory(path="tests/unit")`,
    parameters: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to create (relative to workspace root)',
          required: true
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To create directories, use the ${TOOL_NAME} tool. For example:`,
    exampleArgs: [['path', 'src/new-feature']]
  },
  implementation: createDirectoryImpl
}
