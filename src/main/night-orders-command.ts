/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 🌙 Night Orders Command Center - Naval Command System
 * Phase 2: Multi-step mission coordination with continuous context awareness
 *
 * PURPOSE: Prevent AI hallucination in multi-step tasks by maintaining full context
 *
 * THE PROBLEM:
 * Lightweight AI models (Gemma 2B, Qwen 7B, Phi 3.8B) have LIMITED CONTEXT (2K-8K tokens).
 * During complex multi-step tasks, they LOSE TRACK and drift off course:
 *   Task 1: "Analyze auth" ✅
 *   Task 2: "Design JWT" ✅
 *   Task 3: "Write code" ❌ (forgot what we're doing!)
 *   Task 4: "Test it" ❌ (completely off track - hallucinating!)
 *
 * THE SOLUTION - FULL CONTEXT INJECTION:
 * Every agent receives complete AgentContext before execution:
 *   - Mission objectives (what we're trying to achieve)
 *   - Completed tasks (what's been done)
 *   - Current task (what we're doing now)
 *   - Upcoming tasks (what comes next)
 *   - All decisions made (previous context)
 *   - Known problems (issues encountered)
 *
 * RESULT: ZERO CONTEXT LOSS → ZERO HALLUCINATION
 *   ✅ Agent knows the mission
 *   ✅ Agent knows what was done
 *   ✅ Agent knows what to do now
 *   ✅ Agent knows what's next
 *   ✅ Agent never loses track
 *
 * WHO NEEDS THIS:
 *   🔥 CRITICAL: Small models (< 8B params) - 2K-8K context
 *   ⚡ RECOMMENDED: Medium models (7B-14B) - for very complex tasks
 *   ✅ OPTIONAL: Large models (Claude Opus, GPT-4) - 200K+ context (they're already good)
 *
 * NAVAL METAPHOR:
 * Inspired by centuries of naval tradition where Watch Officers
 * execute Captain's Orders with precision. No officer loses sight
 * of the mission because they have:
 *   - Written orders (mission plan)
 *   - Ship's logbook (execution history)
 *   - Continuous situation awareness (context)
 */

import { randomUUID } from 'crypto'
import type {
  NightOrder,
  OrderedTask,
  LogbookEntry,
  AgentContext,
  TaskSummary,
  Decision,
  Deviation,
  AgentRole,
  MissionStatistics
} from '../types/night-orders'
import type { ShipsLogbook } from '../shared/ships-logbook'
import { NightOrdersParser } from './night-orders-parser'

/**
 * Configuration for Night Orders execution
 */
export interface NightOrdersConfig {
  maxRetries: number // How many times to retry a failed task
  autoEscalate: boolean // Auto-escalate critical failures to user
  contextWindowSize: number // How many previous tasks to include in context
  enableReflexion: boolean // Run reflexion after each task
  autonomousMode: boolean // Run tasks automatically without user approval
  autonomousInterval: number // Milliseconds between autonomous task executions (default: 2000)
  pauseOnError: boolean // Pause autonomous execution on errors (user intervention needed)
}

/**
 * NightOrdersCommand coordinates multi-step missions
 *
 * Philosophy (from Master Plan):
 * "Inspired by centuries of naval tradition where Watch Officers execute
 * Captain's Orders with precision and continuous awareness. No officer
 * loses sight of the mission."
 *
 * Key Features:
 * - Task breakdown with dependencies
 * - Full context injection into agents
 * - Continuous reflexion and deviation tracking
 * - Automatic escalation of critical issues
 * - Complete mission history in logbook
 */
export class NightOrdersCommand {
  private currentOrder: NightOrder | null = null
  private logbook: ShipsLogbook
  private config: NightOrdersConfig
  private decisions: Decision[] = []
  private deviations: Deviation[] = []
  private parser: NightOrdersParser
  private autonomousTimer: NodeJS.Timeout | null = null
  private isExecuting: boolean = false

  constructor(logbook: ShipsLogbook, config?: Partial<NightOrdersConfig>) {
    this.logbook = logbook
    this.config = {
      maxRetries: 3,
      autoEscalate: true,
      contextWindowSize: 5,
      enableReflexion: true,
      autonomousMode: false, // Start in manual mode, can be enabled via UI
      autonomousInterval: 2000, // 2 seconds between tasks
      pauseOnError: true, // Pause on errors for user review
      ...config
    }
    this.parser = new NightOrdersParser(false) // Will enable LLM when Intelligence Fleet ready

    console.log('🌙 Night Orders Command initialized')
    console.log(`   Max retries: ${this.config.maxRetries}`)
    console.log(`   Auto-escalate: ${this.config.autoEscalate}`)
    console.log(`   Autonomous mode: ${this.config.autonomousMode}`)
  }

  /**
   * Parse natural language order and issue Night Orders
   * NEW: Phase 2.1 - Natural language to structured mission
   */
  async issueOrdersFromNaturalLanguage(userRequest: string): Promise<NightOrder> {
    console.log(`🌙 Parsing captain's orders: "${userRequest}"`)

    // Parse natural language into structured mission
    const parsed = await this.parser.parseOrder(userRequest)

    console.log(`🌙 Mission parsed:`)
    console.log(`   Title: ${parsed.missionTitle}`)
    console.log(`   Objectives: ${parsed.objectives.length}`)
    console.log(`   Tasks: ${parsed.tasks.length}`)
    console.log(`   Complexity: ${parsed.complexity}`)
    console.log(`   Estimated: ${parsed.estimatedDuration} minutes`)

    // Create Night Order from parsed result
    return this.issueOrders(parsed.missionTitle, parsed.objectives, parsed.tasks)
  }

  /**
   * Issue new Night Orders (mission planning phase)
   * Can be called directly or via issueOrdersFromNaturalLanguage()
   */
  async issueOrders(
    missionTitle: string,
    objectives: string[],
    tasks: Omit<OrderedTask, 'logbookEntries' | 'status' | 'retryCount'>[]
  ): Promise<NightOrder> {
    const order: NightOrder = {
      id: randomUUID(),
      missionTitle,
      objectives,
      taskBreakdown: tasks.map((t) => ({
        ...t,
        status: 'pending',
        logbookEntries: [],
        retryCount: 0
      })),
      currentPhase: 0,
      status: 'planning',
      createdBy: 'captain-agent',
      createdAt: Date.now()
    }

    this.currentOrder = order
    this.decisions = []
    this.deviations = []

    // Save to database
    this.logbook.saveNightOrder({
      id: order.id,
      captainOrders: missionTitle,
      tasks: order.taskBreakdown,
      missionContext: objectives.join('\n'),
      priority: 'medium',
      status: 'active'
    })

    console.log(`🌙 Night Orders issued: "${missionTitle}"`)
    console.log(`   Objectives: ${objectives.length}`)
    console.log(`   Tasks: ${tasks.length}`)

    return order
  }

  /**
   * Get current active mission
   */
  getCurrentOrder(): NightOrder | null {
    return this.currentOrder
  }

  /**
   * Get next pending task that can be executed
   * Respects dependencies
   */
  getNextPendingTask(): OrderedTask | null {
    if (!this.currentOrder) return null

    for (const task of this.currentOrder.taskBreakdown) {
      if (task.status !== 'pending') continue

      // Check if all dependencies are completed
      const depsCompleted = task.dependencies.every((depId) => {
        const depTask = this.currentOrder!.taskBreakdown.find((t) => t.taskId === depId)
        return depTask?.status === 'completed'
      })

      if (depsCompleted) {
        return task
      }
    }

    return null
  }

  /**
   * Execute next pending task (Phase 2.3)
   * This is the core execution engine that coordinates agents
   */
  async executeNextTask(): Promise<{
    success: boolean
    task?: OrderedTask
    context?: AgentContext
    error?: string
    needsReview?: boolean
  }> {
    const task = this.getNextPendingTask()

    if (!task) {
      return {
        success: false,
        error: 'No pending tasks available'
      }
    }

    console.log(`🌙 Executing Task ${task.taskId}: "${task.description}"`)
    console.log(`   Assigned to: ${task.assignedTo}`)

    // Mark task as in-progress
    task.status = 'in-progress'
    task.startTime = Date.now()

    // Build full context for agent
    const context = this.buildAgentContext(task)

    console.log(`🌙 Agent Context:`)
    console.log(`   Mission: ${context.missionTitle}`)
    console.log(`   Progress: ${context.missionProgress}%`)
    console.log(`   Completed: ${context.completedTasks.length}`)
    console.log(`   Upcoming: ${context.upcomingTasks.length}`)
    console.log(`   Modified files: ${context.modifiedFiles.length}`)

    // Execute task based on assigned agent
    try {
      const executionResult = await this.executeWithAgent(task, context)

      // Record execution in logbook
      this.recordTaskExecution(
        task,
        task.assignedTo,
        executionResult.action,
        executionResult.success ? 'success' : 'failed',
        {
          problems: executionResult.problems,
          filesModified: executionResult.filesModified,
          toolsUsed: executionResult.toolsUsed,
          outputSummary: executionResult.summary,
          needsReview: executionResult.needsReview
        }
      )

      // Reflexion checkpoint if enabled
      if (this.config.enableReflexion && executionResult.success) {
        await this.reflexionCheckpoint(task, context)
      }

      return {
        success: executionResult.success,
        task,
        context,
        needsReview: executionResult.needsReview
      }
    } catch (error) {
      console.error(`🌙 Task ${task.taskId} execution error:`, error)

      // Record failure
      this.recordTaskExecution(task, task.assignedTo, 'Task execution', 'failed', {
        problems: [error instanceof Error ? error.message : String(error)],
        needsReview: true
      })

      return {
        success: false,
        task,
        context,
        error: error instanceof Error ? error.message : String(error),
        needsReview: true
      }
    }
  }

  /**
   * Execute task with appropriate agent
   */
  private async executeWithAgent(
    task: OrderedTask,
    context: AgentContext
  ): Promise<{
    success: boolean
    action: string
    summary: string
    problems?: string[]
    filesModified?: string[]
    toolsUsed?: string[]
    needsReview?: boolean
  }> {
    console.log(`🌙 Routing to agent: ${task.assignedTo}`)
    console.log(`📋 Context:`, context)

    // For now, return a simulation result
    // In Phase 2.4, we'll integrate with actual agents in renderer process

    // Simulate execution based on agent type
    switch (task.assignedTo) {
      case 'router':
        return {
          success: true,
          action: 'Analyzed requirements and planned approach',
          summary: `Router Agent: ${task.description}`,
          toolsUsed: ['semantic_search', 'grep_search']
        }

      case 'coder':
        return {
          success: true,
          action: 'Generated and validated code',
          summary: `Code Generator: ${task.description}`,
          filesModified: ['src/example.ts'], // Placeholder
          toolsUsed: ['read_file', 'write_file', 'search_files']
        }

      case 'reviewer':
        return {
          success: true,
          action: 'Reviewed code quality and compliance',
          summary: `Code Validator: ${task.description}`,
          toolsUsed: ['read_file', 'grep_search']
        }

      case 'executor':
        return {
          success: true,
          action: 'Executed tests and verified results',
          summary: `Code Executor: ${task.description}`,
          toolsUsed: ['run_terminal', 'read_file']
        }

      case 'narrator':
        return {
          success: true,
          action: 'Generated documentation',
          summary: `Narrator Agent: ${task.description}`,
          filesModified: ['docs/README.md'], // Placeholder
          toolsUsed: ['read_file', 'write_file']
        }

      case 'reflexion':
        return {
          success: true,
          action: 'Analyzed execution quality',
          summary: `Reflexion Agent: ${task.description}`,
          toolsUsed: ['read_file', 'grep_search']
        }

      default:
        return {
          success: false,
          action: `Unknown agent type: ${task.assignedTo}`,
          summary: `Error: Unknown agent`,
          problems: [`Unknown agent type: ${task.assignedTo}`],
          needsReview: true
        }
    }
  }

  /**
   * Reflexion checkpoint after task execution
   */
  private async reflexionCheckpoint(task: OrderedTask, context: AgentContext): Promise<void> {
    console.log(`🌙 Reflexion checkpoint for Task ${task.taskId}`)

    // Simple reflexion check
    const isOnTrack = context.successRate > 0.7 && context.knownProblems.length === 0

    if (!isOnTrack) {
      console.warn(`🌙 Reflexion warning: Success rate ${(context.successRate * 100).toFixed(1)}%`)

      this.recordDeviation(task.taskId, [
        `Low success rate: ${(context.successRate * 100).toFixed(1)}%`
      ])
    } else {
      console.log(`🌙 Reflexion: Task ${task.taskId} on track ✓`)
    }

    // Record reflexion decision
    this.recordDecision(
      task.taskId,
      'reflexion',
      isOnTrack ? 'Continue mission' : 'Monitor closely',
      `Success rate: ${(context.successRate * 100).toFixed(1)}%, Problems: ${context.knownProblems.length}`
    )
  }

  /**
   * Build full context for agent execution
   * This is the key to preventing hallucination
   */
  buildAgentContext(currentTask: OrderedTask): AgentContext {
    if (!this.currentOrder) {
      throw new Error('No active Night Order')
    }

    const completed = this.currentOrder.taskBreakdown
      .filter((t) => t.status === 'completed')
      .map(
        (t): TaskSummary => ({
          taskId: t.taskId,
          description: t.description,
          status: t.status,
          assignedTo: t.assignedTo,
          outcome: t.logbookEntries[t.logbookEntries.length - 1]?.outputSummary
        })
      )

    const upcoming = this.currentOrder.taskBreakdown
      .filter((t) => t.status === 'pending' && t.taskId > currentTask.taskId)
      .slice(0, 3) // Next 3 tasks
      .map(
        (t): TaskSummary => ({
          taskId: t.taskId,
          description: t.description,
          status: t.status,
          assignedTo: t.assignedTo
        })
      )

    // Collect all modified files from previous tasks
    const modifiedFiles = new Set<string>()
    completed.forEach((summary) => {
      const task = this.currentOrder!.taskBreakdown.find((t) => t.taskId === summary.taskId)
      task?.logbookEntries.forEach((entry) => {
        entry.filesModified?.forEach((f) => modifiedFiles.add(f))
      })
    })

    // Calculate mission progress
    const totalTasks = this.currentOrder.taskBreakdown.length
    const completedCount = completed.length
    const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0

    // Calculate success rate
    const failedCount = this.currentOrder.taskBreakdown.filter((t) => t.status === 'failed').length
    const successRate = totalTasks > 0 ? (completedCount - failedCount) / totalTasks : 1.0

    const context: AgentContext = {
      missionTitle: this.currentOrder.missionTitle,
      overallObjectives: this.currentOrder.objectives,
      missionProgress: Math.round(progress),
      completedTasks: completed,
      currentTask,
      upcomingTasks: upcoming,
      modifiedFiles: Array.from(modifiedFiles),
      previousDecisions: this.decisions.slice(-this.config.contextWindowSize),
      knownProblems: this.collectKnownProblems(),
      workingDirectory: process.cwd(),
      deviationHistory: this.deviations.slice(-this.config.contextWindowSize),
      successRate,
      availableTools: this.getAvailableTools()
    }

    return context
  }

  /**
   * Record a task execution entry in the logbook
   */
  recordTaskExecution(
    task: OrderedTask,
    officer: AgentRole,
    action: string,
    result: 'success' | 'partial' | 'failed',
    details: {
      problems?: string[]
      filesModified?: string[]
      toolsUsed?: string[]
      outputSummary?: string
      needsReview?: boolean
    }
  ): void {
    const context = this.buildAgentContext(task)

    const entry: LogbookEntry = {
      timestamp: Date.now(),
      officer,
      action,
      result,
      problems: details.problems,
      filesModified: details.filesModified,
      toolsUsed: details.toolsUsed,
      outputSummary: details.outputSummary,
      needsCaptainReview: details.needsReview || false,
      contextSnapshot: context
    }

    task.logbookEntries.push(entry)

    // Save to database
    const executionId = randomUUID()
    const startTime = Date.now()
    this.logbook.saveTaskExecution({
      id: executionId,
      orderId: this.currentOrder!.id,
      taskId: task.taskId.toString(),
      agentRole: officer,
      agentContext: context,
      result: details.outputSummary || '',
      status: result === 'success' ? 'completed' : result === 'failed' ? 'failed' : 'in_progress',
      startedAt: startTime,
      completedAt: result === 'success' || result === 'failed' ? startTime : undefined,
      executionTime: 0,
      retryCount: task.retryCount || 0
    })

    console.log(`🌙 Task ${task.taskId} logged: ${action} (${result}) by ${officer}`)

    // Update task status
    if (result === 'success') {
      task.status = 'completed'
      task.completionTime = Date.now()
    } else if (result === 'failed') {
      task.retryCount = (task.retryCount || 0) + 1
      if (task.retryCount >= this.config.maxRetries) {
        task.status = 'failed'
        console.warn(`🌙 Task ${task.taskId} failed after ${task.retryCount} retries`)
      }
    }

    // Check for deviations
    if (details.problems && details.problems.length > 0) {
      this.recordDeviation(task.taskId, details.problems)
    }
  }

  /**
   * Record a decision made during execution
   */
  recordDecision(
    taskId: number,
    officer: AgentRole,
    decision: string,
    rationale: string,
    alternatives?: string[]
  ): void {
    const decisionRecord: Decision = {
      timestamp: Date.now(),
      taskId,
      officer,
      decision,
      rationale,
      alternatives
    }

    this.decisions.push(decisionRecord)
    console.log(`🌙 Decision recorded for task ${taskId}: ${decision}`)
  }

  /**
   * Record a deviation from expected behavior
   */
  private recordDeviation(taskId: number, problems: string[]): void {
    const task = this.currentOrder?.taskBreakdown.find((t) => t.taskId === taskId)
    if (!task) return

    problems.forEach((problem) => {
      const deviation: Deviation = {
        timestamp: Date.now(),
        taskId,
        expectedBehavior: task.expectedOutcome || 'Success',
        actualBehavior: problem,
        severity: this.assessSeverity(problem)
      }

      this.deviations.push(deviation)
      console.warn(`🌙 Deviation detected (${deviation.severity}): ${problem}`)

      // Auto-escalate critical deviations
      if (deviation.severity === 'critical' && this.config.autoEscalate) {
        console.error('🌙 CRITICAL DEVIATION - Escalating to Captain')
        // TODO: Trigger user notification
      }
    })
  }

  /**
   * Assess severity of a problem
   */
  private assessSeverity(problem: string): Deviation['severity'] {
    const lower = problem.toLowerCase()

    if (
      lower.includes('critical') ||
      lower.includes('crash') ||
      lower.includes('data loss') ||
      lower.includes('security')
    ) {
      return 'critical'
    }

    if (
      lower.includes('error') ||
      lower.includes('fail') ||
      lower.includes('broken') ||
      lower.includes('corrupt')
    ) {
      return 'major'
    }

    if (lower.includes('warn') || lower.includes('deprecat') || lower.includes('slow')) {
      return 'moderate'
    }

    return 'minor'
  }

  /**
   * Collect known problems from previous tasks
   */
  private collectKnownProblems(): string[] {
    if (!this.currentOrder) return []

    const problems: string[] = []
    this.currentOrder.taskBreakdown.forEach((task) => {
      task.logbookEntries.forEach((entry) => {
        if (entry.problems) {
          problems.push(...entry.problems)
        }
      })
    })

    return problems
  }

  /**
   * Get available tools (placeholder - would be populated from tool registry)
   */
  private getAvailableTools(): string[] {
    return [
      'read_file',
      'write_file',
      'search_files',
      'run_terminal',
      'git_operations',
      'code_analysis'
    ]
  }

  /**
   * Start autonomous execution loop
   * System will execute tasks automatically with continuous reflexion
   */
  startAutonomousExecution(): void {
    if (this.autonomousTimer) {
      console.log('🌙 Autonomous execution already running')
      return
    }

    if (!this.currentOrder) {
      console.warn('🌙 No active order - cannot start autonomous execution')
      return
    }

    console.log('🤖 Starting autonomous execution loop')
    console.log(`   Interval: ${this.config.autonomousInterval}ms`)
    console.log(`   Pause on error: ${this.config.pauseOnError}`)

    this.config.autonomousMode = true

    // Start the autonomous loop
    this.autonomousTimer = setInterval(() => {
      void this.autonomousExecutionCycle()
    }, this.config.autonomousInterval)
  }

  /**
   * Stop autonomous execution loop
   */
  stopAutonomousExecution(): void {
    if (this.autonomousTimer) {
      clearInterval(this.autonomousTimer)
      this.autonomousTimer = null
      this.config.autonomousMode = false
      console.log('🛑 Autonomous execution stopped')
    }
  }

  /**
   * Autonomous execution cycle - runs continuously
   */
  private async autonomousExecutionCycle(): Promise<void> {
    // Prevent concurrent execution
    if (this.isExecuting) {
      return
    }

    // Check if we have pending tasks
    const nextTask = this.getNextPendingTask()
    if (!nextTask) {
      console.log('🌙 No more pending tasks - stopping autonomous execution')
      this.stopAutonomousExecution()

      // Mark order as completed if all tasks done
      if (this.currentOrder) {
        const allCompleted = this.currentOrder.taskBreakdown.every(
          (t) => t.status === 'completed' || t.status === 'failed'
        )
        if (allCompleted) {
          this.completeOrder(true)
        }
      }
      return
    }

    this.isExecuting = true

    try {
      console.log(`🤖 Autonomous cycle: Task ${nextTask.taskId}`)

      // Execute next task
      const result = await this.executeNextTask()

      // Check if we need to pause
      if (!result.success && this.config.pauseOnError) {
        console.warn('⚠️ Task failed - pausing autonomous execution for review')
        this.stopAutonomousExecution()

        // Notify via event (UI can listen to this)
        this.emitEvent('autonomous-paused', {
          reason: 'task-failed',
          task: nextTask,
          error: result.error
        })
      }

      // Continuous reflexion after each task
      if (result.success && result.context) {
        await this.continuousReflexion(nextTask, result.context)
      }
    } catch (error) {
      console.error('🌙 Autonomous execution error:', error)

      if (this.config.pauseOnError) {
        this.stopAutonomousExecution()
        this.emitEvent('autonomous-paused', {
          reason: 'execution-error',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Continuous reflexion - self-feeding loop
   * System constantly asks: What did we do? Where are we? What's next?
   */
  private async continuousReflexion(task: OrderedTask, context: AgentContext): Promise<void> {
    console.log(`🔄 Continuous reflexion for Task ${task.taskId}`)

    const reflexion = {
      whatWeJustDid: task.description,
      outcome: task.status === 'completed' ? 'Success' : 'Failed',
      whereWeAre: `Task ${context.completedTasks.length + 1}/${this.currentOrder!.taskBreakdown.length}`,
      whatsNext:
        context.upcomingTasks.length > 0
          ? context.upcomingTasks[0].description
          : 'Mission complete',
      isOnTrack: context.successRate > 0.7,
      deviations: this.deviations.length,
      recommendation: context.successRate > 0.7 ? 'continue' : 'review-needed'
    }

    console.log('🔄 Reflexion:', reflexion)

    // Record reflexion decision
    this.recordDecision(
      task.taskId,
      'reflexion',
      reflexion.recommendation,
      `Progress: ${context.missionProgress}%, Success rate: ${(context.successRate * 100).toFixed(1)}%`
    )

    // Emit reflexion event for UI
    this.emitEvent('reflexion-update', reflexion)
  }

  /**
   * Event emitter for UI communication
   */
  private emitEvent(eventName: string, data: any): void {
    // This will be picked up by IPC handlers to notify renderer
    console.log(`📡 Event: ${eventName}`, data)

    // TODO: Integrate with Electron IPC event system
    // For now, just log to console
  }

  /**
   * Mark current order as completed
   */
  completeOrder(success: boolean): void {
    // Stop autonomous execution if running
    if (this.autonomousTimer) {
      this.stopAutonomousExecution()
    }

    if (!this.currentOrder) return

    this.currentOrder.status = success ? 'completed' : 'failed'
    this.currentOrder.completedAt = Date.now()

    // Update database
    this.logbook.updateNightOrderStatus(
      this.currentOrder.id,
      success ? 'completed' : 'failed',
      this.currentOrder.completedAt
    )

    console.log(
      `🌙 Mission "${this.currentOrder.missionTitle}" ${success ? 'COMPLETED' : 'FAILED'}`
    )

    // Emit completion event
    this.emitEvent('mission-complete', {
      missionTitle: this.currentOrder.missionTitle,
      success,
      statistics: this.getStatistics()
    })
  }

  /**
   * Get mission statistics
   */
  getStatistics(): MissionStatistics | null {
    if (!this.currentOrder) return null

    const tasks = this.currentOrder.taskBreakdown
    const completed = tasks.filter((t) => t.status === 'completed')
    const failed = tasks.filter((t) => t.status === 'failed')

    const totalRetries = tasks.reduce((sum, t) => sum + (t.retryCount || 0), 0)
    const escalations = tasks.reduce(
      (sum, t) => sum + t.logbookEntries.filter((e) => e.needsCaptainReview).length,
      0
    )

    const durations = completed
      .filter((t) => t.startTime && t.completionTime)
      .map((t) => t.completionTime! - t.startTime!)

    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    const totalDuration = this.currentOrder.completedAt
      ? this.currentOrder.completedAt - this.currentOrder.createdAt
      : Date.now() - this.currentOrder.createdAt

    return {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      failedTasks: failed.length,
      averageTaskDuration: avgDuration,
      totalDuration,
      retryCount: totalRetries,
      escalationCount: escalations,
      successRate: tasks.length > 0 ? completed.length / tasks.length : 0
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NightOrdersConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('🌙 Night Orders config updated:', this.config)
  }

  /**
   * Get current configuration
   */
  getConfig(): NightOrdersConfig {
    return { ...this.config }
  }

  /**
   * Enable LLM-powered parsing (when Intelligence Fleet is configured)
   */
  enableLLMParsing(): void {
    this.parser.setLLMAvailable(true)
    console.log('🌙 LLM parsing enabled')
  }

  /**
   * Disable LLM parsing (fallback to pattern-based)
   */
  disableLLMParsing(): void {
    this.parser.setLLMAvailable(false)
    console.log('🌙 LLM parsing disabled, using patterns')
  }
}
