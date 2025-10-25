/**
 * Tool Registry
 * Central management for all tools available to AI agents
 */

import type {
  Tool,
  ToolRegistry as IToolRegistry,
  ToolRegistryConfig,
  ToolCategory,
  ToolFunction
} from '../types/tools'

export class ToolRegistry implements IToolRegistry {
  public tools: Map<string, Tool>
  private config: ToolRegistryConfig

  constructor(config: ToolRegistryConfig = {}) {
    this.tools = new Map()
    this.config = config
  }

  /**
   * Register a new tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.function.name)) {
      console.warn(`[ToolRegistry] Tool ${tool.function.name} already registered, overwriting`)
    }

    this.tools.set(tool.function.name, tool)
    console.log(`[ToolRegistry] Registered tool: ${tool.function.name} (${tool.category})`)
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: Tool[]): void {
    tools.forEach((tool) => this.register(tool))
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): void {
    const deleted = this.tools.delete(toolName)
    if (deleted) {
      console.log(`[ToolRegistry] Unregistered tool: ${toolName}`)
    }
  }

  /**
   * Get a specific tool by name
   */
  get(toolName: string): Tool | undefined {
    return this.tools.get(toolName)
  }

  /**
   * Get all registered tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tools by category
   */
  getAllByCategory(category: ToolCategory): Tool[] {
    return this.getAll().filter((tool) => tool.category === category)
  }

  /**
   * Get tools formatted for AI (OpenAI function calling format)
   */
  getForAI(): ToolFunction[] {
    return this.getAll().map((tool) => tool.function)
  }

  /**
   * Get tools filtered by config
   */
  getAvailableTools(): Tool[] {
    return this.getAll().filter((tool) => {
      // Filter experimental tools
      if (tool.group === 'experimental' && !this.config.enableExperimentalTools) {
        return false
      }

      // Filter web search if not enabled
      if (tool.category === 'web' && !this.config.enableWebSearch) {
        return false
      }

      // Filter remote-incompatible tools
      if (this.config.isRemote && tool.function.name === 'grep_search') {
        return false
      }

      return true
    })
  }

  /**
   * Update registry configuration
   */
  updateConfig(config: Partial<ToolRegistryConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('[ToolRegistry] Config updated:', this.config)
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number
    byCategory: Record<ToolCategory, number>
    byGroup: Record<string, number>
  } {
    const tools = this.getAll()

    const byCategory = tools.reduce(
      (acc, tool) => {
        acc[tool.category] = (acc[tool.category] || 0) + 1
        return acc
      },
      {} as Record<ToolCategory, number>
    )

    const byGroup = tools.reduce(
      (acc, tool) => {
        acc[tool.group] = (acc[tool.group] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: tools.length,
      byCategory,
      byGroup
    }
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear()
    console.log('[ToolRegistry] All tools cleared')
  }

  /**
   * Serialize tool for AI (remove implementation functions)
   */
  static serializeTool(tool: Tool): Omit<Tool, 'implementation' | 'preprocessArgs'> {
    const { implementation, preprocessArgs, ...rest } = tool
    return rest
  }
}

// Global registry instance
let globalRegistry: ToolRegistry | null = null

/**
 * Get or create global tool registry
 */
export function getToolRegistry(config?: ToolRegistryConfig): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry(config)
  } else if (config) {
    globalRegistry.updateConfig(config)
  }
  return globalRegistry
}

/**
 * Reset global registry (for testing)
 */
export function resetToolRegistry(): void {
  globalRegistry = null
}
