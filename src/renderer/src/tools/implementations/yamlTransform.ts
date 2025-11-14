/**
 * YAML Transform Tool
 * Parse and manipulate YAML files
 */

import type { Tool, ToolImpl } from '../../types/tools'

// Simple YAML parser/stringifier (basic implementation)
class SimpleYAML {
  static parse(yamlString: string): unknown {
    const lines = yamlString.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#'))
    const result: Record<string, unknown> = {}
    let currentKey = ''

    for (const line of lines) {
      const trimmed = line.trim()
      const currentIndent = line.search(/\S/)

      if (trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':')
        const value = valueParts.join(':').trim()

        if (value) {
          // Simple key-value
          result[key.trim()] = this.parseValue(value)
        } else {
          // Object key
          currentKey = key.trim()
          indent = currentIndent
        }
      } else if (trimmed.startsWith('-')) {
        // Array item
        if (!result[currentKey]) result[currentKey] = []
        const value = trimmed.substring(1).trim()
        ;(result[currentKey] as unknown[]).push(this.parseValue(value))
      }
    }

    return result
  }

  static stringify(obj: unknown, indent = 0): string {
    if (obj === null) return 'null'
    if (typeof obj !== 'object') return String(obj)

    const spaces = '  '.repeat(indent)
    let result = ''

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object') {
          result += `${spaces}- ${this.stringify(item, indent + 1).trim()}\n`
        } else {
          result += `${spaces}- ${item}\n`
        }
      }
    } else {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof value === 'object' && value !== null) {
          result += `${spaces}${key}:\n${this.stringify(value, indent + 1)}`
        } else {
          result += `${spaces}${key}: ${value}\n`
        }
      }
    }

    return result
  }

  private static parseValue(value: string): unknown {
    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null') return null
    if (/^-?\d+$/.test(value)) return parseInt(value, 10)
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1)
    }
    return value
  }
}

// YAML Parse Tool
export const yamlParseImpl: ToolImpl = async (args, extras) => {
  const { filePath, query } = args as {
    filePath: string
    query?: string
  }

  try {
    const readResult = await extras.ide.fs.readFile(filePath)
    if (!readResult.success || !readResult.data) {
      throw new Error(readResult.error || 'Failed to read file')
    }

    const content = readResult.data
    const parsed = SimpleYAML.parse(content)

    let result = parsed
    if (query) {
      // Query using dot notation
      const parts = query.split('.')
      result = parts.reduce((obj: any, key) => obj?.[key], parsed)
    }

    return [
      {
        name: 'YAML Parsed',
        description: `Parsed ${filePath}`,
        content: `# YAML Parse\n\n**File**: ${filePath}\n${query ? `**Query**: ${query}\n` : ''}\n**Result**:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
      }
    ]
  } catch (error) {
    throw new Error(`YAML parse failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const yamlParseTool: Tool = {
  type: 'function',
  category: 'data',
  displayTitle: 'Parse YAML',
  wouldLikeTo: 'parse YAML',
  isCurrently: 'parsing YAML',
  hasAlready: 'parsed YAML',
  readonly: true,
  isInstant: true,
  group: 'data',
  icon: 'FileIcon',
  function: {
    name: 'yaml_parse',
    description: 'Parse a YAML file and optionally query a specific path.',
    parameters: {
      type: 'object',
      required: ['filePath'],
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to YAML file'
        },
        query: {
          type: 'string',
          description: 'Optional dot notation query (e.g., "database.host")'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: yamlParseImpl
}

// YAML Write Tool
export const yamlWriteImpl: ToolImpl = async (args, extras) => {
  const { filePath, data, merge = false } = args as {
    filePath: string
    data: string
    merge?: boolean
  }

  try {
    let finalData: unknown
    
    // Parse input data (JSON string)
    try {
      finalData = JSON.parse(data)
    } catch {
      throw new Error('Data must be valid JSON string')
    }

    // Merge with existing if requested
    if (merge) {
      const readResult = await extras.ide.fs.readFile(filePath)
      if (readResult.success && readResult.data) {
        const existing = SimpleYAML.parse(readResult.data)
        if (typeof existing === 'object' && existing !== null && typeof finalData === 'object' && finalData !== null) {
          finalData = { ...existing, ...finalData }
        }
      }
    }

    // Convert to YAML
    const yamlContent = SimpleYAML.stringify(finalData)

    // Write file
    const writeResult = await extras.ide.fs.writeFile(filePath, yamlContent)
    if (!writeResult.success) {
      throw new Error(writeResult.error || 'Failed to write file')
    }

    return [
      {
        name: 'YAML Written',
        description: `Written to ${filePath}`,
        content: `# YAML Write\n\n**File**: ${filePath}\n**Mode**: ${merge ? 'Merge' : 'Overwrite'}\n**Status**: ✓ Success\n\n**Content**:\n\`\`\`yaml\n${yamlContent}\n\`\`\``
      }
    ]
  } catch (error) {
    throw new Error(`YAML write failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const yamlWriteTool: Tool = {
  type: 'function',
  category: 'data',
  displayTitle: 'Write YAML',
  wouldLikeTo: 'write YAML',
  isCurrently: 'writing YAML',
  hasAlready: 'written YAML',
  readonly: false,
  isInstant: false,
  group: 'data',
  icon: 'FileIcon',
  function: {
    name: 'yaml_write',
    description: 'Write data to a YAML file. Data should be provided as JSON string.',
    parameters: {
      type: 'object',
      required: ['filePath', 'data'],
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to YAML file'
        },
        data: {
          type: 'string',
          description: 'JSON string to convert to YAML'
        },
        merge: {
          type: 'boolean',
          description: 'Merge with existing content (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: yamlWriteImpl
}
