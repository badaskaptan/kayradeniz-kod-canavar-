// MCP Activity Logger - Claude'un tool kullanımlarını kaydeder ve pattern öğrenir

import { promises as fs } from 'fs'
import path from 'path'

export interface ToolCall {
  name: string
  input: Record<string, unknown>
  output: string
  success: boolean
  duration: number
  timestamp: Date
}

export interface MCPActivity {
  id: string
  timestamp: Date
  userRequest: string
  toolCalls: ToolCall[]
  finalResult: 'success' | 'failure' | 'pending'
  totalDuration: number
  conversationContext?: string
}

export interface LearnedPattern {
  id: string
  trigger: string // User request pattern
  triggerKeywords: string[] // Extracted keywords
  actionSequence: {
    tool: string
    paramTemplate: Record<string, unknown>
  }[]
  expectedOutcome: string
  successCount: number
  failureCount: number
  avgDuration: number
  confidence: number // 0-1
  learnedAt: Date
  lastUsed?: Date
}

export class MCPActivityLogger {
  private activities: Map<string, MCPActivity> = new Map()
  private patterns: LearnedPattern[] = []
  private dataDir: string
  private patternsFile: string
  private activitiesFile: string

  constructor(dataDir: string) {
    this.dataDir = dataDir
    this.patternsFile = path.join(dataDir, 'learned-patterns.json')
    this.activitiesFile = path.join(dataDir, 'mcp-activities.json')
  }

  async initialize(): Promise<void> {
    // Create data directory if not exists
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
    } catch (error) {
      // Directory already exists
    }

    // Load existing patterns
    try {
      const data = await fs.readFile(this.patternsFile, 'utf-8')
      this.patterns = JSON.parse(data)
      console.log(`\n📚 Loaded ${this.patterns.length} learned patterns`)
    } catch {
      console.log('\n📚 No existing patterns found, starting fresh')
      this.patterns = []
    }

    // Load recent activities (last 100)
    try {
      const data = await fs.readFile(this.activitiesFile, 'utf-8')
      const allActivities = JSON.parse(data) as MCPActivity[]
      allActivities.slice(-100).forEach((activity) => {
        this.activities.set(activity.id, activity)
      })
      console.log(`📊 Loaded ${this.activities.size} recent activities`)
    } catch {
      console.log('📊 No existing activities found')
    }
  }

  // Start tracking a new activity
  startActivity(userRequest: string, context?: string): string {
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const activity: MCPActivity = {
      id: activityId,
      timestamp: new Date(),
      userRequest,
      toolCalls: [],
      finalResult: 'pending',
      totalDuration: 0,
      conversationContext: context
    }

    this.activities.set(activityId, activity)

    console.log(`\n📝 === MCP ACTIVITY START ===`)
    console.log(`   ID: ${activityId}`)
    console.log(`   Request: ${userRequest}`)

    return activityId
  }

  // Log a tool call
  logToolCall(
    activityId: string,
    toolName: string,
    input: Record<string, unknown>,
    output: string,
    success: boolean,
    duration: number
  ): void {
    const activity = this.activities.get(activityId)
    if (!activity) {
      console.error(`❌ Activity ${activityId} not found`)
      return
    }

    const toolCall: ToolCall = {
      name: toolName,
      input,
      output: output.substring(0, 500), // Limit output size
      success,
      duration,
      timestamp: new Date()
    }

    activity.toolCalls.push(toolCall)

    console.log(`\n📚 LEARNING TOOL CALL:`)
    console.log(`   Tool: ${toolName}`)
    console.log(`   Success: ${success ? '✅' : '❌'}`)
    console.log(`   Duration: ${duration}ms`)
  }

  // Complete an activity
  async completeActivity(activityId: string, finalResult: 'success' | 'failure'): Promise<void> {
    const activity = this.activities.get(activityId)
    if (!activity) return

    activity.finalResult = finalResult
    activity.totalDuration = Date.now() - activity.timestamp.getTime()

    console.log(`\n✅ === MCP ACTIVITY COMPLETE ===`)
    console.log(`   Result: ${finalResult}`)
    console.log(`   Total Duration: ${activity.totalDuration}ms`)
    console.log(`   Tool Calls: ${activity.toolCalls.length}`)

    // Save activity
    await this.saveActivities()

    // Extract pattern if successful
    if (finalResult === 'success' && activity.toolCalls.length > 0) {
      await this.extractPattern(activity)
    }
  }

  // Extract pattern from successful activity
  private async extractPattern(activity: MCPActivity): Promise<void> {
    console.log(`\n🧠 EXTRACTING PATTERN...`)

    // Extract keywords from user request
    const keywords = this.extractKeywords(activity.userRequest)

    // Check if similar pattern exists
    const existingPattern = this.findSimilarPattern(keywords)

    if (existingPattern) {
      // Update existing pattern
      existingPattern.successCount++
      existingPattern.avgDuration =
        (existingPattern.avgDuration * (existingPattern.successCount - 1) + activity.totalDuration) /
        existingPattern.successCount
      existingPattern.confidence = Math.min(
        0.95,
        existingPattern.successCount / (existingPattern.successCount + existingPattern.failureCount)
      )
      existingPattern.lastUsed = new Date()

      console.log(`   ✅ Updated existing pattern: ${existingPattern.id}`)
      console.log(`   Success count: ${existingPattern.successCount}`)
      console.log(`   Confidence: ${(existingPattern.confidence * 100).toFixed(1)}%`)
    } else {
      // Create new pattern
      const newPattern: LearnedPattern = {
        id: `pattern_${Date.now()}`,
        trigger: activity.userRequest,
        triggerKeywords: keywords,
        actionSequence: activity.toolCalls.map((tc) => ({
          tool: tc.name,
          paramTemplate: this.extractParamTemplate(tc.input)
        })),
        expectedOutcome: activity.toolCalls[activity.toolCalls.length - 1].output.substring(0, 200),
        successCount: 1,
        failureCount: 0,
        avgDuration: activity.totalDuration,
        confidence: 0.5, // Initial confidence
        learnedAt: new Date()
      }

      this.patterns.push(newPattern)

      console.log(`   🎉 NEW PATTERN LEARNED!`)
      console.log(`   ID: ${newPattern.id}`)
      console.log(`   Keywords: ${keywords.join(', ')}`)
      console.log(`   Action Sequence: ${newPattern.actionSequence.map((a) => a.tool).join(' → ')}`)
    }

    await this.savePatterns()
  }

  // Extract keywords from user request
  private extractKeywords(request: string): string[] {
    const words = request.toLowerCase().split(/\s+/)

    // Filter out common words
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'from',
      'by',
      'about',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'under',
      'again',
      'further',
      'then',
      'once'
    ])

    return words
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .filter((word) => /^[a-z]+$/.test(word))
      .slice(0, 10)
  }

  // Find similar pattern based on keywords
  private findSimilarPattern(keywords: string[]): LearnedPattern | null {
    for (const pattern of this.patterns) {
      const matchCount = keywords.filter((kw) => pattern.triggerKeywords.includes(kw)).length

      // If >50% keywords match, consider it similar
      if (matchCount / keywords.length > 0.5) {
        return pattern
      }
    }
    return null
  }

  // Extract parameter template (remove specific values, keep structure)
  private extractParamTemplate(params: Record<string, unknown>): Record<string, unknown> {
    const template: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Keep type but not specific value
        template[key] = '<string>'
      } else if (typeof value === 'number') {
        template[key] = '<number>'
      } else if (Array.isArray(value)) {
        template[key] = ['<array>']
      } else if (typeof value === 'object' && value !== null) {
        template[key] = { '<object>': true }
      } else {
        template[key] = value
      }
    }

    return template
  }

  // Find matching pattern for a user request
  async findMatchingPattern(userRequest: string): Promise<LearnedPattern | null> {
    const keywords = this.extractKeywords(userRequest)

    let bestMatch: LearnedPattern | null = null
    let bestScore = 0

    for (const pattern of this.patterns) {
      const matchCount = keywords.filter((kw) => pattern.triggerKeywords.includes(kw)).length
      const score = (matchCount / keywords.length) * pattern.confidence

      if (score > bestScore && score > 0.6) {
        // Minimum 60% match
        bestScore = score
        bestMatch = pattern
      }
    }

    if (bestMatch) {
      console.log(`\n🎯 PATTERN MATCH FOUND!`)
      console.log(`   Pattern ID: ${bestMatch.id}`)
      console.log(`   Confidence: ${(bestScore * 100).toFixed(1)}%`)
      console.log(`   Success Rate: ${bestMatch.successCount}/${bestMatch.successCount + bestMatch.failureCount}`)
      console.log(`   Action Sequence: ${bestMatch.actionSequence.map((a) => a.tool).join(' → ')}`)
    }

    return bestMatch
  }

  // Get statistics
  getStatistics(): {
    totalActivities: number
    successfulActivities: number
    totalPatterns: number
    avgSuccessRate: number
    totalToolCalls: number
  } {
    const activities = Array.from(this.activities.values())
    const successful = activities.filter((a) => a.finalResult === 'success').length
    const totalToolCalls = activities.reduce((sum, a) => sum + a.toolCalls.length, 0)

    const avgSuccessRate =
      this.patterns.length > 0
        ? this.patterns.reduce(
            (sum, p) => sum + p.successCount / (p.successCount + p.failureCount),
            0
          ) / this.patterns.length
        : 0

    return {
      totalActivities: activities.length,
      successfulActivities: successful,
      totalPatterns: this.patterns.length,
      avgSuccessRate,
      totalToolCalls
    }
  }

  // Save patterns to disk
  private async savePatterns(): Promise<void> {
    try {
      await fs.writeFile(this.patternsFile, JSON.stringify(this.patterns, null, 2), 'utf-8')
      console.log(`   💾 Saved ${this.patterns.length} patterns`)
    } catch (error) {
      console.error('❌ Failed to save patterns:', error)
    }
  }

  // Save activities to disk
  private async saveActivities(): Promise<void> {
    try {
      const activities = Array.from(this.activities.values())
      await fs.writeFile(this.activitiesFile, JSON.stringify(activities, null, 2), 'utf-8')
    } catch (error) {
      console.error('❌ Failed to save activities:', error)
    }
  }

  // Get all patterns
  getPatterns(): LearnedPattern[] {
    return this.patterns
  }

  // Get recent activities
  getRecentActivities(count: number = 10): MCPActivity[] {
    return Array.from(this.activities.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count)
  }
}
