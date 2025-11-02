/**
 * Claude's Official Bash Tool
 * Execute shell commands in terminal
 * Based on Anthropic's bash tool specification
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'bash'
const TOOL_GROUP = 'built-in'
const MAX_OUTPUT_LENGTH = 10000

/**
 * Implementation
 */
export const bashImpl: ToolImpl = async (args, extras) => {
  const command = getStringArg(args, 'command', true)

  if (!command) {
    throw new Error('command parameter is required')
  }

  try {
    // Execute command via Tool Bridge
    const result = await extras.ide.terminal.exec(command)

    if (!result.success) {
      throw new Error(result.error || 'Command execution failed')
    }

    const { stdout = '', stderr = '', exitCode = 0 } = result.data || {}
    let output = stdout + (stderr ? `\n\nSTDERR:\n${stderr}` : '')

    // Truncate if too long
    let truncated = false
    if (output.length > MAX_OUTPUT_LENGTH) {
      output = output.slice(0, MAX_OUTPUT_LENGTH)
      truncated = true
    }

    const contextItems: ContextItem[] = [
      {
        name: 'Command Output',
        description: `Executed: ${command}`,
        content: output || '(no output)',
        status: exitCode === 0 ? 'Success' : `Exit code: ${exitCode}`
      }
    ]

    if (truncated) {
      contextItems.push({
        name: 'Truncation Warning',
        description: '',
        content: `Output was truncated (showing first ${MAX_OUTPUT_LENGTH} characters)`,
        status: 'Warning'
      })
    }

    return contextItems
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Bash command failed: ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const bashTool: Tool = {
  type: 'function',
  category: 'terminal',
  displayTitle: 'Bash',
  wouldLikeTo: 'run command {{{ command }}}',
  isCurrently: 'running {{{ command }}}',
  hasAlready: 'ran {{{ command }}}',
  readonly: false,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'TerminalIcon',
  function: {
    name: TOOL_NAME,
    description: `Execute bash commands in the terminal.

Use this to:
- Run build commands (npm, yarn, cargo, etc.)
- Execute tests
- Install dependencies
- Run scripts
- Check file system (ls, pwd, cat, etc.)
- Git operations (git status, git diff, etc.)

**Important:**
- Commands run in workspace root directory
- Output is truncated to ${MAX_OUTPUT_LENGTH} characters
- For long-running processes (servers, watch mode), check output later
- Use && to chain commands: "npm install && npm run build"`,
    parameters: {
      type: 'object',
      required: ['command'],
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute (e.g., "npm test", "ls -la", "git status")',
          required: true
        },
        restart: {
          type: 'boolean',
          description: 'Whether to restart the command if already running (default: false)',
          required: false
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To execute terminal commands, use the ${TOOL_NAME} tool. For example:`,
    exampleArgs: [
      ['command', 'npm test'],
      ['restart', 'false']
    ]
  },
  implementation: bashImpl
}
