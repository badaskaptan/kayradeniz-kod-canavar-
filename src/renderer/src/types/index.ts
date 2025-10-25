// ==================== AI Provider Types ====================
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  contextWindow: number
  supportsStreaming: boolean
  supportsVision?: boolean
}

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string // UI'dan girilecek, localStorage'da saklanacak
  temperature: number
  maxTokens: number
  streamEnabled: boolean
}

// ==================== Night Orders Protocol ====================
export interface NightOrder {
  id: string
  timestamp: Date
  type: 'reflection' | 'knowledge_update' | 'pattern_recognition' | 'self_improvement'
  trigger: 'user_feedback' | 'error_pattern' | 'success_pattern' | 'scheduled'
  data: {
    context: string
    analysis: string
    learnings: string[]
    actionItems: string[]
  }
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface ReflexionEntry {
  id: string
  sessionId: string
  timestamp: Date
  action: string
  outcome: 'success' | 'failure' | 'partial'
  reasoning: string
  improvements: string[]
  appliedToNextAttempt: boolean
}

// ==================== Teaching Moment System ====================
export interface TeachingMoment {
  id: string
  timestamp: Date
  concept: string // Ana konsept
  explanation: string // Konsept açıklaması
  example: string // Kod örneği
  relatedConcepts: string[] // İlişkili konseptler
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  context?: string // Ek bağlam
  userCorrection?: string // Kullanıcı düzeltmesi
  aiResponse?: string // AI yanıtı
  category?: 'code_pattern' | 'architecture' | 'best_practice' | 'bug_fix' | 'optimization'
  tags?: string[]
  confidence?: number // 0-1 arası
  appliedCount?: number // Kaç kez kullanıldı
}

// ==================== Session Memory System ====================
export interface MessageMetadata {
  synthetic?: boolean // AI-generated summary message
  kind?: 'history_summary_prompt' | 'history_summary' | 'regular'
  summaryForTurns?: string // Which turns this summary covers
  confidence?: number
  toolName?: string
  filePath?: string
  lineChanges?: number
}

export interface SessionConfig {
  maxTurns: number // For trimming: keep last N user turns
  contextLimit?: number // For summarization: max turns before summarization
  keepLastNTurns?: number // For summarization: how many recent turns to keep verbatim
  summarizerModel?: string // Model to use for summarization
  enableSummarization?: boolean // Toggle between trimming and summarization
}

// ==================== Agent System ====================
export type AgentRole = 'router' | 'generator' | 'executor' | 'analyzer' | 'narrator' | 'teacher'

export interface Agent {
  id: string
  name: string
  type: AgentRole
  role?: AgentRole // Backward compatibility
  status: 'idle' | 'active' | 'working' | 'waiting' | 'error'
  active?: boolean // Agent aktif mi pasif mi
  currentTask?: Task
  capabilities: string[]
  metadata?: Record<string, unknown>
}

export interface Task {
  id: string
  type: 'generation' | 'execution' | 'analysis' | 'file-operation' | 'route'
  priority: number // 0-10 scale
  title: string // Task title for display
  description: string
  assignedAgent: AgentRole // Required - which agent handles this
  assignedTo?: string // Optional - specific agent ID
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  result?: TaskResult
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  metadata?: Record<string, unknown>
}

export interface TaskResult {
  success: boolean
  executionTime: number
  output?: string
  data?: unknown
  error?: string
  metadata?: Record<string, unknown>
  reflexion?: ReflexionEntry
}

// ==================== Tool Bridge System ====================
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<
    string,
    {
      type: string
      description: string
      required: boolean
    }
  >
  handler: string // IPC handler name
}

export interface ToolCall {
  id: string
  tool: string
  parameters: Record<string, unknown>
  timestamp: Date
  result?: ToolCallResult
}

export interface ToolCallResult {
  success: boolean
  data?: unknown
  error?: string
  executionTime: number
}

export type {
  ToolBridgeAPI,
  ToolBridgeDirectoryItem,
  ToolBridgeFileStats,
  ToolBridgeResult
} from '../../../shared/toolBridge'

// ==================== File System Types ====================
export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  modified?: Date
  language?: string
}

export interface FileContent {
  path: string
  content: string
  language: string
  encoding: string
}

// ==================== Terminal Types ====================
export interface TerminalSession {
  id: string
  name: string
  shell: string
  cwd: string
  status: 'active' | 'idle' | 'closed'
  history: TerminalCommand[]
}

export interface TerminalCommand {
  id: string
  command: string
  output: string
  exitCode: number
  timestamp: Date
  duration: number
}

// ==================== Chat Types ====================
export interface ThinkingStep {
  id: string
  type: 'analysis' | 'tool_call' | 'code_change' | 'execution' | 'summary'
  title: string
  content: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  timestamp: Date
  duration?: number
  metadata?: {
    tool?: string
    file?: string
    lineChanges?: { added: number; removed: number }
    confidence?: number
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'thinking'
  content: string
  timestamp: Date
  thinkingSteps?: ThinkingStep[]
  metadata?: {
    model?: string
    tokens?: number
    toolCalls?: ToolCall[]
    reflexion?: ReflexionEntry
    teachingMoment?: TeachingMoment
  }
  // Session Memory fields
  meta?: MessageMetadata // For session memory tracking
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

// ==================== Editor Types ====================
export interface EditorTab {
  id: string
  path: string
  content: string
  language: string
  modified: boolean
  cursorPosition: { line: number; column: number }
}

export interface EditorState {
  activeTab?: string
  tabs: EditorTab[]
  theme: 'vs-dark' | 'vs-light'
  fontSize: number
  wordWrap: boolean
}

// ==================== Layout Types ====================
export type PanelId = 'explorer' | 'editor' | 'chat' | 'terminal' | 'reflexion'

export interface PanelConfig {
  id: PanelId
  visible: boolean
  size: number // Percentage
  minimized: boolean
}

export interface LayoutConfig {
  panels: Record<PanelId, PanelConfig>
  orientation: 'horizontal' | 'vertical'
}

// ==================== Usta Modu (Teacher Mode) ====================
export interface UstaMomentAnalysis {
  code: string
  explanation: string
  alternatives: string[]
  bestPractices: string[]
  pitfalls: string[]
  relatedConcepts: string[]
}

export interface UstaLesson {
  id: string
  title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  topics: string[]
  content: string
  examples: string[]
  exercises?: string[]
}

// ==================== Knowledge Base ====================
export interface KnowledgeEntry {
  id: string
  type: 'pattern' | 'solution' | 'explanation' | 'example'
  category: string
  tags: string[]
  content: string
  source: 'user' | 'ai' | 'documentation'
  confidence: number
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

// ==================== Elysion Chamber (Advanced Reflexion) ====================
export interface ElysionSession {
  id: string
  startedAt: Date
  endedAt?: Date
  triggers: string[]
  analyses: ElysionAnalysis[]
  insights: string[]
  actionPlan: string[]
  status: 'active' | 'completed'
}

export interface ElysionAnalysis {
  id: string
  timestamp: Date
  focus: 'performance' | 'architecture' | 'patterns' | 'user_satisfaction'
  findings: string[]
  recommendations: string[]
  confidence: number
}
