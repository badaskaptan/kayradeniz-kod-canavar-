/* eslint-disable @typescript-eslint/no-explicit-any */
// 📡 Activity Observer - Ship's Radar System
// Phase 1.1: Non-blocking observation of Claude's tool executions

import { randomUUID } from 'crypto'
import type { Observation, ObserverConfig, ObserverEvent, ToolCall } from '../types/observation'

/**
 * ActivityObserver watches Claude's tool executions without interfering.
 *
 * Philosophy (from Master Plan):
 * "Install radar to observe Claude without interference - the foreign rival ship
 * must never know we're watching. We study his routes, techniques, and patterns
 * to learn and eventually surpass him."
 *
 * Key Requirements:
 * - NON-BLOCKING: Observation must never slow down Claude
 * - ASYNC: All processing happens in background
 * - NO INTERFERENCE: Claude sees no difference
 */
export class ActivityObserver {
  private currentObservation: Observation | null = null
  private eventQueue: ObserverEvent[] = []
  private config: ObserverConfig
  private flushTimer: NodeJS.Timeout | null = null

  // Callbacks for Intelligence Fleet processing
  private onObservationComplete?: (observation: Observation) => void

  constructor(config?: Partial<ObserverConfig>) {
    this.config = {
      enabled: true,
      maxQueueSize: 100,
      flushInterval: 5000, // 5 seconds
      ...config
    }

    // Start periodic flush timer
    this.startFlushTimer()

    console.log('📡 Activity Observer initialized (non-blocking mode)')
  }

  /**
   * Start observing a new user request
   * Called at the beginning of claude-service.sendMessage()
   */
  startObservation(userMessage: string, context?: string): string {
    if (!this.config.enabled) return ''

    const observationId = randomUUID()

    this.currentObservation = {
      id: observationId,
      timestamp: Date.now(),
      userMessage,
      claudeResponse: '',
      toolCalls: [],
      context,
      totalExecutionTime: 0,
      success: false
    }

    console.log(`📡 Observation started: ${observationId.substring(0, 8)}`)
    return observationId
  }

  /**
   * Record a tool call execution
   * Called after each tool execution in executeToolInternal()
   *
   * CRITICAL: This must be ASYNC and non-blocking!
   */
  recordToolCall(
    toolName: string,
    input: any,
    result: string,
    success: boolean,
    executionTime: number
  ): void {
    if (!this.config.enabled || !this.currentObservation) return

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
    this.currentObservation.toolCalls.push(toolCall)

    // Queue event for async processing (non-blocking)
    this.queueEvent({
      type: 'tool_call',
      data: toolCall,
      timestamp: Date.now()
    })

    console.log(`📡 Tool recorded: ${toolName} (${executionTime}ms, success: ${success})`)
  }

  /**
   * Complete the current observation
   * Called at the end of claude-service.sendMessage()
   */
  completeObservation(claudeResponse: string, success: boolean): void {
    if (!this.config.enabled || !this.currentObservation) return

    const endTime = Date.now()
    this.currentObservation.claudeResponse = claudeResponse
    this.currentObservation.success = success
    this.currentObservation.totalExecutionTime = endTime - this.currentObservation.timestamp

    // Queue observation for Intelligence Fleet processing (async)
    this.queueEvent({
      type: 'observation_complete',
      data: { ...this.currentObservation }, // Clone to avoid mutation
      timestamp: endTime
    })

    console.log(
      `📡 Observation complete: ${this.currentObservation.id.substring(0, 8)} ` +
        `(${this.currentObservation.toolCalls.length} tools, ${this.currentObservation.totalExecutionTime}ms)`
    )

    // Reset current observation
    this.currentObservation = null
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
    currentObservationId: string | null
    enabled: boolean
  } {
    return {
      queueSize: this.eventQueue.length,
      currentObservationId: this.currentObservation?.id || null,
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
