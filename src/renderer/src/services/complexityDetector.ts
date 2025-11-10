/**
 * 🧠 Complexity Detector - Analyze user requests for multi-step missions
 *
 * PURPOSE: Determine if Night Orders (context-aware execution) is needed
 *
 * WHY NIGHT ORDERS EXISTS:
 * - Lightweight models (Gemma 2B, Qwen 7B, Phi 3.8B) have LIMITED CONTEXT (2K-8K tokens)
 * - They LOSE TRACK during multi-step tasks → hallucination, drift, failure
 * - Night Orders injects FULL CONTEXT at each step → agent never forgets the mission
 *
 * WHEN TO USE:
 * - Small models (< 8B params): ALWAYS use for complex tasks (3+ steps)
 * - Medium models (7B-14B): Use for very complex tasks (5+ steps)
 * - Large models (70B+, Claude Opus, GPT-4): Optional - they have 200K+ context
 *
 * DETECTION LOGIC:
 * - Simple (1-2 steps): Direct execution, no Night Orders
 * - Complex (3+ steps): Night Orders with continuous context injection
 */

export interface ComplexityAnalysis {
  isComplex: boolean
  confidence: number // 0-1
  reason: string
  suggestedMission?: string
  estimatedSteps?: number
  category?: 'refactor' | 'feature' | 'fix' | 'test' | 'documentation'
  recommendNightOrders: boolean // True if model would benefit from context preservation
}

/**
 * Analyze message complexity
 */
export function analyzeComplexity(message: string): ComplexityAnalysis {
  const lowerMessage = message.toLowerCase()

  // 🔴 SIMPLE: Single-step, direct requests
  const simplePatterns = [
    /^(hi|hello|hey|selam|merhaba)/i,
    /^what is/i,
    /^explain/i,
    /^how (do|does|can)/i,
    /^show me/i,
    /^read/i,
    /^open/i,
    /^list/i,
    /add (a |one )?function/i,
    /create (a |one )?file/i,
    /fix (this |the )?bug/i
  ]

  for (const pattern of simplePatterns) {
    if (pattern.test(message)) {
      return {
        isComplex: false,
        confidence: 0.9,
        reason: 'Single-step request detected',
        recommendNightOrders: false
      }
    }
  }

  // 🟡 COMPLEX: Multi-step, architectural changes
  const complexKeywords = [
    // Refactoring
    { words: ['refactor', 'restructure', 'reorganize'], category: 'refactor' as const, steps: 5 },
    { words: ['migrate', 'upgrade', 'convert to'], category: 'refactor' as const, steps: 6 },
    
    // Features
    { words: ['implement', 'build', 'create', 'add'], category: 'feature' as const, steps: 4 },
    { words: ['integrate', 'connect with'], category: 'feature' as const, steps: 5 },
    
    // System-wide
    { words: ['authentication', 'auth system', 'jwt'], category: 'refactor' as const, steps: 6 },
    { words: ['database', 'api', 'backend'], category: 'feature' as const, steps: 5 },
    { words: ['theme', 'styling', 'design system'], category: 'feature' as const, steps: 4 },
    
    // Testing
    { words: ['test suite', 'e2e test', 'integration test'], category: 'test' as const, steps: 4 },

    // Documentation
    { words: ['document', 'documentation'], category: 'documentation' as const, steps: 3 }
  ]

  for (const { words, category, steps } of complexKeywords) {
    for (const word of words) {
      if (lowerMessage.includes(word)) {
        // Check for additional complexity indicators
        const hasMultipleSteps = /and|then|after|also|plus/i.test(message)
        const hasEntireSystem = /entire|whole|all|complete|full/i.test(message)
        const isLongRequest = message.split(' ').length > 10

        const complexityBoost =
          (hasMultipleSteps ? 0.2 : 0) + (hasEntireSystem ? 0.2 : 0) + (isLongRequest ? 0.1 : 0)

        const confidence = Math.min(0.95, 0.7 + complexityBoost)

        return {
          isComplex: true,
          confidence,
          reason: `Detected complex ${category} task: "${word}"`,
          suggestedMission: message,
          estimatedSteps: steps + (hasMultipleSteps ? 2 : 0),
          category,
          recommendNightOrders: true
        }
      }
    }
  }

  // 🟢 MODERATE: Could be complex, analyze further
  const wordCount = message.split(' ').length
  const hasConjunctions = /and|then|after|also|plus/i.test(message)
  const hasMultipleVerbs =
    (message.match(/create|add|update|delete|fix|test|build/gi) || []).length > 1

  if (wordCount > 15 && (hasConjunctions || hasMultipleVerbs)) {
    return {
      isComplex: true,
      confidence: 0.6,
      reason: 'Multiple actions detected in request',
      suggestedMission: message,
      estimatedSteps: 4,
      recommendNightOrders: true
    }
  }

  // Default: Not complex
  return {
    isComplex: false,
    confidence: 0.8,
    reason: 'Single-step or direct request',
    recommendNightOrders: false
  }
}

/**
 * Extract mission title from user message
 */
export function extractMissionTitle(message: string): string {
  // Remove common prefixes
  let title = message
    .replace(/^(please|could you|can you|i want to|i need to|help me)\s+/i, '')
    .trim()

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Limit length
  if (title.length > 80) {
    title = title.substring(0, 77) + '...'
  }

  return title
}

/**
 * Create Night Orders request from user message
 */
export function createNightOrdersRequest(
  message: string,
  analysis: ComplexityAnalysis
): {
  mission: string
  context: string
} {
  const mission = extractMissionTitle(message)
  
  const context = [
    `Category: ${analysis.category || 'general'}`,
    `Estimated steps: ${analysis.estimatedSteps || 'Unknown'}`,
    `Original request: "${message}"`,
    `Complexity confidence: ${(analysis.confidence * 100).toFixed(0)}%`
  ].join('\n')

  return { mission, context }
}
