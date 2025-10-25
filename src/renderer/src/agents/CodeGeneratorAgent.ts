import type { Task, TaskResult, AIConfig } from '../types'
import type { ToolBridgeAPI } from '../../../shared/toolBridge'
import { CodeValidator } from './CodeValidator'

/**
 * Code Generator Agent
 *
 * Görevler:
 * 1. AI-assisted kod üretimi
 * 2. Template-based generation
 * 3. Night Orders formatında plan oluşturma
 * 4. Multi-provider AI desteği (OpenAI, Anthropic, Google, Groq, Ollama)
 * 5. Kod validasyonu ve dosya yazma (Layer 4)
 */

export interface GenerationRequest {
  prompt: string
  context?: string
  language?: string
  framework?: string
  style?: 'functional' | 'oop' | 'mixed'
  includeComments?: boolean
  includeTypes?: boolean
  workspaceRoot?: string
  writeFiles?: boolean // Enable file writing
}

export interface GenerationResult {
  code: string
  language: string
  explanation?: string
  warnings?: string[]
  suggestions?: string[]
  filesWritten?: string[]
  validationErrors?: string[]
}

export class CodeGeneratorAgent {
  private aiConfig: AIConfig
  private validator: CodeValidator | null = null

  constructor(aiConfig: AIConfig, ide?: ToolBridgeAPI) {
    this.aiConfig = aiConfig
    if (ide) {
      this.validator = new CodeValidator(ide)
    }
  }

  updateConfig(aiConfig: AIConfig): void {
    this.aiConfig = aiConfig
  }

  /**
   * Task'ı çalıştır
   */
  async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      const request = task.metadata?.generationRequest as GenerationRequest | undefined

      if (!request) {
        throw new Error('No generation request in task metadata')
      }

      const result = await this.generateCode(request)

      return {
        success: true,
        executionTime: Date.now() - startTime,
        output: result.code,
        metadata: {
          language: result.language,
          explanation: result.explanation,
          warnings: result.warnings,
          suggestions: result.suggestions
        }
      }
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * AI ile kod üret
   */
  async generateCode(request: GenerationRequest): Promise<GenerationResult> {
    const {
      prompt,
      context,
      language,
      framework,
      style,
      includeComments,
      includeTypes,
      workspaceRoot,
      writeFiles
    } = request

    // System prompt oluştur
    const systemPrompt = this.buildSystemPrompt({
      language,
      framework,
      style,
      includeComments,
      includeTypes
    })

    // User prompt oluştur
    const userPrompt = this.buildUserPrompt(prompt, context)

    // AI API çağrısı
    const response = await this.callAI(systemPrompt, userPrompt)

    // Response'u parse et
    const baseResult = this.parseAIResponse(response, language || 'typescript')

    // Layer 4: Validate and write files if requested
    if (writeFiles && workspaceRoot && this.validator) {
      console.log('[CodeGeneratorAgent] Layer 4: Validating and writing files...')
      console.log('[CodeGeneratorAgent] Workspace root:', workspaceRoot)
      console.log('[CodeGeneratorAgent] Response length:', response.length)

      try {
        const validationResult = await this.validator.validateAndWrite(response, workspaceRoot)

        console.log('[CodeGeneratorAgent] Validation complete:', {
          valid: validationResult.valid,
          success: validationResult.success,
          filesWritten: validationResult.filesWritten,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        })

        return {
          ...baseResult,
          filesWritten: validationResult.filesWritten,
          validationErrors: validationResult.errors.map((e) =>
            typeof e === 'string' ? e : `${e.file}: ${e.error}`
          ),
          warnings: [...(baseResult.warnings || []), ...validationResult.warnings]
        }
      } catch (error) {
        console.error('[CodeGeneratorAgent] Validation error:', error)
        return {
          ...baseResult,
          validationErrors: [error instanceof Error ? error.message : String(error)],
          warnings: [...(baseResult.warnings || []), 'File writing failed']
        }
      }
    } else {
      console.log('[CodeGeneratorAgent] Skipping file write:', {
        writeFiles,
        workspaceRoot: !!workspaceRoot,
        hasValidator: !!this.validator
      })
    }

    return baseResult
  }

  /**
   * System prompt oluştur
   */
  private buildSystemPrompt(options: {
    language?: string
    framework?: string
    style?: string
    includeComments?: boolean
    includeTypes?: boolean
  }): string {
    const { language = 'typescript', framework, style, includeComments, includeTypes } = options

    let prompt = `You are an expert ${language} developer. `

    if (framework) {
      prompt += `You specialize in ${framework}. `
    }

    if (style) {
      prompt += `Write code in ${style} style. `
    }

    if (includeComments) {
      prompt += `Include clear, concise comments explaining the code. `
    }

    if (includeTypes && (language === 'typescript' || language === 'python')) {
      prompt += `Use strict type annotations. `
    }

    prompt += `\n\nRules:
1. Write clean, idiomatic ${language} code
2. Follow best practices and design patterns
3. Handle errors appropriately
4. Make code maintainable and testable
5. Use descriptive variable and function names
6. Keep functions small and focused
7. Avoid code duplication (DRY principle)

IMPORTANT OUTPUT FORMAT:
- Always wrap code in markdown code blocks with language and filename
- Format: \`\`\`${language} filename.ext
- Example: \`\`\`typescript calculator.ts
- Use descriptive filenames based on the code content
- For multiple files, use separate code blocks with appropriate filenames

Return ONLY the code in markdown code blocks with filenames. Do NOT add explanations outside code blocks.`

    return prompt
  }

  /**
   * User prompt oluştur
   */
  private buildUserPrompt(prompt: string, context?: string): string {
    let userPrompt = prompt

    if (context) {
      userPrompt = `Context:\n${context}\n\nTask:\n${prompt}`
    }

    return userPrompt
  }

  /**
   * AI API çağrısı yap
   */
  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const { provider, model, apiKey, temperature, maxTokens } = this.aiConfig

    console.log('[CodeGeneratorAgent] Calling AI:', { provider, model, hasApiKey: !!apiKey })

    if (!apiKey) {
      throw new Error(`No API key configured for provider: ${provider}`)
    }

    // Provider'a göre API endpoint'i seç
    const endpoint = this.getProviderEndpoint(provider)
    console.log('[CodeGeneratorAgent] Endpoint:', endpoint)

    // Request body oluştur (provider'a göre format farklı olabilir)
    const requestBody = this.buildRequestBody(provider, {
      model,
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens
    })

    console.log('[CodeGeneratorAgent] Request body:', JSON.stringify(requestBody).substring(0, 200))

    try {
      // Provider-specific authentication headers
      // Each API uses different auth mechanisms:
      // - OpenAI/Groq: Bearer token in Authorization header
      // - Anthropic: x-api-key header (NOT Bearer token!)
      // - Google: API key in URL query parameter (no auth header)
      // - Ollama: No authentication (local server)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // OpenAI & Groq: Bearer token
      if (provider === 'openai' || provider === 'groq') {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      // Anthropic: x-api-key header with version
      if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
      }

      // Google: API key in URL, no auth header needed
      // Ollama: Local server, no auth needed

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      console.log('[CodeGeneratorAgent] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[CodeGeneratorAgent] API error:', errorData)
        throw new Error(
          `AI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        )
      }

      const data = await response.json()
      console.log('[CodeGeneratorAgent] Response data:', JSON.stringify(data).substring(0, 200))

      const content = this.extractContentFromResponse(provider, data)
      console.log('[CodeGeneratorAgent] Extracted content length:', content.length)

      return content
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to call AI API: ${String(error)}`)
    }
  }

  /**
   * Provider endpoint'i getir - Official API documentation verified
   *
   * Provider routing layer for multi-model support (Elysion Chamber Architecture)
   * This implements the ProviderRouter pattern for Router Agent's model selection
   */
  private getProviderEndpoint(provider: string): string {
    const { model, apiKey } = this.aiConfig

    const endpoints: Record<string, string> = {
      // OpenAI API - https://platform.openai.com/docs/api-reference/chat/create
      openai: 'https://api.openai.com/v1/chat/completions',

      // Anthropic API - https://docs.anthropic.com/en/api/messages
      anthropic: 'https://api.anthropic.com/v1/messages',

      // Google Gemini API - https://ai.google.dev/gemini-api/docs/text-generation
      // Note: Model name is included in URL path, API key as query parameter
      google: `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,

      // Groq API (OpenAI-compatible) - https://console.groq.com/docs/openai
      groq: 'https://api.groq.com/openai/v1/chat/completions',

      // Ollama Local API - https://github.com/ollama/ollama/blob/main/docs/api.md
      // Note: Uses /api/generate endpoint (not /api/chat)
      ollama: 'http://localhost:11434/api/generate'
    }

    const endpoint = endpoints[provider]
    if (!endpoint) {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    return endpoint
  }

  /**
   * Build request body for different AI providers
   *
   * Each provider has a unique API format:
   * - OpenAI/Groq: messages array with role/content
   * - Anthropic: separate system field, messages array
   * - Google: contents array with parts
   * - Ollama: single prompt string
   *
   * This abstraction allows Router Agent to switch providers transparently
   */
  private buildRequestBody(
    provider: string,
    options: {
      model: string
      systemPrompt: string
      userPrompt: string
      temperature: number
      maxTokens: number
    }
  ): Record<string, unknown> {
    const { model, systemPrompt, userPrompt, temperature, maxTokens } = options

    // OpenAI & Groq format - Standard chat completions API
    // Docs: https://platform.openai.com/docs/api-reference/chat/create
    if (provider === 'openai' || provider === 'groq') {
      return {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      }
    }

    // Anthropic format - Separate system parameter
    // Docs: https://docs.anthropic.com/en/api/messages
    if (provider === 'anthropic') {
      return {
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature,
        max_tokens: maxTokens
      }
    }

    // Google Gemini format - Contents with parts array
    // Docs: https://ai.google.dev/gemini-api/docs/text-generation
    if (provider === 'google') {
      return {
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      }
    }

    // Ollama format - Single prompt string, local inference
    // Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
    if (provider === 'ollama') {
      return {
        model,
        prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens
        }
      }
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  /**
   * Extract content from provider-specific response formats
   *
   * Response structures vary by provider:
   * - OpenAI/Groq: choices[0].message.content
   * - Anthropic: content[0].text
   * - Google: candidates[0].content.parts[0].text
   * - Ollama: response (direct string)
   *
   * This normalization allows consistent handling across all providers
   */
  private extractContentFromResponse(provider: string, data: Record<string, unknown>): string {
    // OpenAI & Groq format
    if (provider === 'openai' || provider === 'groq') {
      const choices = data.choices as Array<{ message?: { content?: string } }> | undefined
      return choices?.[0]?.message?.content || ''
    }

    // Anthropic format
    if (provider === 'anthropic') {
      const content = data.content as Array<{ text?: string }> | undefined
      return content?.[0]?.text || ''
    }

    // Google Gemini format
    if (provider === 'google') {
      const candidates = data.candidates as
        | Array<{ content?: { parts?: Array<{ text?: string }> } }>
        | undefined
      return candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    // Ollama format - Direct response string
    if (provider === 'ollama') {
      const response = data.response as string | undefined
      return response || ''
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  /**
   * AI response'u parse et
   */
  private parseAIResponse(response: string, language: string): GenerationResult {
    // Code block'u çıkar
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g
    const matches = [...response.matchAll(codeBlockRegex)]

    let code = response
    let explanation: string | undefined

    if (matches.length > 0) {
      // İlk code block'u al
      code = matches[0][1].trim()

      // Code block'tan sonraki açıklamayı al
      const afterCode = response.substring(response.indexOf(matches[0][0]) + matches[0][0].length)
      if (afterCode.trim()) {
        explanation = afterCode.trim()
      }
    }

    // Warnings ve suggestions (basit heuristic)
    const warnings: string[] = []
    const suggestions: string[] = []

    if (code.includes('any')) {
      warnings.push('Code contains "any" type - consider using specific types')
    }

    if (code.includes('console.log')) {
      suggestions.push('Consider using proper logging instead of console.log')
    }

    if (!code.includes('try') && !code.includes('catch')) {
      suggestions.push('Consider adding error handling')
    }

    return {
      code,
      language,
      explanation,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    }
  }

  /**
   * Template-based generation
   */
  async generateFromTemplate(
    templateName: string,
    variables: Record<string, string>
  ): Promise<GenerationResult> {
    const templates: Record<string, string> = {
      'react-component': `
import React from 'react';

interface {{ComponentName}}Props {
  {{props}}
}

export function {{ComponentName}}(props: {{ComponentName}}Props): React.JSX.Element {
  return (
    <div>
      {/* TODO: Implement {{ComponentName}} */}
    </div>
  );
}
`,
      'zustand-store': `
import { create } from 'zustand';

interface {{StoreName}}State {
  {{stateFields}}
  
  {{actions}}
}

export const use{{StoreName}} = create<{{StoreName}}State>()((set) => ({
  {{stateImplementation}}
}));
`,
      'typescript-function': `
/**
 * {{description}}
 */
export function {{functionName}}({{parameters}}): {{returnType}} {
  // TODO: Implement {{functionName}}
  throw new Error('Not implemented');
}
`
    }

    const template = templates[templateName]
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`)
    }

    // Replace variables
    let code = template
    for (const [key, value] of Object.entries(variables)) {
      code = code.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }

    return {
      code: code.trim(),
      language: 'typescript'
    }
  }

  /**
   * Night Orders formatında plan oluştur
   */
  async generateNightOrders(projectDescription: string): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      const prompt = `Create a detailed development plan (Night Orders) for the following project:

${projectDescription}

Return a JSON object with this structure:
{
  "id": "unique-id",
  "title": "Project Title",
  "description": "Brief description",
  "priority": "high|medium|low",
  "tasks": [
    {
      "id": "task-1",
      "title": "Task title",
      "type": "setup|implementation|testing|deployment",
      "description": "Detailed description",
      "steps": ["Step 1", "Step 2", ...],
      "files": ["path/to/file.ts", ...],
      "dependencies": ["task-id-1", ...],
      "estimatedTime": "2h"
    }
  ],
  "technologies": ["React", "TypeScript", ...],
  "architecture": "Brief architecture description"
}`

      const response = await this.callAI(
        'You are a senior software architect. Create detailed, actionable development plans.',
        prompt
      )

      // JSON parse et
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from response')
      }

      const nightOrders = JSON.parse(jsonMatch[1] || jsonMatch[0])

      return {
        success: true,
        executionTime: Date.now() - startTime,
        output: JSON.stringify(nightOrders, null, 2),
        metadata: {
          nightOrders
        }
      }
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
