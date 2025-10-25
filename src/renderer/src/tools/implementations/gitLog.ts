/**
 * Git Log Tool
 * Shows commit history with various format options
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg, getNumberArg, getBooleanArg } from '../parseArgs'

const TOOL_NAME = 'git_log'
const TOOL_GROUP = 'git'

export const gitLogImpl: ToolImpl = async (args, extras) => {
  try {
    const workspaceRoot = process.cwd()
    const maxCount = getNumberArg(args, 'maxCount') ?? 10
    const oneline = getBooleanArg(args, 'oneline') ?? false
    const graph = getBooleanArg(args, 'graph') ?? false
    const stat = getBooleanArg(args, 'stat') ?? false
    const file = getStringArg(args, 'file')

    const result = await extras.ide.git.log({
      workspaceRoot,
      maxCount,
      oneline,
      graph,
      stat,
      file
    })

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get git log')
    }

    const log = result.data

    // Check if log is empty
    if (!log || log.trim().length === 0) {
      return [
        {
          name: 'Git Log',
          description: 'No commits found',
          content: '✨ No commits found'
        }
      ]
    }

    // Build description
    let description = `Last ${maxCount} commit${maxCount !== 1 ? 's' : ''}`
    if (file) {
      description += ` for ${file}`
    }

    return [
      {
        name: 'Git Log',
        description,
        content: log
      }
    ]
  } catch (error) {
    throw new Error(
      `Failed to get git log: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitLogTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Log',
  wouldLikeTo: 'show git log',
  isCurrently: 'showing git log',
  hasAlready: 'showed git log',
  readonly: true,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'GitCommitIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Shows git commit history with various format options. Can show commits for the entire repository or a specific file',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        maxCount: {
          type: 'number',
          description: 'Maximum number of commits to show (default: 10)'
        },
        oneline: {
          type: 'boolean',
          description: 'Show each commit on a single line (default: false)'
        },
        graph: {
          type: 'boolean',
          description: 'Show text-based graph of branches (default: false)'
        },
        stat: {
          type: 'boolean',
          description: 'Show file statistics (default: false)'
        },
        file: {
          type: 'string',
          description: 'Show commits for a specific file'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  implementation: gitLogImpl
}
