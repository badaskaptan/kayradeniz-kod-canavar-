/* eslint-disable @typescript-eslint/no-explicit-any */
// 🧠 Intelligence Analysis Fleet - Ollama Agent System
// Phase 1.3: Process observations to extract patterns and teach user

import { randomUUID } from 'crypto'
import type { Observation } from '../types/observation'
import type {
  Pattern,
  Reflexion,
  TeachingMoment,
  KnowledgeEntry,
  ShipsLogbook
} from '../shared/ships-logbook'

/**
 * Configuration for Ollama LLM calls
 */
export interface OllamaConfig {
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}

/**
 * Analysis result from the Intelligence Fleet
 */
export interface FleetAnalysis {
  observationId: string
  patterns: Pattern[]
  reflexions: Reflexion[]
  teachingMoments: TeachingMoment[]
  knowledgeEntries: KnowledgeEntry[]
  timestamp: number
}

/**
 * IntelligenceFleet processes observations from Claude's tool executions
 * and extracts patterns, reflexions, and teaching moments using Ollama.
 *
 * Philosophy (from Master Plan):
 * "Every observation is analyzed by our specialist crew to extract intelligence:
 * - RouterAgent breaks down the trade route into steps
 * - ReflexionAgent analyzes what worked/failed
 * - NarratorAgent creates teaching moments for the crew (user)"
 *
 * Key Requirements:
 * - ASYNC: All processing happens in background
 * - NON-BLOCKING: Never slows down Claude
 * - INTELLIGENT: Uses Ollama to understand patterns
 */
export class IntelligenceFleet {
  private logbook: ShipsLogbook
  private ollamaConfig: OllamaConfig
  private processingQueue: Observation[] = []
  private isProcessing = false

  constructor(logbook: ShipsLogbook, ollamaConfig?: Partial<OllamaConfig>) {
    this.logbook = logbook
    this.ollamaConfig = {
      baseUrl: ollamaConfig?.baseUrl || 'http://localhost:11434',
      model: ollamaConfig?.model || 'qwen2.5-coder:7b',
      temperature: ollamaConfig?.temperature || 0.3,
      maxTokens: ollamaConfig?.maxTokens || 1000
    }

    console.log('🧠 Intelligence Fleet initialized')
    console.log(`   Ollama: ${this.ollamaConfig.baseUrl}`)
    console.log(`   Model: ${this.ollamaConfig.model}`)
  }

  /**
   * Process a new observation from Claude
   * This is called by ActivityObserver's onComplete callback
   */
  async processObservation(observation: Observation): Promise<void> {
    // Queue for background processing (non-blocking)
    this.processingQueue.push(observation)

    console.log(
      `🧠 Observation queued for analysis: ${observation.id.substring(0, 8)} ` +
        `(${this.processingQueue.length} in queue)`
    )

    // Start processing if not already running
    if (!this.isProcessing) {
      setImmediate(() => this.processQueue())
    }
  }

  /**
   * Process the observation queue in background
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      while (this.processingQueue.length > 0) {
        const observation = this.processingQueue.shift()!

        try {
          const analysis = await this.analyzeObservation(observation)
          await this.storeAnalysis(analysis)

          console.log(
            `🧠 Analysis complete: ${observation.id.substring(0, 8)} ` +
              `(${analysis.patterns.length} patterns, ${analysis.reflexions.length} reflexions, ` +
              `${analysis.teachingMoments.length} lessons)`
          )
        } catch (error) {
          console.error(
            `🧠 Analysis failed for ${observation.id.substring(0, 8)}:`,
            error instanceof Error ? error.message : 'Unknown error'
          )
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Analyze a single observation and extract intelligence
   */
  private async analyzeObservation(observation: Observation): Promise<FleetAnalysis> {
    const startTime = Date.now()

    // Extract patterns from tool sequence
    const patterns = await this.extractPatterns(observation)

    // Perform reflexion analysis (what worked/failed)
    const reflexions = await this.performReflexion(observation)

    // Create teaching moments if significant
    const teachingMoments = await this.createTeachingMoments(observation, reflexions)

    // Extract knowledge entries
    const knowledgeEntries = await this.extractKnowledge(observation, patterns)

    console.log(
      `🧠 Analysis took ${Date.now() - startTime}ms for ${observation.id.substring(0, 8)}`
    )

    return {
      observationId: observation.id,
      patterns,
      reflexions,
      teachingMoments,
      knowledgeEntries,
      timestamp: Date.now()
    }
  }

  /**
   * Extract patterns from tool execution sequence
   * Uses Ollama to identify common tool patterns
   */
  private async extractPatterns(observation: Observation): Promise<Pattern[]> {
    if (observation.toolCalls.length === 0) {
      return []
    }

    const toolSequence = observation.toolCalls.map((tc) => tc.name)
    const sequenceKey = toolSequence.join(' → ')

    // Check if pattern already exists
    const existingPatterns = this.logbook.getTopPatterns(100)
    const existing = existingPatterns.find((p) => p.toolSequence === JSON.stringify(toolSequence))

    if (existing) {
      // Update existing pattern stats
      const updated: Pattern = {
        ...existing,
        usageCount: existing.usageCount + 1,
        successRate:
          (existing.successRate * existing.usageCount + (observation.success ? 1 : 0)) /
          (existing.usageCount + 1),
        avgExecutionTime:
          (existing.avgExecutionTime * existing.usageCount + observation.totalExecutionTime) /
          (existing.usageCount + 1),
        lastUsedAt: Date.now()
      }

      this.logbook.savePattern(updated)
      return [updated]
    }

    // New pattern - use Ollama to categorize and name it
    const category = await this.categorizePattern(toolSequence)
    const name = await this.namePattern(toolSequence, observation.userMessage)

    const pattern: Pattern = {
      id: randomUUID(),
      name: name || sequenceKey,
      toolSequence: JSON.stringify(toolSequence),
      successRate: observation.success ? 1.0 : 0.0,
      usageCount: 1,
      avgExecutionTime: observation.totalExecutionTime,
      category,
      createdAt: Date.now(),
      lastUsedAt: Date.now()
    }

    return [pattern]
  }

  /**
   * Categorize a tool sequence using Ollama
   */
  private async categorizePattern(toolSequence: string[]): Promise<string> {
    try {
      const prompt = `Analyze this tool sequence and categorize it (one word: file-ops, search, analysis, refactor, testing, etc.):
Tools: ${toolSequence.join(' → ')}

Category:`

      const category = await this.callOllama(prompt, 50)
      return category.trim().toLowerCase() || 'general'
    } catch (error) {
      console.warn('Failed to categorize pattern, using default:', error)
      return 'general'
    }
  }

  /**
   * Name a pattern using Ollama based on tools and context
   */
  private async namePattern(toolSequence: string[], userMessage: string): Promise<string> {
    try {
      const prompt = `Create a short descriptive name (max 5 words) for this action:
User asked: "${userMessage}"
Tools used: ${toolSequence.join(' → ')}

Name:`

      const name = await this.callOllama(prompt, 50)
      return name.trim() || toolSequence.join(' → ')
    } catch (error) {
      console.warn('Failed to name pattern, using sequence:', error)
      return toolSequence.join(' → ')
    }
  }

  /**
   * Perform reflexion analysis on the observation
   * Identifies what worked, what failed, and why
   */
  private async performReflexion(observation: Observation): Promise<Reflexion[]> {
    if (observation.success) {
      // Simple success case - skip detailed reflexion
      return []
    }

    try {
      const failedTools = observation.toolCalls.filter((tc) => !tc.success)

      const prompt = `Analyze this failed AI execution and suggest improvements:

User Request: ${observation.userMessage}
Failed Tools: ${failedTools.map((t) => t.name).join(', ')}
Error Context: ${failedTools.map((t) => `${t.name}: ${t.result.substring(0, 200)}`).join('\n')}

Provide:
1. Root cause (1 sentence)
2. Confidence (0.0-1.0)
3. Suggested improvements (max 3 bullets)

Analysis:`

      const analysis = await this.callOllama(prompt, 500)

      const reflexion: Reflexion = {
        id: randomUUID(),
        observationId: observation.id,
        confidence: this.extractConfidence(analysis),
        metrics: JSON.stringify({
          failedTools: failedTools.length,
          totalTools: observation.toolCalls.length,
          executionTime: observation.totalExecutionTime
        }),
        suggestedImprovements: analysis,
        createdAt: Date.now()
      }

      return [reflexion]
    } catch (error) {
      console.warn('Reflexion analysis failed:', error)
      return []
    }
  }

  /**
   * Extract confidence score from reflexion text
   */
  private extractConfidence(text: string): number {
    const match = text.match(/confidence[:\s]+([0-9.]+)/i)
    if (match) {
      const conf = parseFloat(match[1])
      return conf > 1 ? conf / 100 : conf
    }
    return 0.7 // Default medium confidence
  }

  /**
   * Create teaching moments from successful observations
   */
  private async createTeachingMoments(
    observation: Observation,
    _reflexions: Reflexion[]
  ): Promise<TeachingMoment[]> {
    // Only create teaching moments for successful, multi-tool observations
    if (!observation.success || observation.toolCalls.length < 2) {
      return []
    }

    try {
      const prompt = `Create a teaching moment for this successful AI workflow:

User Request: ${observation.userMessage}
Tools Used: ${observation.toolCalls.map((t) => t.name).join(' → ')}
Result: ${observation.claudeResponse.substring(0, 300)}

Generate:
1. Concept (short title)
2. Explanation (2-3 sentences)
3. Difficulty (beginner/intermediate/advanced)

Teaching:`

      const teaching = await this.callOllama(prompt, 400)

      const moment: TeachingMoment = {
        id: randomUUID(),
        timestamp: Date.now(),
        concept: this.extractConcept(teaching, observation.userMessage),
        explanation: teaching,
        difficulty: this.extractDifficulty(teaching),
        category: 'workflow'
      }

      return [moment]
    } catch (error) {
      console.warn('Teaching moment creation failed:', error)
      return []
    }
  }

  /**
   * Extract concept from teaching text
   */
  private extractConcept(text: string, fallback: string): string {
    const match = text.match(/concept[:\s]+([^\n]+)/i)
    return match ? match[1].trim() : fallback.substring(0, 50)
  }

  /**
   * Extract difficulty from teaching text
   */
  private extractDifficulty(text: string): 'beginner' | 'intermediate' | 'advanced' {
    const lower = text.toLowerCase()
    if (lower.includes('advanced') || lower.includes('complex')) return 'advanced'
    if (lower.includes('intermediate') || lower.includes('moderate')) return 'intermediate'
    return 'beginner'
  }

  /**
   * Extract knowledge entries from patterns
   */
  private async extractKnowledge(
    observation: Observation,
    patterns: Pattern[]
  ): Promise<KnowledgeEntry[]> {
    // Only extract knowledge from successful multi-tool observations
    if (!observation.success || patterns.length === 0) {
      return []
    }

    const entries: KnowledgeEntry[] = patterns.map((pattern) => ({
      id: randomUUID(),
      category: pattern.category,
      content: `Pattern "${pattern.name}": ${pattern.toolSequence}`,
      source: 'claude',
      relevanceScore: pattern.successRate,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }))

    return entries
  }

  /**
   * Store analysis results in the logbook
   */
  private async storeAnalysis(analysis: FleetAnalysis): Promise<void> {
    // Save patterns
    for (const pattern of analysis.patterns) {
      this.logbook.savePattern(pattern)
    }

    // Save reflexions
    for (const reflexion of analysis.reflexions) {
      this.logbook.saveReflexion(reflexion)
    }

    // Save teaching moments
    for (const moment of analysis.teachingMoments) {
      this.logbook.saveTeachingMoment(moment)
    }

    // Save knowledge entries
    for (const entry of analysis.knowledgeEntries) {
      this.logbook.saveKnowledge(entry)
    }
  }

  /**
   * Call Ollama for LLM inference
   */
  private async callOllama(prompt: string, maxTokens: number): Promise<string> {
    const response = await fetch(`${this.ollamaConfig.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaConfig.model,
        prompt,
        stream: false,
        options: {
          temperature: this.ollamaConfig.temperature,
          num_predict: maxTokens
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.response || ''
  }

  /**
   * Get current processing stats
   */
  getStats(): {
    queueSize: number
    isProcessing: boolean
    modelConfig: OllamaConfig
  } {
    return {
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      modelConfig: { ...this.ollamaConfig }
    }
  }

  /**
   * Update Ollama configuration
   */
  updateConfig(config: Partial<OllamaConfig>): void {
    this.ollamaConfig = { ...this.ollamaConfig, ...config }
    console.log('🧠 Intelligence Fleet config updated:', this.ollamaConfig)
  }
}
