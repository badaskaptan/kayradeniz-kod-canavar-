/**
 * Ollama Service
 * Local LLM inference using Ollama API
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: Array<{
    id?: string
    type: 'function'
    function: {
      name: string
      arguments: Record<string, unknown> | string
    }
  }>
}

export interface OllamaGenerateRequest {
  model: string
  prompt: string
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
    num_predict?: number
  }
}

export interface OllamaChatRequest {
  model: string
  messages: OllamaMessage[]
  stream?: boolean
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }> // Function calling tools (Llama3.2+ format)
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
    num_predict?: number // Max tokens to generate
  }
}

export interface OllamaResponse {
  model: string
  created_at: string
  response?: string
  message?: OllamaMessage & {
    tool_calls?: Array<{
      id?: string
      type: 'function'
      function: {
        name: string
        arguments: Record<string, unknown> | string // JSON object or string
      }
    }>
  }
  done: boolean
}

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
}

export class OllamaService {
  private baseUrl: string

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl
  }

  /**
   * Check if Ollama is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      return response.ok
    } catch (error) {
      console.error('[OllamaService] Connection failed:', error)
      return false
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`)
      }
      const data = await response.json()
      return data.models || []
    } catch (error) {
      console.error('[OllamaService] List models error:', error)
      return []
    }
  }

  /**
   * Generate completion (simple prompt)
   */
  async generate(request: OllamaGenerateRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: false })
      })

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      return data.response || ''
    } catch (error) {
      console.error('[OllamaService] Generate error:', error)
      throw error
    }
  }

  /**
   * Chat completion (with message history)
   */
  async chat(request: OllamaChatRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: false })
      })

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      return data.message?.content || ''
    } catch (error) {
      console.error('[OllamaService] Chat error:', error)
      throw error
    }
  }

  /**
   * Chat with streaming (for real-time responses)
   */
  async chatStream(request: OllamaChatRequest, onChunk: (chunk: string) => void): Promise<void> {
    // Pre-check: Ollama running?
    const isAvailable = await this.isAvailable()
    if (!isAvailable) {
      throw new Error(
        'Ollama Desktop is not running. Please start Ollama from system tray or run "ollama serve"'
      )
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true })
      })

      if (!response.ok) {
        throw new Error(`Chat stream failed: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: OllamaResponse = JSON.parse(line)
              if (data.message?.content) {
                onChunk(data.message.content)
              }
            } catch {
              console.warn('[OllamaService] Failed to parse chunk:', line)
            }
          }
        }
      }
    } catch (error) {
      console.error('[OllamaService] Chat stream error:', error)
      throw error
    }
  }

  /**
   * Preload model into memory (keep-alive)
   * Call this on app startup to avoid first-query delay
   */
  async preloadModel(modelName: string): Promise<void> {
    try {
      console.log(`[OllamaService] Preloading model: ${modelName}`)

      // Send a minimal request to load model into RAM
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: 'Hi',
          stream: false,
          keep_alive: '30m' // Keep model in RAM for 30 minutes
        })
      })

      if (!response.ok) {
        // Check if model is already loaded (500 error might mean model is busy/loaded)
        if (response.status === 500) {
          console.log(`[OllamaService] Model ${modelName} might already be loaded`)
          return
        }
        throw new Error(`Preload failed with status ${response.status}`)
      }

      console.log(`[OllamaService] Model ${modelName} preloaded successfully`)
    } catch (error) {
      console.warn('[OllamaService] Preload failed (non-critical):', error)
    }
  }

  /**
   * 🔧 TOOL BRIDGE: Chat with function calling support
   * Llama3.2:3b can call tools - this orchestrates the flow:
   * 1. Send tools to model
   * 2. Detect tool calls in response
   * 3. Execute tools via callback
   * 4. Feed results back to model
   * 5. Get final answer
   */
  async chatWithTools(
    request: OllamaChatRequest,
    onToolCall: (toolName: string, args: Record<string, unknown>) => Promise<string>,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const isAvailable = await this.isAvailable()
    if (!isAvailable) {
      throw new Error(
        'Ollama Desktop is not running. Please start Ollama from system tray or run "ollama serve"'
      )
    }

    let fullResponse = ''
    const maxIterations = 5 // Prevent infinite tool calling loops

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      console.log(`[ToolBridge] Iteration ${iteration + 1}/${maxIterations}`)

      // Send request to model
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Tool chat failed: ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      const message = data.message

      if (!message) {
        throw new Error('No message in response')
      }

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`[ToolBridge] 🔧 Detected ${message.tool_calls.length} tool call(s)`)

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name
          let args = toolCall.function.arguments

          // Parse arguments if string
          if (typeof args === 'string') {
            try {
              args = JSON.parse(args)
            } catch {
              console.error('[ToolBridge] Failed to parse tool arguments:', args)
              args = {}
            }
          }

          console.log(`[ToolBridge] Executing: ${toolName}(${JSON.stringify(args)})`)

          // Execute tool via callback
          const result = await onToolCall(toolName, args as Record<string, unknown>)

          console.log(`[ToolBridge] ✅ Result: ${result.substring(0, 100)}...`)

          // Add assistant message with tool call
          request.messages.push({
            role: 'assistant',
            content: '',
            tool_calls: [toolCall]
          })

          // Add tool response
          request.messages.push({
            role: 'tool',
            content: result
          })
        }

        // Continue loop to get final answer
        continue
      }

      // No tool calls - this is the final answer
      fullResponse = message.content || ''

      if (onChunk && fullResponse) {
        onChunk(fullResponse)
      }

      break
    }

    return fullResponse
  }
}

// Singleton instance
export const ollamaService = new OllamaService()
