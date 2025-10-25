/**
 * Git Status Tool
 * Shows the current status of a git repository
 */

import type { Tool, ToolImpl } from '../../types/tools'

const TOOL_NAME = 'git_status'
const TOOL_GROUP = 'git'

export const gitStatusImpl: ToolImpl = async (_args, extras) => {
  try {
    const workspaceRoot = process.cwd()
    const result = await extras.ide.git.status(workspaceRoot)

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get git status')
    }

    const status = result.data
    let output = `# Git Status\n\n**Branch**: ${status.branch}\n`

    if (status.ahead > 0 || status.behind > 0) {
      output += `**Sync**: `
      if (status.ahead > 0) output += `↑${status.ahead} ahead `
      if (status.behind > 0) output += `↓${status.behind} behind`
      output += `\n`
    }

    output += `\n`

    if (status.staged.length > 0) {
      output += `## Staged Changes (${status.staged.length})\n`
      status.staged.forEach((file) => (output += `- ✓ ${file}\n`))
      output += `\n`
    }

    if (status.modified.length > 0) {
      output += `## Modified Files (${status.modified.length})\n`
      status.modified.forEach((file) => (output += `- M ${file}\n`))
      output += `\n`
    }

    if (status.untracked.length > 0) {
      output += `## Untracked Files (${status.untracked.length})\n`
      status.untracked.forEach((file) => (output += `- ? ${file}\n`))
      output += `\n`
    }

    if (
      status.staged.length === 0 &&
      status.modified.length === 0 &&
      status.untracked.length === 0
    ) {
      output += `✨ Working tree clean\n`
    }

    return [
      {
        name: 'Git Status',
        description: `Repository status on branch ${status.branch}`,
        content: output
      }
    ]
  } catch (error) {
    throw new Error(
      `Failed to get git status: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitStatusTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Status',
  wouldLikeTo: 'get git status',
  isCurrently: 'getting git status',
  hasAlready: 'got git status',
  readonly: true,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'GitBranchIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Shows the current git repository status including branch, staged files, modified files, and untracked files',
    parameters: {
      type: 'object',
      required: [],
      properties: {}
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  implementation: gitStatusImpl
}
