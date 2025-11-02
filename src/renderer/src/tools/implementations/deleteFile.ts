/**
 * Delete File Tool
 * Deletes a file from the workspace
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'delete_file'
const TOOL_GROUP = 'built-in'

function resolvePath(path?: string): string {
  if (!path || path === '.') return ''
  if (path.startsWith('./')) return path.slice(2)
  if (path.startsWith('.\\')) return path.slice(2)
  return path.replace(/\\/g, '/')
}

export const deleteFileImpl: ToolImpl = async (args, extras) => {
  const filePath = resolvePath(getStringArg(args, 'path', true))

  if (!filePath) {
    throw new Error('File path is required')
  }

  try {
    const result = await extras.ide.fs.deleteFile(filePath)

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete file')
    }

    return [
      {
        name: 'File Deleted',
        description: `Deleted file: ${filePath}`,
        content: `Successfully deleted: ${filePath}`,
        status: 'Success'
      }
    ]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to delete "${filePath}": ${errorMessage}`)
  }
}

export const deleteFileTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Delete File',
  wouldLikeTo: 'delete {{{ path }}}',
  isCurrently: 'deleting {{{ path }}}',
  hasAlready: 'deleted {{{ path }}}',
  readonly: false,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'TrashIcon',
  function: {
    name: TOOL_NAME,
    description: 'Delete a file from the workspace. Use with caution - deletion is permanent.',
    parameters: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'File path to delete (relative to workspace root)',
          required: true
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To delete files, use the ${TOOL_NAME} tool.`,
    exampleArgs: [['path', 'old-file.js']]
  },
  implementation: deleteFileImpl
}
