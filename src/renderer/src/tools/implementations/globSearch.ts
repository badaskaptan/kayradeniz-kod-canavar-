/**
 * Glob Search Tool
 * Searches for files matching glob patterns
 * Based on Continue.dev's globSearch
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'glob_search'
const TOOL_GROUP = 'built-in'
const MAX_FILES = 100

/**
 * Implementation
 */
export const globSearchImpl: ToolImpl = async (args, extras) => {
  const pattern = getStringArg(args, 'pattern')

  if (!pattern) {
    throw new Error('pattern argument is required')
  }

  try {
    // Execute glob search via IDE bridge
    const result = await extras.ide.search.glob({
      pattern,
      maxResults: MAX_FILES
    })

    if (!result.success) {
      throw new Error(result.error || 'Glob search failed')
    }

    const files = result.data || []

    // Truncate if needed
    const wasTruncated = files.length >= MAX_FILES
    const displayFiles = files.slice(0, MAX_FILES)

    // Format results
    let content = ''
    if (displayFiles.length === 0) {
      content = `No files found matching pattern: ${pattern}`
    } else {
      content = displayFiles.join('\n')

      if (wasTruncated) {
        content += `\n\n⚠️ Results limited to ${MAX_FILES} files. Refine your pattern to see more specific results.`
      }
    }

    const contextItem: ContextItem = {
      name: `Files matching: ${pattern}`,
      description: `Glob search for "${pattern}" (${displayFiles.length} files)`,
      content,
      uri: {
        type: 'file',
        value: 'glob-results'
      }
    }

    return [contextItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to search for files matching "${pattern}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const globSearchTool: Tool = {
  type: 'function',
  category: 'search',
  displayTitle: 'Glob Search',
  wouldLikeTo: 'find files matching: {{{ pattern }}}',
  isCurrently: 'finding files matching: {{{ pattern }}}',
  hasAlready: 'found files matching: {{{ pattern }}}',
  readonly: true,
  isInstant: true,
  group: TOOL_GROUP,
  icon: 'FolderIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Search for files in the workspace matching a glob pattern (e.g. "**/*.ts" for all TypeScript files, "src/components/**" for all files in components). Limited to 100 files.',
    parameters: {
      type: 'object',
      required: ['pattern'],
      properties: {
        pattern: {
          type: 'string',
          description:
            'The glob pattern to match files against (e.g. "**/*.ts", "src/**/*.tsx", "*.json")',
          required: true
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To find files matching a pattern, use the ${TOOL_NAME} tool. For example, to find all TypeScript files, you would respond with:`,
    exampleArgs: [['pattern', '**/*.ts']]
  },
  implementation: globSearchImpl
}
