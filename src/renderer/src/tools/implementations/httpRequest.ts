/**
 * HTTP Full Client Tool
 * Complete HTTP client with POST, PUT, DELETE, custom headers
 */

import type { Tool, ToolImpl } from '../../types/tools'

const TOOL_NAME = 'http_request'
const TOOL_GROUP = 'web'

export const httpRequestImpl: ToolImpl = async (args) => {
  const {
    method,
    url,
    headers = {},
    body,
    timeout = 30000
  } = args as {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    url: string
    headers?: Record<string, string>
    body?: string | Record<string, unknown>
    timeout?: number
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: AbortSignal.timeout(timeout)
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    const data = isJson ? await response.json() : await response.text()

    let output = `# HTTP ${method} Request\n\n`
    output += `**URL**: ${url}\n`
    output += `**Status**: ${response.status} ${response.statusText}\n`
    output += `**Content-Type**: ${contentType}\n\n`

    if (Object.keys(headers).length > 0) {
      output += `## Request Headers\n\`\`\`json\n${JSON.stringify(headers, null, 2)}\n\`\`\`\n\n`
    }

    output += `## Response\n\`\`\`${isJson ? 'json' : 'text'}\n`
    output += typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    output += `\n\`\`\`\n`

    return [
      {
        name: 'HTTP Response',
        description: `${method} ${url} - ${response.status}`,
        content: output
      }
    ]
  } catch (error) {
    throw new Error(
      `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const httpRequestTool: Tool = {
  type: 'function',
  category: 'web',
  displayTitle: 'HTTP Request',
  wouldLikeTo: 'make an HTTP request',
  isCurrently: 'making HTTP request',
  hasAlready: 'made HTTP request',
  readonly: true,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'GlobeIcon',
  function: {
    name: TOOL_NAME,
    description:
      'Make HTTP requests with full control: GET, POST, PUT, DELETE, PATCH. Supports custom headers and request bodies.',
    parameters: {
      type: 'object',
      required: ['method', 'url'],
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          description: 'HTTP method'
        },
        url: {
          type: 'string',
          description: 'Target URL'
        },
        headers: {
          type: 'object',
          description: 'Custom HTTP headers (optional)'
        },
        body: {
          type: 'object',
          description: 'Request body for POST/PUT/PATCH (JSON object or string)'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: httpRequestImpl
}
