/**
 * 🌙 NIGHT ORDERS PROTOCOL
 * Learning system that improves Llama3.2 by observing Claude's tool calling patterns
 * 
 * CORE CONCEPT:
 * - Watch Claude's successful tool calls
 * - Extract patterns (query → tools → sequence)
 * - Teach Llama3.2 to mimic successful approaches
 * - Improve over time through reinforcement
 * 
 * LEARNING TRIGGERS:
 * 1. Success Pattern: Claude completes task perfectly
 * 2. Error Pattern: Llama3.2 fails, Claude fixes
 * 3. User Feedback: Explicit approval/rejection
 * 4. Scheduled: Nightly consolidation
 */

import type { NightOrder, LearningPattern, ToolCallPattern } from '../types'

interface LearningMemory {
  patterns: LearningPattern[]
  toolSequences: ToolCallPattern[]
  successRate: Record<string, number>
  lastConsolidation: number
}

export class NightOrdersService {
  private memory: LearningMemory = {
    patterns: [],
    toolSequences: [],
    successRate: {},
    lastConsolidation: Date.now()
  }

  private readonly STORAGE_KEY = 'luma_night_orders'
  private readonly MAX_PATTERNS = 200
  // private readonly CONSOLIDATION_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours (for future use)

  constructor() {
    this.loadMemory()
  }

  /**
   * 📚 OBSERVE: Watch Claude's successful tool call
   */
  observeClaudeSuccess(
    userQuery: string,
    toolCalls: Array<{ name: string; args: Record<string, unknown>; result: string }>
  ): void {
    console.log('[NightOrders] 👁️ Observing Claude success pattern')

    // Extract query keywords
    const keywords = this.extractKeywords(userQuery)

    // Create tool sequence pattern
    const sequence = toolCalls.map((tc) => ({
      tool: tc.name,
      args: tc.args,
      order: toolCalls.indexOf(tc)
    }))

    // Create learning pattern
    const pattern: LearningPattern = {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: 'success_pattern',
      trigger: 'claude_observation',
      query: userQuery,
      keywords,
      toolSequence: sequence,
      outcome: 'success',
      timestamp: Date.now(),
      confidence: 0.8, // Start with high confidence for Claude patterns
      usageCount: 0
    }

    this.addPattern(pattern)
    this.updateSuccessRate(toolCalls.map((tc) => tc.name), true)
  }

  /**
   * ❌ LEARN FROM FAILURE: Llama3.2 made wrong tool choice
   */
  observeFailure(
    userQuery: string,
    attemptedTools: string[],
    correctTools: string[],
    errorMessage: string
  ): void {
    console.log('[NightOrders] 📖 Learning from failure')

    const keywords = this.extractKeywords(userQuery)

    const pattern: LearningPattern = {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: 'error_pattern',
      trigger: 'llama_failure',
      query: userQuery,
      keywords,
      toolSequence: correctTools.map((tool, idx) => ({
        tool,
        args: {},
        order: idx
      })),
      outcome: 'failure',
      timestamp: Date.now(),
      confidence: 0.5, // Lower confidence for error corrections
      usageCount: 0,
      errorContext: {
        attemptedTools,
        errorMessage
      }
    }

    this.addPattern(pattern)
    this.updateSuccessRate(attemptedTools, false)
  }

  /**
   * 🎯 SUGGEST: Get tool suggestions for Llama3.2
   */
  suggestTools(userQuery: string): string[] {
    const keywords = this.extractKeywords(userQuery)

    // Find matching patterns
    const matches = this.memory.patterns
      .filter((p) => {
        // Match keywords
        const matchScore = keywords.filter((kw) => p.keywords.includes(kw)).length
        return matchScore > 0 && p.outcome === 'success'
      })
      .sort((a, b) => {
        // Sort by confidence and usage count
        const scoreA = a.confidence * (1 + a.usageCount * 0.1)
        const scoreB = b.confidence * (1 + b.usageCount * 0.1)
        return scoreB - scoreA
      })

    if (matches.length === 0) {
      return []
    }

    // Get tools from best pattern
    const bestPattern = matches[0]
    const tools = bestPattern.toolSequence.map((ts) => ts.tool)

    console.log(`[NightOrders] 💡 Suggested tools:`, tools)
    console.log(`[NightOrders] Based on pattern: ${bestPattern.id}`)

    // Increment usage count
    bestPattern.usageCount++
    this.saveMemory()

    return tools
  }

  /**
   * 🧠 REFLECTION: Generate improvement recommendations
   */
  async generateReflection(): Promise<NightOrder> {
    const now = Date.now()
    const recentPatterns = this.memory.patterns.filter(
      (p) => now - p.timestamp < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    )

    const successCount = recentPatterns.filter((p) => p.outcome === 'success').length
    const failureCount = recentPatterns.filter((p) => p.outcome === 'failure').length
    const totalCount = recentPatterns.length

    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0

    // Analyze top tools
    const toolUsage: Record<string, number> = {}
    recentPatterns.forEach((p) => {
      p.toolSequence.forEach((ts) => {
        toolUsage[ts.tool] = (toolUsage[ts.tool] || 0) + 1
      })
    })

    const topTools = Object.entries(toolUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tool, count]) => `${tool} (${count}x)`)

    return {
      type: 'reflection',
      trigger: 'scheduled',
      data: {
        context: `Learning Analysis (Last 7 days)`,
        analysis: `
Total Patterns: ${totalCount}
Success: ${successCount} (${successRate.toFixed(1)}%)
Failures: ${failureCount}

Top Tools Used:
${topTools.join('\n')}

Memory Size: ${this.memory.patterns.length}/${this.MAX_PATTERNS}
        `.trim(),
        learnings: [
          `Success rate: ${successRate.toFixed(1)}%`,
          `Most effective tool: ${topTools[0] || 'N/A'}`,
          `Pattern diversity: ${new Set(this.memory.patterns.map((p) => p.keywords.join(','))).size} unique queries`
        ],
        actionItems: [
          successRate < 70
            ? 'Increase observation of Claude patterns'
            : 'Maintain current learning rate',
          this.memory.patterns.length > this.MAX_PATTERNS * 0.8
            ? 'Schedule pattern consolidation'
            : 'Memory capacity healthy'
        ]
      },
      timestamp: now
    }
  }

  /**
   * 🗜️ CONSOLIDATE: Merge similar patterns, remove outdated
   */
  consolidatePatterns(): void {
    console.log('[NightOrders] 🗜️ Consolidating patterns...')

    const before = this.memory.patterns.length

    // Remove low-confidence unused patterns
    this.memory.patterns = this.memory.patterns.filter((p) => {
      if (p.usageCount === 0 && p.confidence < 0.5) {
        return false // Remove
      }
      return true
    })

    // Sort by confidence and usage
    this.memory.patterns.sort((a, b) => {
      const scoreA = a.confidence * (1 + a.usageCount * 0.1)
      const scoreB = b.confidence * (1 + b.usageCount * 0.1)
      return scoreB - scoreA
    })

    // Keep only MAX_PATTERNS
    if (this.memory.patterns.length > this.MAX_PATTERNS) {
      this.memory.patterns = this.memory.patterns.slice(0, this.MAX_PATTERNS)
    }

    const after = this.memory.patterns.length
    console.log(`[NightOrders] Consolidated: ${before} → ${after} patterns`)

    this.memory.lastConsolidation = Date.now()
    this.saveMemory()
  }

  /**
   * 📊 GET STATS
   */
  getStats(): {
    totalPatterns: number
    successPatterns: number
    failurePatterns: number
    avgConfidence: number
    mostUsedTools: string[]
  } {
    const successPatterns = this.memory.patterns.filter((p) => p.outcome === 'success').length
    const failurePatterns = this.memory.patterns.filter((p) => p.outcome === 'failure').length

    const avgConfidence =
      this.memory.patterns.length > 0
        ? this.memory.patterns.reduce((sum, p) => sum + p.confidence, 0) /
          this.memory.patterns.length
        : 0

    const toolUsage: Record<string, number> = {}
    this.memory.patterns.forEach((p) => {
      p.toolSequence.forEach((ts) => {
        toolUsage[ts.tool] = (toolUsage[ts.tool] || 0) + 1
      })
    })

    const mostUsedTools = Object.entries(toolUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tool]) => tool)

    return {
      totalPatterns: this.memory.patterns.length,
      successPatterns,
      failurePatterns,
      avgConfidence,
      mostUsedTools
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction (can be improved with NLP)
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'ne',
      'nedir',
      'nasıl',
      'gibi',
      'bir',
      'bu',
      've',
      'ile'
    ])

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 5) // Max 5 keywords
  }

  private addPattern(pattern: LearningPattern): void {
    this.memory.patterns.unshift(pattern) // Add to front

    // Auto-consolidate if too many patterns
    if (this.memory.patterns.length > this.MAX_PATTERNS * 1.2) {
      this.consolidatePatterns()
    } else {
      this.saveMemory()
    }
  }

  private updateSuccessRate(tools: string[], success: boolean): void {
    tools.forEach((tool) => {
      if (!this.memory.successRate[tool]) {
        this.memory.successRate[tool] = 0.5 // Start neutral
      }

      // Exponential moving average
      const alpha = 0.1
      const newValue = success ? 1 : 0
      this.memory.successRate[tool] =
        alpha * newValue + (1 - alpha) * this.memory.successRate[tool]
    })

    this.saveMemory()
  }

  private loadMemory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.memory = JSON.parse(stored)
        console.log(`[NightOrders] 📚 Loaded ${this.memory.patterns.length} patterns`)
      }
    } catch (error) {
      console.error('[NightOrders] Failed to load memory:', error)
    }
  }

  private saveMemory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memory))
    } catch (error) {
      console.error('[NightOrders] Failed to save memory:', error)
    }
  }
}

// Singleton instance
export const nightOrders = new NightOrdersService()
