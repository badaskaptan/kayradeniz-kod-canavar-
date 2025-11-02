/**
 * Web Fetch Tool
 * Fetch content from a URL
 */

import type { Tool, ToolImpl } from '../../types/tools'
import { getStringArg } from '../parseArgs'

const TOOL_NAME = 'web_fetch'
const TOOL_GROUP = 'built-in'
const MAX_CONTENT_LENGTH = 50000

export const webFetchImpl: ToolImpl = async (args) => {
  const url = getStringArg(args, 'url', true)

  if (!url) {
    throw new Error('URL is required')
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    let content: string

    if (contentType.includes('application/json')) {
      const json = await response.json()
      content = JSON.stringify(json, null, 2)
    } else {
      content = await response.text()
    }

    // Truncate if too long
    if (content.length > MAX_CONTENT_LENGTH) {
      content =
        content.slice(0, MAX_CONTENT_LENGTH) +
        `\n\n[Truncated - ${content.length} total characters]`
    }

    return [
      {
        name: 'Web Content',
        description: `Fetched: ${url}`,
        content,
        status: `${content.length} chars`
      }
    ]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to fetch ${url}: ${errorMessage}`)
  }
}

export const webFetchTool: Tool = {
  type: 'function',
  category: 'web',
  displayTitle: 'Fetch URL',
  wouldLikeTo: 'fetch {{{ url }}}',
  isCurrently: 'fetching {{{ url }}}',
  hasAlready: 'fetched {{{ url }}}',
  readonly: true,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'DownloadIcon',
  function: {
    name: TOOL_NAME,
    description: `Fetch content from a URL (HTML, JSON, text, etc.).

Use this to:
- Read documentation pages
- Fetch API responses
- Download text files
- Read GitHub files

Example: web_fetch(url="https://raw.githubusercontent.com/user/repo/main/README.md")`,
    parameters: {
      type: 'object',
      required: ['url'],
      properties: {
        url: {
          type: 'string',
          description: 'URL to fetch',
          required: true
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithoutPermission',
  systemMessageDescription: {
    prefix: `To fetch web content, use the ${TOOL_NAME} tool.`,
    exampleArgs: [['url', 'https://example.com/api/data']]
  },
  implementation: webFetchImpl
}
