/**
 * Web Search Tool
 * Search the web using Google/Bing
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg, getNumberArg } from '../parseArgs'

const TOOL_NAME = 'web_search'
const TOOL_GROUP = 'built-in'

export const webSearchImpl: ToolImpl = async (args) => {
  const query = getStringArg(args, 'query', true)
  const maxResults = getNumberArg(args, 'max_results') ?? 5

  if (!query) {
    throw new Error('Search query is required')
  }

  try {
    // Use DuckDuckGo API (no API key needed)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`

    const response = await fetch(searchUrl)
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    interface DuckDuckGoResult {
      AbstractText?: string
      AbstractURL?: string
      RelatedTopics?: Array<{
        Text?: string
        FirstURL?: string
      }>
    }

    const data = (await response.json()) as DuckDuckGoResult

    // Format results
    const results: string[] = []

    if (data.AbstractText) {
      results.push(`**Answer:** ${data.AbstractText}`)
      if (data.AbstractURL) {
        results.push(`Source: ${data.AbstractURL}`)
      }
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      const topics = data.RelatedTopics.slice(0, maxResults)
        .filter((t) => t.Text && t.FirstURL)
        .map((t) => `• ${t.Text}\n  ${t.FirstURL}`)

      if (topics.length > 0) {
        results.push(`\n**Related:**\n${topics.join('\n')}`)
      }
    }

    const content = results.length > 0 ? results.join('\n\n') : 'No results found'

    return [
      {
        name: 'Search Results',
        description: `Search: "${query}"`,
        content,
        status: `${maxResults} results`
      }
    ]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Web search failed: ${errorMessage}`)
  }
}

export const webSearchTool: Tool = {
  type: 'function',
  category: 'web',
  displayTitle: 'Web Search',
  wouldLikeTo: 'search for {{{ query }}}',
  isCurrently: 'searching for {{{ query }}}',
  hasAlready: 'searched for {{{ query }}}',
  readonly: true,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'SearchIcon',
  function: {
    name: TOOL_NAME,
    description: `Search the web for information.

Use this to:
- Find documentation
- Research libraries/frameworks
- Get latest information
- Find code examples

Example: web_search(query="React hooks tutorial")`,
    parameters: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
          required: true
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
          required: false
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To search the web, use the ${TOOL_NAME} tool.`,
    exampleArgs: [
      ['query', 'TypeScript generics tutorial'],
      ['max_results', '5']
    ]
  },
  implementation: webSearchImpl
}
