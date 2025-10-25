/**
 * Grep Search Tool
 * Searches file contents using regex patterns
 * Based on Continue.dev's grepSearch
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg, getBooleanArg } from '../parseArgs'

const TOOL_NAME = 'grep_search'
const TOOL_GROUP = 'built-in'
const MAX_RESULTS = 100
const MAX_TOTAL_CHARS = 7500

/**
 * Escape regex special characters for literal search
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Implementation
 */
export const grepSearchImpl: ToolImpl = async (args, extras) => {
  const query = getStringArg(args, 'query')
  const isRegex = getBooleanArg(args, 'is_regex') ?? false

  if (!query) {
    throw new Error('query argument is required')
  }

  try {
    // Prepare search pattern
    const searchPattern = isRegex ? query : escapeRegex(query)

    // Execute search via IDE bridge
    const result = await extras.ide.search.grep({
      pattern: searchPattern,
      isRegex: true,
      maxResults: MAX_RESULTS
    })

    if (!result.success) {
      throw new Error(result.error || 'Search failed')
    }

    const matches = result.data || []

    // Truncate if needed
    let totalChars = 0
    const truncatedMatches: Array<{ file: string; line: number; content: string }> = []
    let wasTruncated = false

    for (const match of matches) {
      const matchStr = `${match.file}:${match.line}: ${match.content}\n`
      if (totalChars + matchStr.length > MAX_TOTAL_CHARS) {
        wasTruncated = true
        break
      }
      truncatedMatches.push(match)
      totalChars += matchStr.length
    }

    // Format results
    let content = ''
    if (truncatedMatches.length === 0) {
      content = `No matches found for: ${query}`
    } else {
      content = truncatedMatches
        .map((match) => `${match.file}:${match.line}: ${match.content}`)
        .join('\n')

      if (wasTruncated) {
        content += `\n\n⚠️ Results truncated at ${MAX_TOTAL_CHARS} characters. Showing ${truncatedMatches.length} of ${matches.length} matches. Refine your search query to see more specific results.`
      }
    }

    const contextItem: ContextItem = {
      name: `Search results: ${query}`,
      description: `Grep search for "${query}" (${truncatedMatches.length} matches)`,
      content,
      uri: {
        type: 'file',
        value: 'search-results'
      }
    }

    return [contextItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to search for "${query}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const grepSearchTool: Tool = {
  type: 'function',
  category: 'search',
  displayTitle: 'Grep Search',
  wouldLikeTo: 'search for: {{{ query }}}',
  isCurrently: 'searching for: {{{ query }}}',
  hasAlready: 'searched for: {{{ query }}}',
  readonly: true,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'MagnifyingGlassIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Search file contents in the workspace using text patterns or regex. Returns matching lines with file paths and line numbers. Limited to 100 results.',
    parameters: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description:
            'The search query. Can be plain text or a regex pattern (if is_regex is true)',
          required: true
        },
        is_regex: {
          type: 'boolean',
          description:
            'Whether the query is a regex pattern (default: false). If false, special regex characters are automatically escaped.',
          required: false
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To search file contents, use the ${TOOL_NAME} tool. For example, to search for 'function handleClick', you would respond with:`,
    exampleArgs: [['query', 'function handleClick']]
  },
  implementation: grepSearchImpl
}
