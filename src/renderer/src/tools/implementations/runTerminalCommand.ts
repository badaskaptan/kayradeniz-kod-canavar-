/**
 * Run Terminal Command Tool
 * Executes shell commands with streaming output
 * Based on Continue.dev's runTerminalCommand
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'run_terminal_command'
const TOOL_GROUP = 'built-in'

/**
 * Implementation
 */
export const runTerminalCommandImpl: ToolImpl = async (args, extras) => {
  const command = getStringArg(args, 'command')

  if (!command) {
    throw new Error('command argument is required')
  }

  try {
    // Execute command via IDE bridge (using exec for now)
    const result = await extras.ide.terminal.exec(command)

    if (!result.success) {
      throw new Error(result.error || 'Command execution failed')
    }

    const output = [result.data?.stdout || '', result.data?.stderr || ''].filter(Boolean).join('\n')

    const contextItem: ContextItem = {
      name: `Terminal: ${command}`,
      description: `Output from running terminal command: ${command}`,
      content: output,
      uri: {
        type: 'terminal',
        value: command
      }
    }

    return [contextItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to execute terminal command "${command}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const runTerminalCommandTool: Tool = {
  type: 'function',
  category: 'terminal',
  displayTitle: 'Run Terminal Command',
  wouldLikeTo: 'run terminal command: {{{ command }}}',
  isCurrently: 'running terminal command: {{{ command }}}',
  hasAlready: 'ran terminal command: {{{ command }}}',
  readonly: false,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'TerminalIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Execute a shell command in the terminal. Use this to run build scripts, tests, or other command-line operations. The command runs in the workspace root directory.',
    parameters: {
      type: 'object',
      required: ['command'],
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute (e.g. "npm install", "git status")'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To run a terminal command, use the ${TOOL_NAME} tool. For example, to run 'npm install', you would respond with:`,
    exampleArgs: [['command', 'npm install']]
  },
  implementation: runTerminalCommandImpl
}
