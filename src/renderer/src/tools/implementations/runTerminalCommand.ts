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
    // 🔧 SPECIAL HANDLING: cd command changes working directory
    const cdMatch = command.match(/^cd\s+(.+)$/i)
    if (cdMatch) {
      const targetDir = cdMatch[1].trim().replace(/['"]/g, '') // Remove quotes

      // Change the persistent working directory
      const setCwdResult = await extras.ide.terminal.setCwd(targetDir)

      if (!setCwdResult.success) {
        throw new Error(setCwdResult.error || 'Failed to change directory')
      }

      // Get new working directory to confirm
      const getCwdResult = await extras.ide.terminal.getCwd()
      const newCwd = getCwdResult.data || targetDir

      const contextItem: ContextItem = {
        name: `Terminal: ${command}`,
        description: `Changed working directory to: ${newCwd}`,
        content: `✅ Directory changed to: ${newCwd}`,
        uri: {
          type: 'terminal',
          value: command
        }
      }

      return [contextItem]
    }

    // Execute normal command via IDE bridge
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
      'Execute a shell command in the terminal. Use this to run build scripts, tests, or other command-line operations. The command runs in the current working directory. SPECIAL: The "cd" command persistently changes the working directory for all future commands.',
    parameters: {
      type: 'object',
      required: ['command'],
      properties: {
        command: {
          type: 'string',
          description:
            'The shell command to execute (e.g. "npm install", "git status", "cd mayin-tarlasi-oyunu"). Use "cd" to change directories.'
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
