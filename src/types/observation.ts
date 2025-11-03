/* eslint-disable @typescript-eslint/no-explicit-any */
// 📡 Activity Observer Type Definitions
// Phase 1.1: Ship's Radar System - Observation Types

/**
 * Tool call metadata captured during Claude execution
 */
export interface ToolCall {
  id: string // Unique tool call ID from Claude
  name: string // Tool name (read_file, write_file, etc.)
  input: any // Tool input parameters
  result: string // Tool execution result
  success: boolean // Did tool execute successfully?
  executionTime: number // Duration in milliseconds
  timestamp: number // Unix timestamp
}

/**
 * User request observation with context
 */
export interface Observation {
  id: string // Unique observation ID (UUID)
  timestamp: number // Unix timestamp
  userMessage: string // Original user request
  claudeResponse: string // Claude's final response
  toolCalls: ToolCall[] // All tools executed during this request
  context?: string // Additional context (workspace path, selected code, etc.)
  totalExecutionTime: number // Total time from request to response
  success: boolean // Overall success status
}

/**
 * Observation metadata for pattern recognition
 */
export interface ObservationMetadata {
  toolSequence: string[] // Array of tool names in execution order
  toolCount: number // Total number of tools used
  successRate: number // Percentage of successful tool calls (0-1)
  avgExecutionTime: number // Average tool execution time
  category?: string // Observation category (file_ops, code_analysis, etc.)
}

/**
 * Activity Observer configuration
 */
export interface ObserverConfig {
  enabled: boolean // Is observer active?
  maxQueueSize: number // Maximum pending observations before processing
  flushInterval: number // How often to flush observations (ms)
}

/**
 * Observer event for async processing
 */
export interface ObserverEvent {
  type: 'tool_call' | 'observation_complete'
  data: ToolCall | Observation
  timestamp: number
}
