/**
 * ==================== SIGMA REFLEXION ENGINE ====================
 *
 * Meta-cognitive decision validation system
 *
 * Σ (Sigma) = Sum of all decision components
 * σ(x) (Sigmoid) = Probability normalization (0-1)
 *
 * Purpose:
 * - Evaluates AI responses for consistency, relevance, and integrity
 * - Does NOT touch Claude MCP server (post-processing only)
 * - Provides feedback loop for Night Orders learning
 *
 * Architecture Position:
 * Claude/Ollama → Response → [SIGMA] → ToolBridge → Night Orders
 *
 * @author LUMA AI Team
 * @version 1.0.0
 */

export interface SigmaAnalysis {
  confidence: number // 0-1 (sigmoid normalized)
  relevance: number // Context match (0-1)
  consistency: number // Previous patterns match (0-1)
  integrity: number // Semantic quality (0-1)
  needsRevision: boolean // True if confidence < threshold
  revisedPrompt?: string // Re-structured prompt if needed
  reasoning: string // Explanation for Usta Modu
  metrics: {
    sigmoidScore: number // Raw sigmoid output
    totalScore: number // Pre-sigmoid score
  }
}

export interface SigmaContext {
  currentResponse: string
  originalPrompt: string
  sessionHistory: Array<{ prompt: string; response: string }>
  workspacePath?: string
  toolsUsed?: string[]
}

export interface SigmaMetric {
  timestamp: Date
  confidence: number
  relevance: number
  consistency: number
  integrity: number
  wasRevised: boolean
  responseLength: number
}

class SigmaReflexionEngine {
  private learningThreshold = 0.75 // Minimum confidence for acceptance
  private metricsHistory: SigmaMetric[] = []
  private maxHistorySize = 100

  /**
   * 🧠 Main evaluation function - Analyzes AI response quality
   *
   * This is the SAFE integration point - runs AFTER Claude/Ollama response,
   * BEFORE ToolBridge execution. Does NOT modify MCP flow.
   */
  async evaluate(context: SigmaContext): Promise<SigmaAnalysis> {
    console.log('[Sigma] 🔍 Evaluating response...')

    // Calculate individual scores
    const relevance = this.calculateRelevance(context)
    const consistency = this.calculateConsistency(context)
    const integrity = this.calculateIntegrity(context)

    // 📊 Sigma Score (weighted average)
    const totalScore = relevance * 0.4 + consistency * 0.3 + integrity * 0.3

    // 🔄 Sigmoid transformation (normalize to 0-1)
    // Formula: σ(x) = 1 / (1 + e^(-x))
    // Maps [-∞, +∞] → [0, 1]
    const sigmoidScore = this.sigmoid(totalScore * 10 - 5)

    const needsRevision = sigmoidScore < this.learningThreshold

    const analysis: SigmaAnalysis = {
      confidence: sigmoidScore,
      relevance,
      consistency,
      integrity,
      needsRevision,
      revisedPrompt: needsRevision ? this.generateRevisedPrompt(context) : undefined,
      reasoning: this.generateReasoning(sigmoidScore, relevance, consistency, integrity),
      metrics: {
        sigmoidScore,
        totalScore
      }
    }

    console.log('[Sigma] ✅ Analysis complete:', {
      confidence: `${(sigmoidScore * 100).toFixed(1)}%`,
      needsRevision
    })

    return analysis
  }

  /**
   * 📈 Sigmoid function - Probability normalization
   *
   * Mathematical formula: σ(x) = 1 / (1 + e^(-x))
   *
   * Purpose: Convert unbounded scores to probability range [0, 1]
   * Properties:
   * - Smooth gradient (no sharp jumps)
   * - Outlier resistant (extreme values compressed)
   * - ML-friendly (used in neural networks)
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x))
  }

  /**
   * 🎯 Relevance calculation - Does response match the prompt?
   *
   * Method: Keyword overlap analysis
   * Score: intersection(prompt_keywords, response_keywords) / total_keywords
   */
  private calculateRelevance(context: SigmaContext): number {
    const { currentResponse, originalPrompt } = context

    const promptKeywords = this.extractKeywords(originalPrompt)
    const responseKeywords = this.extractKeywords(currentResponse)

    if (promptKeywords.length === 0) return 1.0 // Empty prompt = always relevant

    const overlap = promptKeywords.filter((kw) => responseKeywords.includes(kw)).length
    const baseScore = overlap / promptKeywords.length

    // Bonus: Response mentions workspace files/tools
    const hasWorkspaceContext = context.workspacePath
      ? currentResponse.includes(context.workspacePath)
      : false
    const hasToolMention = context.toolsUsed
      ? context.toolsUsed.some((tool) => currentResponse.includes(tool))
      : false

    let bonus = 0
    if (hasWorkspaceContext) bonus += 0.1
    if (hasToolMention) bonus += 0.1

    return Math.min(baseScore + bonus, 1.0)
  }

  /**
   * 🔗 Consistency calculation - Does it match previous responses?
   *
   * Method: Compare with last N responses in session
   * Score: average similarity with recent history
   */
  private calculateConsistency(context: SigmaContext): number {
    const { currentResponse, sessionHistory } = context

    if (sessionHistory.length === 0) return 1.0 // First response = always consistent

    // Compare with last 3 responses
    const recentResponses = sessionHistory.slice(-3).map((h) => h.response)
    const currentKeywords = this.extractKeywords(currentResponse)

    if (currentKeywords.length === 0) return 0.5 // Empty response = medium consistency

    let totalSimilarity = 0
    for (const prevResponse of recentResponses) {
      const prevKeywords = this.extractKeywords(prevResponse)
      const overlap = currentKeywords.filter((kw) => prevKeywords.includes(kw)).length
      const similarity = overlap / Math.max(currentKeywords.length, prevKeywords.length, 1)
      totalSimilarity += similarity
    }

    return totalSimilarity / recentResponses.length
  }

  /**
   * 🧬 Integrity calculation - Semantic quality check
   *
   * Checks:
   * - Has code blocks (if technical question)
   * - Has explanation (not just code dump)
   * - Has structure (paragraphs, formatting)
   * - Has meaningful length
   */
  private calculateIntegrity(context: SigmaContext): number {
    const { currentResponse } = context

    let score = 0.3 // Baseline for any response

    // Quality indicators
    const hasCodeBlock = /```[\s\S]*?```/.test(currentResponse)
    const hasExplanation = currentResponse.length > 100
    const hasStructure = /\n\n/.test(currentResponse) || /^#+\s/m.test(currentResponse) // Paragraphs or headers
    const hasMeaningfulLength = currentResponse.length >= 50 && currentResponse.length <= 5000
    const hasNoErrors = !/(error|undefined|null reference|failed)/i.test(currentResponse)

    if (hasCodeBlock) score += 0.15
    if (hasExplanation) score += 0.15
    if (hasStructure) score += 0.15
    if (hasMeaningfulLength) score += 0.15
    if (hasNoErrors) score += 0.1

    return Math.min(score, 1.0)
  }

  /**
   * 📝 Generate revised prompt - If confidence is low, restructure the question
   */
  private generateRevisedPrompt(context: SigmaContext): string {
    const confidence = this.sigmoid(
      (this.calculateRelevance(context) +
        this.calculateConsistency(context) +
        this.calculateIntegrity(context)) *
        10 -
        5
    )

    return `${context.originalPrompt}\n\n**[Sigma Reflexion Note]**\nPrevious response had low confidence (${(confidence * 100).toFixed(1)}%).\nPlease provide:\n1. More context-specific details\n2. Code examples if applicable\n3. Step-by-step explanation\n4. Relevant to workspace: ${context.workspacePath || 'N/A'}`
  }

  /**
   * 💭 Generate reasoning explanation for Usta Modu
   */
  private generateReasoning(
    confidence: number,
    relevance: number,
    consistency: number,
    integrity: number
  ): string {
    const confidencePercent = (confidence * 100).toFixed(1)
    const relevancePercent = (relevance * 100).toFixed(1)
    const consistencyPercent = (consistency * 100).toFixed(1)
    const integrityPercent = (integrity * 100).toFixed(1)

    const status =
      confidence >= 0.75 ? '✅ Yüksek Güvenilir' : '⚠️ Düşük Güven - Yeniden Değerlendirme Önerilir'

    return (
      `**Sigma Reflexion Analizi:**\n\n` +
      `🎯 **Genel Güven Skoru:** ${confidencePercent}% (Sigmoid: σ(x))\n\n` +
      `**Bileşenler:**\n` +
      `- Bağlam Uyumu: ${relevancePercent}%\n` +
      `- Tutarlılık: ${consistencyPercent}%\n` +
      `- Semantik Bütünlük: ${integrityPercent}%\n\n` +
      `**Durum:** ${status}\n\n` +
      `${confidence < 0.75 ? '**Öneri:** Yanıt yeniden yapılandırılmalı. Daha detaylı açıklama ve kod örnekleri eklenebilir.' : '**Öneri:** Yanıt kabul edilebilir kalitede.'}`
    )
  }

  /**
   * 🔑 Extract keywords from text (simple tokenization)
   */
  private extractKeywords(text: string): string[] {
    // Remove code blocks to avoid noise
    const cleanText = text.replace(/```[\s\S]*?```/g, '')

    return cleanText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3) // Filter short words
      .filter((word) => !this.isStopWord(word))
  }

  /**
   * 🚫 Check if word is a stop word (common words to ignore)
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'this',
      'that',
      'with',
      'from',
      'have',
      'will',
      'your',
      'they',
      'been',
      'were',
      'what',
      'when',
      'where',
      'which',
      'their',
      'about'
    ]
    return stopWords.includes(word)
  }

  /**
   * 📊 Record metric for learning (sends to Usta Modu + Night Orders)
   */
  recordMetric(analysis: SigmaAnalysis, wasRevised: boolean, responseLength: number): void {
    const metric: SigmaMetric = {
      timestamp: new Date(),
      confidence: analysis.confidence,
      relevance: analysis.relevance,
      consistency: analysis.consistency,
      integrity: analysis.integrity,
      wasRevised,
      responseLength
    }

    // Store in memory (limited history)
    this.metricsHistory.push(metric)
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift() // Remove oldest
    }

    // 🎓 Send to Usta Modu via IPC
    if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('sigma:metric', {
        ...metric,
        reasoning: analysis.reasoning
      })
    }

    console.log('[Sigma] 📊 Metric recorded:', {
      confidence: `${(metric.confidence * 100).toFixed(1)}%`,
      wasRevised
    })
  }

  /**
   * 📈 Get average confidence from recent metrics
   */
  getAverageConfidence(lastN = 10): number {
    if (this.metricsHistory.length === 0) return 0.5

    const recentMetrics = this.metricsHistory.slice(-lastN)
    const avgConfidence =
      recentMetrics.reduce((sum, m) => sum + m.confidence, 0) / recentMetrics.length

    return avgConfidence
  }

  /**
   * 🔄 Reset metrics (useful for new sessions)
   */
  resetMetrics(): void {
    this.metricsHistory = []
    console.log('[Sigma] 🔄 Metrics history cleared')
  }
}

// Singleton instance
export const sigmaReflexion = new SigmaReflexionEngine()
