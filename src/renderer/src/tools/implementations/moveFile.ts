/**
 * Move/Rename File Tool
 * Moves or renames a file in the workspace
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'move_file'
const TOOL_GROUP = 'built-in'

function resolvePath(path?: string): string {
  if (!path || path === '.') return ''
  if (path.startsWith('./')) return path.slice(2)
  if (path.startsWith('.\\')) return path.slice(2)
  return path.replace(/\\/g, '/')
}

export const moveFileImpl: ToolImpl = async (args, extras) => {
  const sourcePath = resolvePath(getStringArg(args, 'source', true))
  const destPath = resolvePath(getStringArg(args, 'destination', true))

  if (!sourcePath || !destPath) {
    throw new Error('Both source and destination paths are required')
  }

  try {
    const result = await extras.ide.fs.moveFile(sourcePath, destPath)

    if (!result.success) {
      throw new Error(result.error || 'Failed to move file')
    }

    return [
      {
        name: 'File Moved',
        description: `Moved: ${sourcePath} → ${destPath}`,
        content: `Successfully moved "${sourcePath}" to "${destPath}"`,
        status: 'Success'
      }
    ]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to move "${sourcePath}" to "${destPath}": ${errorMessage}`)
  }
}

export const moveFileTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Move/Rename File',
  wouldLikeTo: 'move {{{ source }}} to {{{ destination }}}',
  isCurrently: 'moving {{{ source }}}',
  hasAlready: 'moved {{{ source }}}',
  readonly: false,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'ArrowRightIcon',
  function: {
    name: TOOL_NAME,
    description: `Move or rename a file in the workspace.

Can be used for:
- Renaming: move_file("old.js", "new.js")
- Moving: move_file("src/old.js", "lib/new.js")
- Both: move_file("old.js", "new-folder/new-name.js")`,
    parameters: {
      type: 'object',
      required: ['source', 'destination'],
      properties: {
        source: {
          type: 'string',
          description: 'Current file path (relative to workspace root)',
          required: true
        },
        destination: {
          type: 'string',
          description: 'New file path (relative to workspace root)',
          required: true
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To move or rename files, use the ${TOOL_NAME} tool.`,
    exampleArgs: [
      ['source', 'old.js'],
      ['destination', 'new.js']
    ]
  },
  implementation: moveFileImpl
}
