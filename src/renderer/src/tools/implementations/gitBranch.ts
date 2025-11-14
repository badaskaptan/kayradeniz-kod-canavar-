/**
 * Advanced Git Operations - Branch Management
 * Create, switch, merge, delete branches
 */

import type { Tool, ToolImpl } from '../../types/tools'

// Git Branch Create Tool
export const gitBranchCreateImpl: ToolImpl = async (args, extras) => {
  const { branchName, startPoint } = args as {
    branchName: string
    startPoint?: string
  }

  try {
    const command = startPoint
      ? `git branch ${branchName} ${startPoint}`
      : `git branch ${branchName}`

    const result = await extras.ide.terminal.exec(command)
    if (!result.success) {
      throw new Error(result.error || 'Branch creation failed')
    }

    return [
      {
        name: 'Branch Created',
        description: `Created branch ${branchName}`,
        content: `# Git Branch Created\n\n**Branch**: ${branchName}\n${startPoint ? `**From**: ${startPoint}\n` : ''}**Status**: ✓ Created\n\nUse git_branch_switch to switch to this branch.`
      }
    ]
  } catch (error) {
    throw new Error(
      `Git branch create failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitBranchCreateTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Branch Create',
  wouldLikeTo: 'create git branch',
  isCurrently: 'creating git branch',
  hasAlready: 'created git branch',
  readonly: false,
  isInstant: false,
  group: 'git',
  icon: 'GitBranchIcon',
  function: {
    name: 'git_branch_create',
    description: 'Create a new git branch.',
    parameters: {
      type: 'object',
      required: ['branchName'],
      properties: {
        branchName: {
          type: 'string',
          description: 'Name for the new branch'
        },
        startPoint: {
          type: 'string',
          description: 'Optional starting point (commit/branch/tag)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: gitBranchCreateImpl
}

// Git Branch Switch Tool
export const gitBranchSwitchImpl: ToolImpl = async (args, extras) => {
  const { branchName, createIfMissing = false } = args as {
    branchName: string
    createIfMissing?: boolean
  }

  try {
    const command = createIfMissing
      ? `git checkout -b ${branchName}`
      : `git checkout ${branchName}`

    const result = await extras.ide.terminal.exec(command)
    if (!result.success) {
      throw new Error(result.error || 'Branch switch failed')
    }

    return [
      {
        name: 'Branch Switched',
        description: `Switched to ${branchName}`,
        content: `# Git Branch Switch\n\n**Branch**: ${branchName}\n**Status**: ✓ Switched\n\n${result.data?.stdout || ''}`
      }
    ]
  } catch (error) {
    throw new Error(
      `Git branch switch failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitBranchSwitchTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Branch Switch',
  wouldLikeTo: 'switch git branch',
  isCurrently: 'switching git branch',
  hasAlready: 'switched git branch',
  readonly: false,
  isInstant: false,
  group: 'git',
  icon: 'GitBranchIcon',
  function: {
    name: 'git_branch_switch',
    description: 'Switch to a different git branch.',
    parameters: {
      type: 'object',
      required: ['branchName'],
      properties: {
        branchName: {
          type: 'string',
          description: 'Branch name to switch to'
        },
        createIfMissing: {
          type: 'boolean',
          description: 'Create branch if it does not exist (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: gitBranchSwitchImpl
}

// Git Branch List Tool
export const gitBranchListImpl: ToolImpl = async (args, extras) => {
  const { includeRemote = false } = args as {
    includeRemote?: boolean
  }

  try {
    const command = includeRemote ? 'git branch -a' : 'git branch'
    const result = await extras.ide.terminal.exec(command)

    if (!result.success) {
      throw new Error(result.error || 'Branch list failed')
    }

    const output = result.data?.stdout || ''
    const branches = output
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const current = line.startsWith('*')
        const name = line.replace('*', '').trim()
        return { name, current }
      })

    const content = branches
      .map((b) => `${b.current ? '**→ ' : '  '}${b.name}${b.current ? '** (current)' : ''}`)
      .join('\n')

    return [
      {
        name: 'Git Branches',
        description: `${branches.length} branch(es)`,
        content: `# Git Branches\n\n**Count**: ${branches.length}\n${includeRemote ? '**Including Remote**\n' : ''}\n${content}`
      }
    ]
  } catch (error) {
    throw new Error(
      `Git branch list failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitBranchListTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Branch List',
  wouldLikeTo: 'list git branches',
  isCurrently: 'listing git branches',
  hasAlready: 'listed git branches',
  readonly: true,
  isInstant: true,
  group: 'git',
  icon: 'GitBranchIcon',
  function: {
    name: 'git_branch_list',
    description: 'List all git branches.',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        includeRemote: {
          type: 'boolean',
          description: 'Include remote branches (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: gitBranchListImpl
}

// Git Merge Tool
export const gitMergeImpl: ToolImpl = async (args, extras) => {
  const { sourceBranch, noFastForward = false, commitMessage } = args as {
    sourceBranch: string
    noFastForward?: boolean
    commitMessage?: string
  }

  try {
    let command = `git merge ${sourceBranch}`
    if (noFastForward) command += ' --no-ff'
    if (commitMessage) command += ` -m "${commitMessage}"`

    const result = await extras.ide.terminal.exec(command)
    if (!result.success) {
      throw new Error(result.error || 'Merge failed')
    }

    return [
      {
        name: 'Git Merge',
        description: `Merged ${sourceBranch}`,
        content: `# Git Merge\n\n**Source Branch**: ${sourceBranch}\n**Fast-Forward**: ${noFastForward ? 'Disabled' : 'Enabled'}\n**Status**: ✓ Merged\n\n${result.data?.stdout || ''}`
      }
    ]
  } catch (error) {
    throw new Error(`Git merge failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const gitMergeTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Merge',
  wouldLikeTo: 'merge git branch',
  isCurrently: 'merging git branch',
  hasAlready: 'merged git branch',
  readonly: false,
  isInstant: false,
  group: 'git',
  icon: 'GitMergeIcon',
  function: {
    name: 'git_merge',
    description: 'Merge a branch into the current branch.',
    parameters: {
      type: 'object',
      required: ['sourceBranch'],
      properties: {
        sourceBranch: {
          type: 'string',
          description: 'Branch to merge from'
        },
        noFastForward: {
          type: 'boolean',
          description: 'Disable fast-forward merge (default: false)'
        },
        commitMessage: {
          type: 'string',
          description: 'Optional merge commit message'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: gitMergeImpl
}

// Git Branch Delete Tool
export const gitBranchDeleteImpl: ToolImpl = async (args, extras) => {
  const { branchName, force = false } = args as {
    branchName: string
    force?: boolean
  }

  try {
    const command = force ? `git branch -D ${branchName}` : `git branch -d ${branchName}`

    const result = await extras.ide.terminal.exec(command)
    if (!result.success) {
      throw new Error(result.error || 'Branch delete failed')
    }

    return [
      {
        name: 'Branch Deleted',
        description: `Deleted ${branchName}`,
        content: `# Git Branch Delete\n\n**Branch**: ${branchName}\n**Force**: ${force ? 'Yes' : 'No'}\n**Status**: ✓ Deleted`
      }
    ]
  } catch (error) {
    throw new Error(
      `Git branch delete failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const gitBranchDeleteTool: Tool = {
  type: 'function',
  category: 'git',
  displayTitle: 'Git Branch Delete',
  wouldLikeTo: 'delete git branch',
  isCurrently: 'deleting git branch',
  hasAlready: 'deleted git branch',
  readonly: false,
  isInstant: false,
  group: 'git',
  icon: 'GitBranchIcon',
  function: {
    name: 'git_branch_delete',
    description: 'Delete a git branch.',
    parameters: {
      type: 'object',
      required: ['branchName'],
      properties: {
        branchName: {
          type: 'string',
          description: 'Branch name to delete'
        },
        force: {
          type: 'boolean',
          description: 'Force delete even if not merged (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: gitBranchDeleteImpl
}
