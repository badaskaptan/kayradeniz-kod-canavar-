/* eslint-disable @typescript-eslint/no-explicit-any */
// 🌙 Night Orders Parser - Convert natural language to structured missions
// Phase 2.1: Mission planning and task breakdown

import type { OrderedTask } from '../types/night-orders'

/**
 * Parse result from natural language order
 */
export interface ParsedOrder {
  missionTitle: string
  objectives: string[]
  tasks: Omit<OrderedTask, 'logbookEntries' | 'status' | 'retryCount'>[]
  complexity: 'simple' | 'moderate' | 'complex' | 'epic'
  estimatedDuration: number // minutes
  requiredTools: string[]
}

/**
 * Task template for common patterns (reserved for future use)
 */
// interface TaskTemplate {
//   pattern: RegExp
//   generator: (match: RegExpMatchArray, context: any) => OrderedTask[]
// }

/**
 * NightOrdersParser converts user requests into structured mission plans
 *
 * Examples:
 *   "Refactor auth to JWT"
 *   → Task 1: Analyze current auth
 *   → Task 2: Design JWT architecture
 *   → Task 3: Implement JWT service
 *   → Task 4: Update endpoints
 *   → Task 5: Write tests
 *   → Task 6: Review & validate
 *
 *   "Add dark mode"
 *   → Task 1: Design color scheme
 *   → Task 2: Create theme store
 *   → Task 3: Update components
 *   → Task 4: Add toggle UI
 *   → Task 5: Test all themes
 */
export class NightOrdersParser {
  private llmAvailable: boolean

  constructor(llmAvailable = false) {
    this.llmAvailable = llmAvailable

    console.log('🌙 Night Orders Parser initialized')
    console.log(`   LLM available: ${llmAvailable}`)
  }

  /**
   * Parse natural language order into structured mission
   */
  async parseOrder(userRequest: string): Promise<ParsedOrder> {
    console.log(`🌙 Parsing order: "${userRequest}"`)

    // Clean and normalize input
    const normalized = this.normalizeInput(userRequest)

    // If LLM available, use AI for better parsing
    if (this.llmAvailable) {
      return this.parseWithLLM(normalized)
    }

    // Otherwise use pattern-based parsing
    return this.parseWithPatterns(normalized)
  }

  /**
   * Parse using LLM (Ollama) for intelligent task breakdown
   */
  private async parseWithLLM(request: string): Promise<ParsedOrder> {
    // TODO: Integrate with Ollama service when Intelligence Fleet available
    // For now, fall back to pattern-based
    console.log('🌙 LLM parsing not yet implemented, using patterns')
    return this.parseWithPatterns(request)
  }

  /**
   * Parse using pattern matching (works without AI)
   */
  private parseWithPatterns(request: string): ParsedOrder {
    const lower = request.toLowerCase()

    // Detect mission type and generate tasks
    if (this.isRefactorRequest(lower)) {
      return this.generateRefactorMission(request)
    } else if (this.isFeatureRequest(lower)) {
      return this.generateFeatureMission(request)
    } else if (this.isFixRequest(lower)) {
      return this.generateFixMission(request)
    } else if (this.isTestRequest(lower)) {
      return this.generateTestMission(request)
    } else if (this.isDocumentationRequest(lower)) {
      return this.generateDocMission(request)
    } else {
      // Generic multi-step mission
      return this.generateGenericMission(request)
    }
  }

  /**
   * Generate refactor mission (code restructuring)
   */
  private generateRefactorMission(request: string): ParsedOrder {
    const target = this.extractTarget(request)
    const goal = this.extractGoal(request)

    const tasks: Omit<OrderedTask, 'logbookEntries' | 'status' | 'retryCount'>[] = [
      {
        taskId: 1,
        description: `Analyze current ${target} implementation`,
        assignedTo: 'coder',
        dependencies: [],
        expectedOutcome: `Understanding of current ${target} structure`
      },
      {
        taskId: 2,
        description: `Design new ${goal} architecture`,
        assignedTo: 'coder',
        dependencies: [1],
        expectedOutcome: `Architecture plan for ${goal}`
      },
      {
        taskId: 3,
        description: `Implement ${goal} core logic`,
        assignedTo: 'coder',
        dependencies: [2],
        expectedOutcome: `Working ${goal} implementation`
      },
      {
        taskId: 4,
        description: `Update integration points`,
        assignedTo: 'coder',
        dependencies: [3],
        expectedOutcome: `All code using new ${goal} system`
      },
      {
        taskId: 5,
        description: `Write tests for ${goal}`,
        assignedTo: 'coder',
        dependencies: [4],
        expectedOutcome: `Test coverage for ${goal}`
      },
      {
        taskId: 6,
        description: `Review and validate changes`,
        assignedTo: 'reviewer',
        dependencies: [5],
        expectedOutcome: `Code review passed`
      }
    ]

    return {
      missionTitle: request,
      objectives: [
        `Refactor ${target} to ${goal}`,
        'Maintain existing functionality',
        'Improve code quality',
        'Add test coverage'
      ],
      tasks,
      complexity: 'complex',
      estimatedDuration: 30,
      requiredTools: ['read_file', 'write_file', 'search_files', 'run_terminal']
    }
  }

  /**
   * Generate feature mission (new functionality)
   */
  private generateFeatureMission(request: string): ParsedOrder {
    const feature = this.extractFeature(request)

    const tasks: Omit<OrderedTask, 'logbookEntries' | 'status' | 'retryCount'>[] = [
      {
        taskId: 1,
        description: `Design ${feature} interface and behavior`,
        assignedTo: 'coder',
        dependencies: [],
        expectedOutcome: `${feature} design specification`
      },
      {
        taskId: 2,
        description: `Implement ${feature} core logic`,
        assignedTo: 'coder',
        dependencies: [1],
        expectedOutcome: `Working ${feature} implementation`
      },
      {
        taskId: 3,
        description: `Create UI components for ${feature}`,
        assignedTo: 'coder',
        dependencies: [2],
        expectedOutcome: `${feature} UI ready`
      },
      {
        taskId: 4,
        description: `Integrate ${feature} with existing code`,
        assignedTo: 'coder',
        dependencies: [3],
        expectedOutcome: `${feature} fully integrated`
      },
      {
        taskId: 5,
        description: `Test ${feature} functionality`,
        assignedTo: 'executor',
        dependencies: [4],
        expectedOutcome: `${feature} tested and working`
      }
    ]

    return {
      missionTitle: request,
      objectives: [
        `Implement ${feature}`,
        'Integrate with existing features',
        'Ensure user experience quality',
        'Test thoroughly'
      ],
      tasks,
      complexity: 'moderate',
      estimatedDuration: 20,
      requiredTools: ['read_file', 'write_file', 'search_files']
    }
  }

  /**
   * Generate fix mission (bug repair)
   */
  private generateFixMission(request: string): ParsedOrder {
    const problem = this.extractProblem(request)

    const tasks: Omit<OrderedTask, 'logbookEntries' | 'status' | 'retryCount'>[] = [
      {
        taskId: 1,
        description: `Investigate ${problem}`,
        assignedTo: 'coder',
        dependencies: [],
        expectedOutcome: `Root cause identified`
      },
      {
        taskId: 2,
        description: `Design fix for ${problem}`,
        assignedTo: 'coder',
        dependencies: [1],
        expectedOutcome: `Fix strategy determined`
      },
      {
        taskId: 3,
        description: `Implement fix`,
        assignedTo: 'coder',
        dependencies: [2],
        expectedOutcome: `${problem} resolved`
      },
      {
        taskId: 4,
        description: `Test fix and verify no regressions`,
        assignedTo: 'executor',
        dependencies: [3],
        expectedOutcome: `Fix verified working`
      }
    ]

    return {
      missionTitle: request,
      objectives: [
        `Fix ${problem}`,
        'Prevent regressions',
        'Verify fix works',
        'Document root cause'
      ],
      tasks,
      complexity: 'moderate',
      estimatedDuration: 15,
      requiredTools: ['read_file', 'write_file', 'search_files', 'run_terminal']
    }
  }

  /**
   * Generate test mission (testing code)
   */
  private generateTestMission(request: string): ParsedOrder {
    const target = this.extractTarget(request)

    const tasks: Omit<OrderedTask, 'logbookEntries' | 'status' | 'retryCount'>[] = [
      {
        taskId: 1,
        description: `Analyze ${target} test requirements`,
        assignedTo: 'coder',
        dependencies: [],
        expectedOutcome: `Test cases identified`
      },
      {
        taskId: 2,
        description: `Write unit tests for ${target}`,
        assignedTo: 'coder',
        dependencies: [1],
        expectedOutcome: `Unit tests created`
      },
      {
        taskId: 3,
        description: `Write integration tests`,
        assignedTo: 'coder',
        dependencies: [2],
        expectedOutcome: `Integration tests created`
      },
      {
        taskId: 4,
        description: `Run all tests and verify coverage`,
        assignedTo: 'executor',
        dependencies: [3],
        expectedOutcome: `Tests passing, coverage adequate`
      }
    ]

    return {
      missionTitle: request,
      objectives: [
        `Add test coverage for ${target}`,
        'Ensure all scenarios covered',
        'Achieve high coverage percentage'
      ],
      tasks,
      complexity: 'simple',
      estimatedDuration: 10,
      requiredTools: ['read_file', 'write_file', 'run_terminal']
    }
  }

  /**
   * Generate documentation mission
   */
  private generateDocMission(request: string): ParsedOrder {
    const target = this.extractTarget(request)

    const tasks: Omit<OrderedTask, 'logbookEntries' | 'status' | 'retryCount'>[] = [
      {
        taskId: 1,
        description: `Analyze ${target} code structure`,
        assignedTo: 'coder',
        dependencies: [],
        expectedOutcome: `${target} structure understood`
      },
      {
        taskId: 2,
        description: `Write API documentation`,
        assignedTo: 'narrator',
        dependencies: [1],
        expectedOutcome: `API docs created`
      },
      {
        taskId: 3,
        description: `Write usage examples`,
        assignedTo: 'narrator',
        dependencies: [2],
        expectedOutcome: `Examples added`
      },
      {
        taskId: 4,
        description: `Review documentation completeness`,
        assignedTo: 'reviewer',
        dependencies: [3],
        expectedOutcome: `Documentation complete and clear`
      }
    ]

    return {
      missionTitle: request,
      objectives: [`Document ${target}`, 'Provide clear examples', 'Explain usage patterns'],
      tasks,
      complexity: 'simple',
      estimatedDuration: 10,
      requiredTools: ['read_file', 'write_file', 'search_files']
    }
  }

  /**
   * Generate generic multi-step mission
   */
  private generateGenericMission(request: string): ParsedOrder {
    const tasks: Omit<OrderedTask, 'logbookEntries' | 'status' | 'retryCount'>[] = [
      {
        taskId: 1,
        description: `Analyze requirements: ${request}`,
        assignedTo: 'router',
        dependencies: [],
        expectedOutcome: 'Requirements understood'
      },
      {
        taskId: 2,
        description: `Plan implementation approach`,
        assignedTo: 'coder',
        dependencies: [1],
        expectedOutcome: 'Implementation plan ready'
      },
      {
        taskId: 3,
        description: `Execute implementation`,
        assignedTo: 'coder',
        dependencies: [2],
        expectedOutcome: 'Implementation complete'
      },
      {
        taskId: 4,
        description: `Test and verify results`,
        assignedTo: 'executor',
        dependencies: [3],
        expectedOutcome: 'Changes verified working'
      }
    ]

    return {
      missionTitle: request,
      objectives: ['Complete requested task', 'Ensure quality', 'Test thoroughly'],
      tasks,
      complexity: 'moderate',
      estimatedDuration: 15,
      requiredTools: ['read_file', 'write_file', 'search_files', 'run_terminal']
    }
  }

  /**
   * Helper: Detect if this is a refactor request
   */
  private isRefactorRequest(text: string): boolean {
    return /refactor|restructure|reorganize|rewrite|migrate|convert/.test(text)
  }

  /**
   * Helper: Detect if this is a feature request
   */
  private isFeatureRequest(text: string): boolean {
    return /add|create|implement|build|make|new feature|feature:/.test(text)
  }

  /**
   * Helper: Detect if this is a fix request
   */
  private isFixRequest(text: string): boolean {
    return /fix|repair|resolve|bug|issue|problem|error|crash/.test(text)
  }

  /**
   * Helper: Detect if this is a test request
   */
  private isTestRequest(text: string): boolean {
    return /test|testing|coverage|unit test|integration test/.test(text)
  }

  /**
   * Helper: Detect if this is a documentation request
   */
  private isDocumentationRequest(text: string): boolean {
    return /document|docs|readme|comment|explain|describe/.test(text)
  }

  /**
   * Helper: Extract target component/feature
   */
  private extractTarget(text: string): string {
    // Try to find specific component name
    const match = text.match(/(?:refactor|fix|test|document)\s+(\w+)/i)
    if (match) return match[1]

    // Try to find quoted text
    const quoted = text.match(/"([^"]+)"|'([^']+)'/)
    if (quoted) return quoted[1] || quoted[2]

    // Default
    return 'component'
  }

  /**
   * Helper: Extract goal/destination
   */
  private extractGoal(text: string): string {
    const match = text.match(/to\s+(\w+)/i)
    if (match) return match[1]
    return 'new system'
  }

  /**
   * Helper: Extract feature name
   */
  private extractFeature(text: string): string {
    const match = text.match(/(?:add|create|implement)\s+(.+)/i)
    if (match) return match[1].trim()
    return 'feature'
  }

  /**
   * Helper: Extract problem description
   */
  private extractProblem(text: string): string {
    const match = text.match(/(?:fix|repair|resolve)\s+(.+)/i)
    if (match) return match[1].trim()
    return 'issue'
  }

  /**
   * Helper: Normalize input text
   */
  private normalizeInput(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/[""]/g, '"') // Normalize quotes
  }

  /**
   * Initialize task templates (for future expansion)
   */
  // @ts-ignore - Reserved for future use
  // private initializeTemplates(): TaskTemplate[] {
  //   return [
  //     // Add more sophisticated templates here as patterns emerge
  //   ]
  // }

  /**
   * Update LLM availability
   */
  setLLMAvailable(available: boolean): void {
    this.llmAvailable = available
    console.log(`🌙 Parser LLM availability: ${available}`)
  }
}
