/**
 * Git Diff Tool
 * Shows file changes in unified diff format
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg, getBooleanArg, getNumberArg } from '../parseArgs'

const TOOL_NAME = 'git_diff'
const TOOL_GROUP = 'git'
const MAX_DIFF_SIZE = 50000 // 50KB max diff size

export const gitDiffImpl: ToolImpl = async (args, extras) => {
  try {
    const workspaceRoot = process.cwd()
    const file = getStringArg(args, 'file')
    const staged = getBooleanArg(args, 'staged') ?? false
    const fromCommit = getStringArg(args, 'fromCommit')
    const toCommit = getStringArg(args, 'toCommit')
    const contextLines = getNumberArg(args, 'contextLines') ?? 3

    const result = await extras.ide.git.diff({
      workspaceRoot,
      file,
      staged,
      fromCommit,
      toCommit,
      contextLines
    })

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get git diff')
    }

    let diff = result.data

    // Check if diff is empty
    if (!diff || diff.trim().length === 0) {
      return [
        {
          name: 'Git Diff',
          description: 'No changes to show',
          content: '✨ No changes found'
        }
      ]
    }

    // Truncate if too large
    let truncated = false
    if (diff.length > MAX_DIFF_SIZE) {
      diff = diff.substring(0, MAX_DIFF_SIZE)
      truncated = true
    }

    // Add header
    let output = '```diff\n'
    output += diff
    output += '\n```'

    if (truncated) {
      output += `\n\n⚠️ Diff truncated at ${MAX_DIFF_SIZE} characters`
    }

    // Build description
    let description = 'Git diff'
    if (file) {
      description += ` for ${file}`
    }
    if (staged) {
      description += ' (staged changes)'
    } else if (fromCommit || toCommit) {
      description += ` from ${fromCommit || 'HEAD'} to ${toCommit || 'working tree'}`
    } else {
      description += ' (unstaged changes)'
    }

    return [
      {
        name: 'Git Diff',
        description,
        content: output
      }
    ]
  } catch (error) {
    throw new Error(
      `Failed to get git diff: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitDiffTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Diff',
  wouldLikeTo: 'show git diff',
  isCurrently: 'showing git diff',
  hasAlready: 'showed git diff',
  readonly: true,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'GitCompareIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Shows git diff for file changes in unified diff format. Can show staged changes, unstaged changes, or changes between commits',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        file: {
          type: 'string',
          description: 'Specific file to show diff for'
        },
        staged: {
          type: 'boolean',
          description: 'Show staged changes instead of unstaged (default: false)'
        },
        fromCommit: {
          type: 'string',
          description: 'Show changes from this commit (e.g., HEAD~1)'
        },
        toCommit: {
          type: 'string',
          description: 'Show changes to this commit (e.g., HEAD)'
        },
        contextLines: {
          type: 'number',
          description: 'Number of context lines around changes (default: 3)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: gitDiffImpl
}
