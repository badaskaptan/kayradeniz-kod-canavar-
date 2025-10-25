/**
 * Tool Argument Parsing Utilities
 * Based on Continue.dev's parseArgs.ts
 */

import { ToolArgumentError } from '../types/tools'

/**
 * Parse tool call arguments from JSON string
 */
export function safeParseToolCallArgs(argumentsJson: string): Record<string, any> {
  try {
    return JSON.parse(argumentsJson?.trim() || '{}')
  } catch (e) {
    console.error('[parseArgs] Failed to parse tool call arguments:', argumentsJson)
    return {}
  }
}

/**
 * Get required string argument
 */
export function getStringArg(args: any, argName: string, allowEmpty = false): string {
  if (!args || !(argName in args) || typeof args[argName] !== 'string') {
    throw new ToolArgumentError(
      argName,
      'string',
      args?.[argName],
      `Argument \`${argName}\` is required${allowEmpty ? '' : ' and must not be empty or whitespace-only'} (type: string)`
    )
  }

  const value = args[argName]

  if (!allowEmpty && !value.trim()) {
    throw new ToolArgumentError(
      argName,
      'non-empty string',
      value,
      `Argument \`${argName}\` must not be empty or whitespace-only`
    )
  }

  return value
}

/**
 * Get optional string argument
 */
export function getOptionalStringArg(
  args: any,
  argName: string,
  allowEmpty = false
): string | undefined {
  if (typeof args?.[argName] === 'undefined') {
    return undefined
  }
  return getStringArg(args, argName, allowEmpty)
}

/**
 * Get required number argument (supports string → number conversion)
 */
export function getNumberArg(args: any, argName: string): number {
  if (!args || !(argName in args)) {
    throw new ToolArgumentError(
      argName,
      'number',
      undefined,
      `Argument \`${argName}\` is required (type: number)`
    )
  }

  const value = args[argName]

  // Try to parse string as number
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) {
      throw new ToolArgumentError(
        argName,
        'number',
        value,
        `Argument \`${argName}\` must be a valid number`
      )
    }
    return parsed
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new ToolArgumentError(
      argName,
      'number',
      value,
      `Argument \`${argName}\` must be a valid number`
    )
  }

  return Math.floor(value) // Ensure integer
}

/**
 * Get optional number argument
 */
export function getOptionalNumberArg(args: any, argName: string): number | undefined {
  if (typeof args?.[argName] === 'undefined') {
    return undefined
  }
  return getNumberArg(args, argName)
}

/**
 * Get boolean argument (supports string "true"/"false" conversion)
 */
export function getBooleanArg(args: any, argName: string, required = false): boolean | undefined {
  if (!args || !(argName in args)) {
    if (required) {
      throw new ToolArgumentError(
        argName,
        'boolean',
        undefined,
        `Argument \`${argName}\` is required (type: boolean)`
      )
    }
    return undefined
  }

  const value = args[argName]

  // Handle string "true"/"false"
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'false') return false
    if (lower === 'true') return true

    throw new ToolArgumentError(
      argName,
      'boolean',
      value,
      `Argument \`${argName}\` must be a boolean (true or false)`
    )
  }

  if (typeof value !== 'boolean') {
    throw new ToolArgumentError(
      argName,
      'boolean',
      value,
      `Argument \`${argName}\` must be a boolean (true or false)`
    )
  }

  return value
}

/**
 * Get array argument
 */
export function getArrayArg<T = any>(
  args: any,
  argName: string,
  required = false
): T[] | undefined {
  if (!args || !(argName in args)) {
    if (required) {
      throw new ToolArgumentError(
        argName,
        'array',
        undefined,
        `Argument \`${argName}\` is required (type: array)`
      )
    }
    return undefined
  }

  const value = args[argName]

  if (!Array.isArray(value)) {
    throw new ToolArgumentError(argName, 'array', value, `Argument \`${argName}\` must be an array`)
  }

  return value as T[]
}

/**
 * Get object argument
 */
export function getObjectArg<T = Record<string, any>>(
  args: any,
  argName: string,
  required = false
): T | undefined {
  if (!args || !(argName in args)) {
    if (required) {
      throw new ToolArgumentError(
        argName,
        'object',
        undefined,
        `Argument \`${argName}\` is required (type: object)`
      )
    }
    return undefined
  }

  const value = args[argName]

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ToolArgumentError(
      argName,
      'object',
      value,
      `Argument \`${argName}\` must be an object`
    )
  }

  return value as T
}

/**
 * Interpolate variables in template string
 * Example: "edit {{{ filepath }}}" with args.filepath = "test.ts" → "edit test.ts"
 */
export function interpolateTemplate(template: string, args: Record<string, any>): string {
  return template.replace(/\{\{\{\s*(\w+)\s*\}\}\}/g, (_, key) => {
    return args[key]?.toString() || `{{{ ${key} }}}`
  })
}

/**
 * Validate all required arguments are present
 */
export function validateRequiredArgs(args: any, required: string[]): void {
  const missing = required.filter((key) => !(key in args) || args[key] === undefined)

  if (missing.length > 0) {
    throw new ToolArgumentError(
      missing.join(', '),
      'defined',
      undefined,
      `Missing required arguments: ${missing.join(', ')}`
    )
  }
}
