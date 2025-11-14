/**
 * Environment Variable Manager
 * Read, write, and manage environment variables
 */

import type { Tool, ToolImpl } from '../../types/tools'

// Get Environment Variable
export const envGetImpl: ToolImpl = async (args, extras) => {
  const { key, showAll = false } = args as {
    key?: string
    showAll?: boolean
  }

  try {
    if (showAll) {
      // List all environment variables
      const result = await extras.ide.terminal.exec(
        process.platform === 'win32' ? 'Get-ChildItem Env:' : 'env'
      )

      return [
        {
          name: 'Environment Variables',
          description: 'All environment variables',
          content: `# Environment Variables\n\n\`\`\`\n${result.data?.stdout || 'No variables found'}\n\`\`\``
        }
      ]
    }

    if (!key) {
      throw new Error('Either key or showAll=true must be provided')
    }

    const result = await extras.ide.terminal.exec(
      process.platform === 'win32' ? `$env:${key}` : `echo $${key}`
    )
    const envValue = result.data?.stdout?.trim() || ''

    return [
      {
        name: 'Environment Variable',
        description: `${key} = ${envValue}`,
        content: `# Environment Variable\n\n**Key**: ${key}\n**Value**: ${envValue || '(not set)'}`
      }
    ]
  } catch (error) {
    throw new Error(`Get env failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const envGetTool: Tool = {
  type: 'function',
  category: 'terminal',
  displayTitle: 'Get Environment Variable',
  wouldLikeTo: 'get environment variable',
  isCurrently: 'getting environment variable',
  hasAlready: 'got environment variable',
  readonly: true,
  isInstant: true,
  group: 'terminal',
  icon: 'SettingsIcon',
  function: {
    name: 'env_get',
    description: 'Get an environment variable value or list all environment variables.',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        key: {
          type: 'string',
          description: 'Environment variable name to get'
        },
        showAll: {
          type: 'boolean',
          description: 'Show all environment variables (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: envGetImpl
}

// Set Environment Variable
export const envSetImpl: ToolImpl = async (args, extras) => {
  const {
    key,
    value,
    permanent = false
  } = args as {
    key: string
    value: string
    permanent?: boolean
  }

  try {
    // Set for current session
    await extras.ide.terminal.setEnv(key, value)

    // Set permanently (platform-specific)
    if (permanent) {
      const command =
        process.platform === 'win32'
          ? `[System.Environment]::SetEnvironmentVariable('${key}', '${value}', 'User')`
          : `echo 'export ${key}="${value}"' >> ~/.bashrc`

      await extras.ide.terminal.exec(command)
    }

    return [
      {
        name: 'Environment Variable Set',
        description: `${key} = ${value}`,
        content: `# Environment Variable Set\n\n**Key**: ${key}\n**Value**: ${value}\n**Permanent**: ${permanent ? 'Yes (saved to profile)' : 'No (session only)'}\n\n✓ Successfully set`
      }
    ]
  } catch (error) {
    throw new Error(`Set env failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const envSetTool: Tool = {
  type: 'function',
  category: 'terminal',
  displayTitle: 'Set Environment Variable',
  wouldLikeTo: 'set environment variable',
  isCurrently: 'setting environment variable',
  hasAlready: 'set environment variable',
  readonly: false,
  isInstant: false,
  group: 'terminal',
  icon: 'SettingsIcon',
  function: {
    name: 'env_set',
    description: 'Set an environment variable for the current session or permanently.',
    parameters: {
      type: 'object',
      required: ['key', 'value'],
      properties: {
        key: {
          type: 'string',
          description: 'Environment variable name'
        },
        value: {
          type: 'string',
          description: 'Environment variable value'
        },
        permanent: {
          type: 'boolean',
          description: 'Save permanently to user profile (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: envSetImpl
}

// Load .env File
export const envLoadFileImpl: ToolImpl = async (args, extras) => {
  const { filePath = '.env', override = false } = args as {
    filePath?: string
    override?: boolean
  }

  try {
    const readResult = await extras.ide.fs.readFile(filePath)
    if (!readResult.success || !readResult.data) {
      throw new Error(readResult.error || 'Failed to read .env file')
    }

    const content = readResult.data
    const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'))

    const loaded: string[] = []
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts
        .join('=')
        .trim()
        .replace(/^["']|["']$/g, '') // Remove quotes

      if (key && value) {
        const trimmedKey = key.trim()
        await extras.ide.terminal.setEnv(trimmedKey, value)
        loaded.push(`${trimmedKey}=${value}`)
      }
    }

    return [
      {
        name: 'Environment Loaded',
        description: `Loaded ${loaded.length} variable(s) from ${filePath}`,
        content: `# Environment File Loaded\n\n**File**: ${filePath}\n**Variables Loaded**: ${loaded.length}\n**Override**: ${override}\n\n${loaded.map((v) => `- ${v}`).join('\n')}`
      }
    ]
  } catch (error) {
    throw new Error(
      `Load env file failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const envLoadFileTool: Tool = {
  type: 'function',
  category: 'terminal',
  displayTitle: 'Load .env File',
  wouldLikeTo: 'load .env file',
  isCurrently: 'loading .env file',
  hasAlready: 'loaded .env file',
  readonly: false,
  isInstant: false,
  group: 'terminal',
  icon: 'SettingsIcon',
  function: {
    name: 'env_load_file',
    description: 'Load environment variables from a .env file.',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to .env file (default: .env)'
        },
        override: {
          type: 'boolean',
          description: 'Override existing variables (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: envLoadFileImpl
}

// Save to .env File
export const envSaveFileImpl: ToolImpl = async (args, extras) => {
  const {
    filePath = '.env',
    variables,
    append = false
  } = args as {
    filePath?: string
    variables: Record<string, string>
    append?: boolean
  }

  try {
    let content = ''

    // Read existing if appending
    if (append) {
      const readResult = await extras.ide.fs.readFile(filePath)
      if (readResult.success && readResult.data) {
        content = readResult.data + '\n'
      }
    }

    // Add new variables
    for (const [key, value] of Object.entries(variables)) {
      const needsQuotes = value.includes(' ') || value.includes('#')
      content += `${key}=${needsQuotes ? `"${value}"` : value}\n`
    }

    const writeResult = await extras.ide.fs.writeFile(filePath, content)
    if (!writeResult.success) {
      throw new Error(writeResult.error || 'Failed to write .env file')
    }

    return [
      {
        name: 'Environment Saved',
        description: `Saved ${Object.keys(variables).length} variable(s) to ${filePath}`,
        content: `# Environment File Saved\n\n**File**: ${filePath}\n**Mode**: ${append ? 'Append' : 'Overwrite'}\n**Variables**: ${Object.keys(variables).length}\n\n${Object.entries(
          variables
        )
          .map(([k, v]) => `- ${k}=${v}`)
          .join('\n')}`
      }
    ]
  } catch (error) {
    throw new Error(
      `Save env file failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const envSaveFileTool: Tool = {
  type: 'function',
  category: 'terminal',
  displayTitle: 'Save .env File',
  wouldLikeTo: 'save .env file',
  isCurrently: 'saving .env file',
  hasAlready: 'saved .env file',
  readonly: false,
  isInstant: false,
  group: 'terminal',
  icon: 'SettingsIcon',
  function: {
    name: 'env_save_file',
    description: 'Save environment variables to a .env file.',
    parameters: {
      type: 'object',
      required: ['variables'],
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to .env file (default: .env)'
        },
        variables: {
          type: 'object',
          description: 'Key-value pairs to save (JSON object as string)'
        },
        append: {
          type: 'boolean',
          description: 'Append to existing file (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: envSaveFileImpl
}
