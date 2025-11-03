// 🌙 Night Orders - Naval Command System Types
// Phase 2: Prevent AI hallucination through continuous context awareness

/**
 * A Night Order is a complete mission specification with step-by-step tasks
 * Inspired by naval tradition: Captain issues orders, Watch Officers execute
 */
export interface NightOrder {
  id: string
  missionTitle: string // e.g., "Refactor auth to JWT"
  objectives: string[] // High-level goals
  taskBreakdown: OrderedTask[] // Step-by-step execution plan
  currentPhase: number // Which task is active (index into taskBreakdown)
  status: 'planning' | 'executing' | 'completed' | 'blocked' | 'failed'
  createdBy: 'user' | 'captain-agent'
  createdAt: number
  startedAt?: number
  completedAt?: number
  metadata?: {
    estimatedDuration?: number
    priority?: 'low' | 'medium' | 'high' | 'critical'
    tags?: string[]
  }
}

/**
 * An ordered task within a Night Order
 * Each task is assigned to a specific "Watch Officer" (agent)
 */
export interface OrderedTask {
  taskId: number // Sequential order (0-based)
  description: string // What to do
  assignedTo: AgentRole // Which watch officer
  dependencies: number[] // Must complete these taskIds first
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped'
  startTime?: number
  completionTime?: number
  logbookEntries: LogbookEntry[] // Detailed execution log
  expectedOutcome?: string // What success looks like
  retryCount?: number // How many times we've retried this task
}

/**
 * Agent roles (Watch Officers)
 */
export type AgentRole = 'router' | 'coder' | 'reviewer' | 'reflexion' | 'narrator' | 'executor'

/**
 * A logbook entry records what happened during task execution
 * Full context snapshot at the moment of action
 */
export interface LogbookEntry {
  timestamp: number
  officer: AgentRole // Which agent performed the action
  action: string // What was done (human-readable)
  result: 'success' | 'partial' | 'failed'
  problems?: string[] // Issues encountered
  filesModified?: string[] // Which files were changed
  toolsUsed?: string[] // Which tools/APIs were called
  outputSummary?: string // Brief summary of output
  needsCaptainReview: boolean // Escalate to user?
  contextSnapshot: AgentContext // Full awareness at this moment
}

/**
 * Agent Context - Full situational awareness
 * This is injected into every agent before task execution
 * Prevents hallucination by maintaining mission context
 */
export interface AgentContext {
  // Mission awareness
  missionTitle: string
  overallObjectives: string[]
  missionProgress: number // 0-100%

  // Timeline awareness
  completedTasks: TaskSummary[]
  currentTask: OrderedTask
  upcomingTasks: TaskSummary[]

  // Code awareness
  modifiedFiles: string[]
  previousDecisions: Decision[]
  knownProblems: string[]
  workingDirectory: string

  // Reflexion awareness
  lastReflexion?: ReflexionSummary
  deviationHistory: Deviation[]
  successRate: number // 0-1

  // Resources
  availableTools: string[]
  memoryUsage?: number
  timeElapsed?: number
}

/**
 * Summary of a task (lightweight version)
 */
export interface TaskSummary {
  taskId: number
  description: string
  status: OrderedTask['status']
  assignedTo: AgentRole
  outcome?: string
}

/**
 * A decision made during execution
 */
export interface Decision {
  timestamp: number
  taskId: number
  officer: AgentRole
  decision: string // What was decided
  rationale: string // Why this decision
  alternatives?: string[] // What else was considered
}

/**
 * Deviation from the plan
 */
export interface Deviation {
  timestamp: number
  taskId: number
  expectedBehavior: string
  actualBehavior: string
  severity: 'minor' | 'moderate' | 'major' | 'critical'
  correctionTaken?: string
}

/**
 * Summary of reflexion analysis
 */
export interface ReflexionSummary {
  timestamp: number
  confidence: number // 0-1
  issuesFound: number
  criticalIssues: number
  recommendations: string[]
}

/**
 * Mission statistics
 */
export interface MissionStatistics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageTaskDuration: number
  totalDuration: number
  retryCount: number
  escalationCount: number
  successRate: number
}

/**
 * Mission review (Captain's assessment)
 */
export interface MissionReview {
  orderId: string
  reviewedAt: number
  reviewedBy: 'user' | 'auto-reflexion'
  overallRating: 1 | 2 | 3 | 4 | 5 // 1=failed, 5=excellent
  feedback: string
  lessonsLearned: string[]
  improvements: string[]
}
