/**
 * Git Commit Tool
 * Commits staged changes with a message
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg, getBooleanArg } from '../parseArgs'

const TOOL_NAME = 'git_commit'
const TOOL_GROUP = 'git'

export const gitCommitImpl: ToolImpl = async (args, extras) => {
  try {
    const workspaceRoot = process.cwd()
    const message = getStringArg(args, 'message')
    const amend = getBooleanArg(args, 'amend') ?? false
    const allowEmpty = getBooleanArg(args, 'allowEmpty') ?? false

    // Validate message
    if (!message || message.trim().length === 0) {
      return [
        {
          name: 'Git Commit Error',
          description: 'Missing commit message',
          content: '❌ Error: Commit message is required'
        }
      ]
    }

    const result = await extras.ide.git.commit({
      workspaceRoot,
      message,
      amend,
      allowEmpty
    })

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to commit changes')
    }

    // Build success message
    let output = '✓ Commit successful\n\n'
    output += `**Message**: ${message}\n`

    if (amend) {
      output += `**Type**: Amended previous commit\n`
    }

    if (allowEmpty) {
      output += `**Empty**: Allowed empty commit\n`
    }

    output += `\n${result.data}`

    return [
      {
        name: 'Git Commit',
        description: 'Changes committed',
        content: output
      }
    ]
  } catch (error) {
    throw new Error(
      `Failed to commit changes: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitCommitTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Commit',
  wouldLikeTo: 'commit changes',
  isCurrently: 'committing changes',
  hasAlready: 'committed changes',
  readonly: false,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'GitCommitIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Commits staged changes to git repository with a message. Can also amend previous commit or allow empty commits',
    parameters: {
      type: 'object',
      required: ['message'],
      properties: {
        message: {
          type: 'string',
          description: 'Commit message (required)'
        },
        amend: {
          type: 'boolean',
          description: 'Amend the previous commit instead of creating new one (default: false)'
        },
        allowEmpty: {
          type: 'boolean',
          description: 'Allow commit with no changes (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: gitCommitImpl
}
