/**
 * OpenAI Service
 * Cloud LLM inference using OpenAI API (GPT-3.5/4)
 *
 * NOTE: This uses the same tool calling interface as Ollama
 * to work with our existing Night Orders and Elysion Chamber systems.
 */

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string // JSON string
    }
  }>
  tool_call_id?: string // For tool response messages
}

export interface OpenAIChatRequest {
  model: string
  messages: OpenAIMessage[]
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }>
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: OpenAIMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenAIService {
  private baseUrl: string

  constructor() {
    this.baseUrl = 'https://api.openai.com/v1'
  }

  /**
   * Get API key from localStorage (always fresh)
   */
  private getApiKey(): string {
    return localStorage.getItem('openai-api-key') || ''
  }

  /**
   * Check if OpenAI API is available (has valid API key)
   */
  async isAvailable(): Promise<boolean> {
    const apiKey = this.getApiKey()
    if (!apiKey || apiKey.trim() === '') {
      console.warn('[OpenAIService] No API key configured')
      return false
    }

    try {
      // Simple models list check
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      return response.ok
    } catch (error) {
      console.error('[OpenAIService] Connection failed:', error)
      return false
    }
  }

  /**
   * List available models (for UI dropdown)
   */
  async listModels(): Promise<Array<{ name: string; id: string }>> {
    const apiKey = this.getApiKey()
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`)
      }

      const data = await response.json()

      // Filter to chat models only
      const chatModels = data.data
        .filter(
          (m: { id: string }) =>
            m.id.includes('gpt-3.5') || m.id.includes('gpt-4') || m.id.includes('gpt-4o')
        )
        .map((m: { id: string }) => ({
          name: m.id,
          id: m.id
        }))

      // Add common models if not in list
      const commonModels = [
        { name: 'gpt-3.5-turbo', id: 'gpt-3.5-turbo' },
        { name: 'gpt-4-turbo', id: 'gpt-4-turbo' },
        { name: 'gpt-4o', id: 'gpt-4o' },
        { name: 'gpt-4o-mini', id: 'gpt-4o-mini' }
      ]

      // Merge and deduplicate
      const allModels = [...chatModels]
      for (const cm of commonModels) {
        if (!allModels.find((m) => m.id === cm.id)) {
          allModels.push(cm)
        }
      }

      return allModels
    } catch (error) {
      console.error('[OpenAIService] List models error:', error)
      // Return default models
      return [
        { name: 'gpt-3.5-turbo', id: 'gpt-3.5-turbo' },
        { name: 'gpt-4o-mini', id: 'gpt-4o-mini' },
        { name: 'gpt-4o', id: 'gpt-4o' }
      ]
    }
  }

  /**
   * Chat completion (simple, no streaming)
   */
  async chat(request: OpenAIChatRequest): Promise<string> {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in Settings.')
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 500
        })
      })

      if (!response.ok) {
        const errorText = await response.text()

        // Parse OpenAI error messages
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key in Settings.')
        }
        if (response.status === 429) {
          throw new Error(
            'Rate limit exceeded. Please try again later or upgrade your OpenAI plan.'
          )
        }
        if (response.status === 402) {
          throw new Error('Insufficient credits. Please add credits to your OpenAI account.')
        }

        throw new Error(`OpenAI API error: ${response.statusText}\n${errorText}`)
      }

      const data: OpenAIResponse = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('[OpenAIService] Chat error:', error)
      throw error
    }
  }

  /**
   * Chat with streaming (for real-time responses)
   */
  async chatStream(request: OpenAIChatRequest, onChunk: (chunk: string) => void): Promise<void> {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in Settings.')
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 500,
          stream: true
        })
      })

      if (!response.ok) {
        const errorText = await response.text()

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key in Settings.')
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        }

        throw new Error(`OpenAI API error: ${response.statusText}\n${errorText}`)
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
          if (line.trim().startsWith('data: ')) {
            const data = line.trim().substring(6)

            if (data === '[DONE]') {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                onChunk(content)
              }
            } catch {
              console.warn('[OpenAIService] Failed to parse chunk:', data)
            }
          }
        }
      }
    } catch (error) {
      console.error('[OpenAIService] Chat stream error:', error)
      throw error
    }
  }

  /**
   * Preload model (no-op for OpenAI, kept for interface compatibility)
   */
  async preloadModel(): Promise<void> {
    // OpenAI doesn't need preloading - models are always ready
    console.log('[OpenAIService] Preload not needed for cloud models')
  }

  /**
   * 🔧 TOOL BRIDGE: Chat with function calling support
   * GPT-4/3.5 have excellent tool calling - orchestrate the flow:
   * 1. Send tools to model
   * 2. Detect tool calls in response
   * 3. Execute tools via callback
   * 4. Feed results back to model
   * 5. Get final answer
   */
  async chatWithTools(
    request: OpenAIChatRequest,
    onToolCall: (toolName: string, args: Record<string, unknown>) => Promise<string>,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in Settings.')
    }

    let fullResponse = ''
    const maxIterations = 5 // Prevent infinite tool calling loops

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      console.log(`[ToolBridge] Iteration ${iteration + 1}/${maxIterations}`)

      // Send request to model
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          tools: request.tools,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 1000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key in Settings.')
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        }
        if (response.status === 402) {
          throw new Error('Insufficient credits. Please add credits to your OpenAI account.')
        }

        throw new Error(`OpenAI API error: ${response.statusText}\n${errorText}`)
      }

      const data: OpenAIResponse = await response.json()
      const message = data.choices[0]?.message

      if (!message) {
        throw new Error('No message in response')
      }

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`[ToolBridge] 🔧 Detected ${message.tool_calls.length} tool call(s)`)

        // Add assistant message with tool calls
        request.messages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        })

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name
          let args: Record<string, unknown> = {}

          // Parse arguments (OpenAI sends JSON string)
          try {
            args = JSON.parse(toolCall.function.arguments)
          } catch {
            console.error(
              '[ToolBridge] Failed to parse tool arguments:',
              toolCall.function.arguments
            )
            args = {}
          }

          console.log(`[ToolBridge] Executing: ${toolName}(${JSON.stringify(args)})`)

          // Execute tool via callback
          const result = await onToolCall(toolName, args)

          console.log(`[ToolBridge] ✅ Result: ${result.substring(0, 100)}...`)

          // Add tool response
          request.messages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id
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
export const openaiService = new OpenAIService()
