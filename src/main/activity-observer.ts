/* eslint-disable @typescript-eslint/no-explicit-any */
// 📡 Activity Observer - Ship's Dual Radar System
// Phase 1.1: Non-blocking observation of BOTH Claude AND OpenAI executions

import { randomUUID } from 'crypto'
import type { Observation, ObserverConfig, ObserverEvent, ToolCall } from '../types/observation'
import { ShipsLogbook } from '../shared/ships-logbook'

/**
 * ActivityObserver watches BOTH teachers' (Claude + OpenAI) tool executions.
 *
 * Philosophy (from Master Plan - Dual Teacher Edition):
 * "Install dual radar to observe BOTH Captain Claude AND Captain GPT without interference.
 * We study both teaching styles - Claude's careful, methodical approach and GPT's fast,
 * efficient strategies. Ollama will learn the BEST of both worlds!"
 *
 * Key Requirements:
 * - NON-BLOCKING: Observation must never slow down either teacher
 * - ASYNC: All processing happens in background
 * - NO INTERFERENCE: Neither teacher knows we're watching
 * - TEACHER TAGGING: Tag each observation with teacher signature (CLAUDE/GPT)
 */
export class ActivityObserver {
  private currentObservations: Map<string, Observation> = new Map() // Support multiple concurrent observations
  private eventQueue: ObserverEvent[] = []
  private config: ObserverConfig
  private flushTimer: NodeJS.Timeout | null = null

  // Callbacks for Intelligence Fleet processing
  private onObservationComplete?: (observation: Observation) => void
  private shipsLogbook?: ShipsLogbook

  constructor(config?: Partial<ObserverConfig>, shipsLogbook?: ShipsLogbook) {
    this.config = {
      enabled: true,
      maxQueueSize: 100,
      flushInterval: 5000, // 5 seconds
      ...config
    }

    this.shipsLogbook = shipsLogbook

    // Start periodic flush timer
    this.startFlushTimer()

    console.log('📡 Activity Observer initialized (non-blocking mode)')
  }

  /**
   * Start observing a new user request
   * Called at the beginning of AI service (Claude/OpenAI)
   *
   * @param teacher - Which teacher is being observed ('CLAUDE' | 'OPENAI')
   * @param userMessage - The user's request
   * @param context - Optional workspace context
   */
  startObservation(teacher: 'CLAUDE' | 'OPENAI', userMessage: string, context?: string): string {
    if (!this.config.enabled) return ''

    const observationId = randomUUID()

    const observation: Observation = {
      id: observationId,
      timestamp: Date.now(),
      teacher, // NEW: Tag with teacher signature
      teacherStyle: teacher === 'CLAUDE' ? 'SAFE_METHODICAL' : 'FAST_EFFICIENT', // NEW: Style tag
      userMessage,
      claudeResponse: '', // Will be updated to 'aiResponse'
      toolCalls: [],
      context,
      totalExecutionTime: 0,
      success: false
    }

    this.currentObservations.set(observationId, observation)

    console.log(`📡 Observation started [${teacher}]: ${observationId.substring(0, 8)}`)
    return observationId
  }

  /**
   * Record a tool call execution
   * Called after each tool execution
   *
   * CRITICAL: This must be ASYNC and non-blocking!
   */
  recordToolCall(
    observationId: string,
    toolName: string,
    input: any,
    result: string,
    success: boolean,
    executionTime: number
  ): void {
    if (!this.config.enabled) return

    const observation = this.currentObservations.get(observationId)
    if (!observation) return

    const toolCall: ToolCall = {
      id: randomUUID(),
      name: toolName,
      input,
      result,
      success,
      executionTime,
      timestamp: Date.now()
    }

    // Add to current observation
    observation.toolCalls.push(toolCall)

    // Queue event for async processing (non-blocking)
    this.queueEvent({
      type: 'tool_call',
      data: { ...toolCall, teacher: observation.teacher }, // Include teacher tag
      timestamp: Date.now()
    })

    console.log(
      `📡 Tool recorded [${observation.teacher}]: ${toolName} (${executionTime}ms, ` +
        `success: ${success})`
    )
  }

  /**
   * Complete the current observation
   * Called at the end of AI service execution
   */
  completeObservation(observationId: string, aiResponse: string, success: boolean): void {
    if (!this.config.enabled) return

    const observation = this.currentObservations.get(observationId)
    if (!observation) return

    const endTime = Date.now()
    observation.claudeResponse = aiResponse // TODO: Rename to 'aiResponse' in types
    observation.success = success
    observation.totalExecutionTime = endTime - observation.timestamp

    // Queue observation for Intelligence Fleet processing (async)
    this.queueEvent({
      type: 'observation_complete',
      data: { ...observation }, // Clone to avoid mutation
      timestamp: endTime
    })

    console.log(
      `📡 Observation complete [${observation.teacher}]: ` +
        `${observation.id.substring(0, 8)} ` +
        `(${observation.toolCalls.length} tools, ${observation.totalExecutionTime}ms)`
    )

    // Persist observation to Ship's Logbook if available (non-blocking)
    if (this.shipsLogbook) {
      try {
        // saveObservation is synchronous (better-sqlite3) in current implementation
        this.shipsLogbook.saveObservation(observation)
        console.log(`📚 Observation persisted to Ship's Logbook: ${observation.id.substring(0, 8)}`)
      } catch (err) {
        console.error('📚 Failed to persist observation:', err)
      }
    }
    // Remove from current observations
    this.currentObservations.delete(observationId)
  }

  /**
   * Queue event for async processing (non-blocking)
   */
  private queueEvent(event: ObserverEvent): void {
    this.eventQueue.push(event)

    // Auto-flush if queue is too large
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.flushQueue()
    }
  }

  /**
   * Process all queued events and forward to Intelligence Fleet
   * This runs ASYNC - no blocking!
   */
  private flushQueue(): void {
    if (this.eventQueue.length === 0) return

    const eventsToProcess = [...this.eventQueue]
    this.eventQueue = []

    // Process in background (non-blocking)
    setImmediate(() => {
      this.processEvents(eventsToProcess)
    })
  }

  /**
   * Process events and trigger Intelligence Fleet analysis
   */
  private processEvents(events: ObserverEvent[]): void {
    const observations = events
      .filter((e) => e.type === 'observation_complete')
      .map((e) => e.data as Observation)

    // Forward completed observations to Intelligence Fleet
    if (this.onObservationComplete && observations.length > 0) {
      for (const obs of observations) {
        try {
          this.onObservationComplete(obs)
        } catch (error) {
          console.error('📡 Error processing observation:', error)
        }
      }
    }

    console.log(`📡 Flushed ${events.length} events (${observations.length} observations)`)
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flushQueue()
    }, this.config.flushInterval)
  }

  /**
   * Register callback for completed observations
   * Intelligence Fleet will use this to receive observations
   */
  onComplete(callback: (observation: Observation) => void): void {
    this.onObservationComplete = callback
    console.log('📡 Intelligence Fleet callback registered')
  }

  /**
   * Get current observation statistics
   */
  getStats(): {
    queueSize: number
    activeObservations: number
    observationsByTeacher: { CLAUDE: number; OPENAI: number }
    enabled: boolean
  } {
    const byTeacher = { CLAUDE: 0, OPENAI: 0 }

    for (const obs of this.currentObservations.values()) {
      byTeacher[obs.teacher]++
    }

    return {
      queueSize: this.eventQueue.length,
      activeObservations: this.currentObservations.size,
      observationsByTeacher: byTeacher,
      enabled: this.config.enabled
    }
  }

  /**
   * Enable/disable observer
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    console.log(`📡 Activity Observer ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Flush any remaining events
    this.flushQueue()

    console.log('📡 Activity Observer destroyed')
  }
}
