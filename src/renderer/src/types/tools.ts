/**
 * Tool System Type Definitions
 * Based on Continue.dev architecture + OpenAI function calling
 */

import type { ToolBridgeAPI } from '../../../shared/toolBridge'

// ============================================================================
// Core Tool Types
// ============================================================================

export type ToolCategory = 'file' | 'terminal' | 'git' | 'search' | 'codebase' | 'web' | 'custom'

export type ToolPolicy =
  | 'allowedWithPermission'
  | 'allowedWithoutPermission'
  | 'requiresConfirmation'

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
  default?: any
  enum?: any[]
  items?: ToolParameter // For arrays
  properties?: Record<string, ToolParameter> // For objects
}

export interface ToolFunction {
  name: string
  description: string
  parameters: {
    type: 'object'
    required: string[]
    properties: Record<string, ToolParameter>
  }
}

export interface ToolSystemMessage {
  prefix: string
  exampleArgs: [string, string][]
}

// ============================================================================
// Tool Result Types
// ============================================================================

export interface ContextItem {
  name: string
  description: string
  content: string
  status?: string
  uri?: {
    type: 'file' | 'url' | 'terminal'
    value: string
  }
}

export interface ToolResult {
  success: boolean
  contextItems?: ContextItem[]
  error?: string
  executionTime?: number
  metadata?: Record<string, any>
}

// ============================================================================
// Tool Execution Context
// ============================================================================

export interface ToolExtras {
  ide: ToolBridgeAPI
  toolCallId?: string
  workspaceDir?: string
  onPartialOutput?: (result: PartialToolResult) => void
}

export interface PartialToolResult {
  toolCallId: string
  contextItems: ContextItem[]
}

// ============================================================================
// Tool Definition
// ============================================================================

export interface Tool {
  type: 'function'
  category: ToolCategory
  displayTitle: string

  // Status messages (support variable interpolation)
  wouldLikeTo: string // "edit {{{ filepath }}}"
  isCurrently: string // "editing {{{ filepath }}}"
  hasAlready: string // "edited {{{ filepath }}}"

  // Metadata
  readonly: boolean
  isInstant: boolean
  group: string
  icon?: string

  // OpenAI function calling format
  function: ToolFunction

  // Policy & permissions
  defaultToolPolicy: ToolPolicy

  // System message for AI
  systemMessageDescription?: ToolSystemMessage

  // Optional preprocessing (validation, path resolution, etc.)
  preprocessArgs?: (args: any, extras: ToolExtras) => Promise<any>

  // Tool implementation
  implementation: ToolImpl
}

export type ToolImpl = (args: any, extras: ToolExtras) => Promise<ContextItem[]>

// ============================================================================
// Tool Registry Types
// ============================================================================

export interface ToolRegistryConfig {
  enableExperimentalTools?: boolean
  enableWebSearch?: boolean
  isRemote?: boolean
  modelName?: string
}

export interface ToolRegistry {
  tools: Map<string, Tool>
  register: (tool: Tool) => void
  unregister: (toolName: string) => void
  get: (toolName: string) => Tool | undefined
  getAll: () => Tool[]
  getAllByCategory: (category: ToolCategory) => Tool[]
  getForAI: () => ToolFunction[]
}

// ============================================================================
// Tool Call Types (from AI)
// ============================================================================

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

export interface ToolCallResult {
  toolCallId: string
  toolName: string
  result: ToolResult
  duration: number
}

// ============================================================================
// Argument Validation Types
// ============================================================================

export interface ValidationError {
  argument: string
  message: string
  expected: string
  received: any
}

export class ToolArgumentError extends Error {
  constructor(
    public argument: string,
    public expected: string,
    public received: any,
    message: string
  ) {
    super(message)
    this.name = 'ToolArgumentError'
  }
}
