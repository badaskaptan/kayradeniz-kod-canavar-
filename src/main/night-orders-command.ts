/* eslint-disable @typescript-eslint/no-explicit-any */
// 🌙 Night Orders Command Center - Naval Command System
// Phase 2: Multi-step mission coordination with continuous context awareness

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

/**
 * Configuration for Night Orders execution
 */
export interface NightOrdersConfig {
  maxRetries: number // How many times to retry a failed task
  autoEscalate: boolean // Auto-escalate critical failures to user
  contextWindowSize: number // How many previous tasks to include in context
  enableReflexion: boolean // Run reflexion after each task
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

  constructor(logbook: ShipsLogbook, config?: Partial<NightOrdersConfig>) {
    this.logbook = logbook
    this.config = {
      maxRetries: 3,
      autoEscalate: true,
      contextWindowSize: 5,
      enableReflexion: true,
      ...config
    }

    console.log('🌙 Night Orders Command initialized')
    console.log(`   Max retries: ${this.config.maxRetries}`)
    console.log(`   Auto-escalate: ${this.config.autoEscalate}`)
  }

  /**
   * Issue new Night Orders (mission planning phase)
   * This would typically be called after RouterAgent analyzes user request
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
   * Mark current order as completed
   */
  completeOrder(success: boolean): void {
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
}
