/**
 * Change Directory Tool
 * Changes the working directory for all future terminal commands
 * Provides a persistent cd functionality across tool calls
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'change_directory'
const TOOL_GROUP = 'built-in'

/**
 * Implementation
 */
export const changeDirectoryImpl: ToolImpl = async (args, extras) => {
  const path = getStringArg(args, 'path')

  if (!path) {
    throw new Error('path argument is required')
  }

  try {
    // Change the persistent working directory
    const result = await extras.ide.terminal.setCwd(path)

    if (!result.success) {
      throw new Error(result.error || 'Failed to change directory')
    }

    // Get new working directory to confirm
    const getCwdResult = await extras.ide.terminal.getCwd()
    const newCwd = getCwdResult.data || path

    const contextItem: ContextItem = {
      name: `Change Directory`,
      description: `Changed working directory to: ${newCwd}`,
      content: `✅ Working directory changed to:\n${newCwd}\n\nAll future terminal commands will run in this directory.`,
      uri: {
        type: 'terminal',
        value: `cd ${path}`
      }
    }

    return [contextItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to change directory to "${path}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const changeDirectoryTool: Tool = {
  type: 'function',
  category: 'terminal',
  displayTitle: 'Change Directory',
  wouldLikeTo: 'change working directory to: {{{ path }}}',
  isCurrently: 'changing working directory to: {{{ path }}}',
  hasAlready: 'changed working directory to: {{{ path }}}',
  readonly: false,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'FolderOpenIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Change the current working directory for all future terminal commands. This is a persistent change that affects all subsequent terminal operations. Use this instead of "cd" command when you need to work in a different directory.',
    parameters: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description:
            'The directory path to change to. Can be absolute (e.g., "C:\\Users\\username\\project") or relative (e.g., "src", "../other-folder", "subfolder/nested")'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To change the working directory, use the ${TOOL_NAME} tool. For example, to change to the "src" folder, you would respond with:`,
    exampleArgs: [['path', 'src']]
  },
  implementation: changeDirectoryImpl
}
