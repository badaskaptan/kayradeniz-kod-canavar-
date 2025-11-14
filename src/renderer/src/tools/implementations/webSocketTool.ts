/**
 * WebSocket Tool - Real-time Communication
 * Connect, send, receive messages via WebSocket
 */

import type { Tool, ToolImpl } from '../../types/tools'

// Store active WebSocket connections
const activeConnections = new Map<string, WebSocket>()

// WebSocket Connect Tool
export const wsConnectImpl: ToolImpl = async (args) => {
  const {
    url,
    connectionId = `ws_${Date.now()}`,
    protocols
  } = args as {
    url: string
    connectionId?: string
    protocols?: string[]
  }

  return new Promise((resolve, reject) => {
    try {
      const ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url)

      ws.onopen = () => {
        activeConnections.set(connectionId, ws)
        resolve([
          {
            name: 'WebSocket Connected',
            description: `Connected to ${url}`,
            content: `# WebSocket Connection\n\n**URL**: ${url}\n**Connection ID**: ${connectionId}\n**Status**: ✓ Connected\n**Ready State**: ${ws.readyState}\n\nUse this connection ID for sending/receiving messages.`
          }
        ])
      }

      ws.onerror = (error) => {
        reject(new Error(`WebSocket connection failed: ${error}`))
      }

      ws.onclose = () => {
        activeConnections.delete(connectionId)
      }

      // Set timeout for connection
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close()
          reject(new Error('WebSocket connection timeout'))
        }
      }, 10000)
    } catch (error) {
      reject(
        new Error(
          `WebSocket connection error: ${error instanceof Error ? error.message : String(error)}`
        )
      )
    }
  })
}

export const wsConnectTool: Tool = {
  type: 'function',
  category: 'web',
  displayTitle: 'WebSocket Connect',
  wouldLikeTo: 'connect via WebSocket',
  isCurrently: 'connecting to WebSocket',
  hasAlready: 'connected to WebSocket',
  readonly: false,
  isInstant: false,
  group: 'web',
  icon: 'NetworkIcon',
  function: {
    name: 'websocket_connect',
    description: 'Connect to a WebSocket server for real-time bidirectional communication.',
    parameters: {
      type: 'object',
      required: ['url'],
      properties: {
        url: {
          type: 'string',
          description: 'WebSocket URL (ws:// or wss://)'
        },
        connectionId: {
          type: 'string',
          description: 'Optional connection identifier (auto-generated if not provided)'
        },
        protocols: {
          type: 'string',
          description: 'Optional comma-separated subprotocols'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: wsConnectImpl
}

// WebSocket Send Tool
export const wsSendImpl: ToolImpl = async (args) => {
  const {
    connectionId,
    message,
    messageType = 'text'
  } = args as {
    connectionId: string
    message: string
    messageType?: 'text' | 'json' | 'binary'
  }

  try {
    const ws = activeConnections.get(connectionId)
    if (!ws) {
      throw new Error(`WebSocket connection '${connectionId}' not found`)
    }

    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket connection '${connectionId}' is not open (state: ${ws.readyState})`)
    }

    let dataToSend: string | ArrayBuffer = message
    if (messageType === 'json') {
      dataToSend = JSON.stringify(JSON.parse(message))
    }

    ws.send(dataToSend)

    return [
      {
        name: 'WebSocket Message Sent',
        description: `Sent ${messageType} message`,
        content: `# WebSocket Send\n\n**Connection ID**: ${connectionId}\n**Type**: ${messageType}\n**Status**: ✓ Sent\n\n**Message**:\n\`\`\`${messageType === 'json' ? 'json' : 'text'}\n${message}\n\`\`\``
      }
    ]
  } catch (error) {
    throw new Error(
      `WebSocket send failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const wsSendTool: Tool = {
  type: 'function',
  category: 'web',
  displayTitle: 'WebSocket Send',
  wouldLikeTo: 'send WebSocket message',
  isCurrently: 'sending WebSocket message',
  hasAlready: 'sent WebSocket message',
  readonly: false,
  isInstant: true,
  group: 'web',
  icon: 'NetworkIcon',
  function: {
    name: 'websocket_send',
    description: 'Send a message through an active WebSocket connection.',
    parameters: {
      type: 'object',
      required: ['connectionId', 'message'],
      properties: {
        connectionId: {
          type: 'string',
          description: 'Connection ID from websocket_connect'
        },
        message: {
          type: 'string',
          description: 'Message content to send'
        },
        messageType: {
          type: 'string',
          description: 'Message type: text, json, or binary (default: text)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: wsSendImpl
}

// WebSocket Close Tool
export const wsCloseImpl: ToolImpl = async (args) => {
  const {
    connectionId,
    code = 1000,
    reason = 'Normal closure'
  } = args as {
    connectionId: string
    code?: number
    reason?: string
  }

  try {
    const ws = activeConnections.get(connectionId)
    if (!ws) {
      throw new Error(`WebSocket connection '${connectionId}' not found`)
    }

    ws.close(code, reason)
    activeConnections.delete(connectionId)

    return [
      {
        name: 'WebSocket Closed',
        description: `Closed connection ${connectionId}`,
        content: `# WebSocket Close\n\n**Connection ID**: ${connectionId}\n**Code**: ${code}\n**Reason**: ${reason}\n**Status**: ✓ Closed`
      }
    ]
  } catch (error) {
    throw new Error(
      `WebSocket close failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const wsCloseTool: Tool = {
  type: 'function',
  category: 'web',
  displayTitle: 'WebSocket Close',
  wouldLikeTo: 'close WebSocket connection',
  isCurrently: 'closing WebSocket',
  hasAlready: 'closed WebSocket',
  readonly: false,
  isInstant: true,
  group: 'web',
  icon: 'NetworkIcon',
  function: {
    name: 'websocket_close',
    description: 'Close an active WebSocket connection.',
    parameters: {
      type: 'object',
      required: ['connectionId'],
      properties: {
        connectionId: {
          type: 'string',
          description: 'Connection ID to close'
        },
        code: {
          type: 'number',
          description: 'Close code (default: 1000 for normal closure)'
        },
        reason: {
          type: 'string',
          description: 'Close reason (default: "Normal closure")'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: wsCloseImpl
}

// WebSocket List Connections Tool
export const wsListImpl: ToolImpl = async () => {
  const connections = Array.from(activeConnections.entries()).map(([id, ws]) => ({
    id,
    readyState: ws.readyState,
    url: ws.url,
    protocol: ws.protocol
  }))

  const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']

  const content = connections.length
    ? connections
        .map(
          (conn) =>
            `- **${conn.id}**\n  - URL: ${conn.url}\n  - State: ${stateNames[conn.readyState]}\n  - Protocol: ${conn.protocol || 'none'}`
        )
        .join('\n')
    : 'No active WebSocket connections'

  return [
    {
      name: 'WebSocket Connections',
      description: `${connections.length} active connection(s)`,
      content: `# Active WebSocket Connections\n\n**Count**: ${connections.length}\n\n${content}`
    }
  ]
}

export const wsListTool: Tool = {
  type: 'function',
  category: 'web',
  displayTitle: 'WebSocket List',
  wouldLikeTo: 'list WebSocket connections',
  isCurrently: 'listing WebSocket connections',
  hasAlready: 'listed WebSocket connections',
  readonly: true,
  isInstant: true,
  group: 'web',
  icon: 'NetworkIcon',
  function: {
    name: 'websocket_list',
    description: 'List all active WebSocket connections.',
    parameters: {
      type: 'object',
      required: [],
      properties: {}
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: wsListImpl
}
