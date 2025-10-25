/**
 * Git Add Tool
 * Stages files for commit
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getArrayArg, getBooleanArg } from '../parseArgs'

const TOOL_NAME = 'git_add'
const TOOL_GROUP = 'git'

export const gitAddImpl: ToolImpl = async (args, extras) => {
  try {
    const workspaceRoot = process.cwd()
    const files = getArrayArg(args, 'files')
    const all = getBooleanArg(args, 'all') ?? false
    const update = getBooleanArg(args, 'update') ?? false

    // Validate: must specify either files, all, or update
    if (!files && !all && !update) {
      return [
        {
          name: 'Git Add Error',
          description: 'Missing required parameter',
          content: '❌ Error: Must specify either "files" array, "all": true, or "update": true'
        }
      ]
    }

    const result = await extras.ide.git.add({
      workspaceRoot,
      files,
      all,
      update
    })

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to stage files')
    }

    // Build success message
    let message = '✓ Files staged successfully\n\n'
    if (all) {
      message += 'Staged: All modified and untracked files'
    } else if (update) {
      message += 'Staged: All tracked files'
    } else if (files && files.length > 0) {
      message += `Staged ${files.length} file(s):\n`
      files.forEach((file) => {
        message += `- ${file}\n`
      })
    }

    if (result.data) {
      message += `\n${result.data}`
    }

    return [
      {
        name: 'Git Add',
        description: 'Files staged for commit',
        content: message
      }
    ]
  } catch (error) {
    throw new Error(
      `Failed to stage files: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitAddTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Add',
  wouldLikeTo: 'stage files',
  isCurrently: 'staging files',
  hasAlready: 'staged files',
  readonly: false,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'GitPullRequestIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Stages files for git commit. Can stage specific files, all modified files, or all tracked files',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            description: 'File path to stage'
          },
          description: 'Array of file paths to stage'
        },
        all: {
          type: 'boolean',
          description: 'Stage all modified and untracked files (git add --all)'
        },
        update: {
          type: 'boolean',
          description: 'Stage all tracked files (git add --update)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: gitAddImpl
}
