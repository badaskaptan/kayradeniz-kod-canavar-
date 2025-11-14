/**
 * JSON Parse & Transform Tool
 * Parses, queries, and transforms JSON data
 */

import type { Tool, ToolImpl } from '../../types/tools'

const TOOL_NAME = 'json_transform'
const TOOL_GROUP = 'data'

export const jsonTransformImpl: ToolImpl = async (args) => {
  const { operation, data, query, value } = args as {
    operation: 'parse' | 'query' | 'set' | 'delete' | 'merge'
    data: string | object
    query?: string // JSONPath-like query
    value?: unknown
  }

  try {
    const jsonData: Record<string, unknown> =
      typeof data === 'string' ? JSON.parse(data) : (data as Record<string, unknown>)

    switch (operation) {
      case 'parse': {
        const formatted = JSON.stringify(jsonData, null, 2)
        return [
          {
            name: 'JSON Parsed',
            description: 'Parsed and formatted JSON',
            content: `\`\`\`json\n${formatted}\n\`\`\``
          }
        ]
      }

      case 'query': {
        if (!query) throw new Error('Query is required for query operation')
        // Simple dot notation query (e.g., "user.name")
        const keys = query.split('.')
        let result: Record<string, unknown> = jsonData
        for (const key of keys) {
          if (result && typeof result === 'object' && key in result) {
            result = result[key] as Record<string, unknown>
          } else {
            throw new Error(`Key path not found: ${query}`)
          }
        }
        return [
          {
            name: 'Query Result',
            description: `Value at ${query}`,
            content: JSON.stringify(result, null, 2)
          }
        ]
      }

      case 'set': {
        if (!query) throw new Error('Query is required for set operation')
        const keys = query.split('.')
        const lastKey = keys.pop()!
        let target: Record<string, unknown> = jsonData
        for (const key of keys) {
          if (!(key in target)) target[key] = {}
          target = target[key] as Record<string, unknown>
        }
        target[lastKey] = value
        return [
          {
            name: 'JSON Updated',
            description: `Set ${query} = ${JSON.stringify(value)}`,
            content: JSON.stringify(jsonData, null, 2)
          }
        ]
      }

      case 'delete': {
        if (!query) throw new Error('Query is required for delete operation')
        const keys = query.split('.')
        const lastKey = keys.pop()!
        let target: Record<string, unknown> = jsonData
        for (const key of keys) {
          if (!(key in target)) throw new Error(`Path not found: ${query}`)
          target = target[key] as Record<string, unknown>
        }
        delete target[lastKey]
        return [
          {
            name: 'JSON Updated',
            description: `Deleted ${query}`,
            content: JSON.stringify(jsonData, null, 2)
          }
        ]
      }

      case 'merge': {
        if (typeof value !== 'object') {
          throw new Error('Merge requires an object value')
        }
        const merged = { ...jsonData, ...value }
        return [
          {
            name: 'JSON Merged',
            description: 'Merged objects',
            content: JSON.stringify(merged, null, 2)
          }
        ]
      }

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  } catch (error) {
    throw new Error(
      `JSON operation failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const jsonTransformTool: Tool = {
  type: 'function',
  category: 'data',
  displayTitle: 'JSON Transform',
  wouldLikeTo: 'transform JSON data',
  isCurrently: 'transforming JSON',
  hasAlready: 'transformed JSON',
  readonly: false,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'CodeIcon',
  function: {
    name: TOOL_NAME,
    description: 'Parse, query, modify, and transform JSON data. Supports dot notation queries.',
    parameters: {
      type: 'object',
      required: ['operation', 'data'],
      properties: {
        operation: {
          type: 'string',
          enum: ['parse', 'query', 'set', 'delete', 'merge'],
          description: 'The operation to perform on JSON data'
        },
        data: {
          type: 'object',
          description: 'JSON string or parsed object'
        },
        query: {
          type: 'string',
          description: 'Dot notation path (e.g., "user.profile.name")'
        },
        value: {
          type: 'object',
          description: 'Value to set or merge'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  implementation: jsonTransformImpl
}
