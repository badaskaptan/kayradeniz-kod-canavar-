/* eslint-disable @typescript-eslint/no-explicit-any */
// 📚 Ship's Logbook - Persistent SQLite Database
// Phase 1.2: Store observations, patterns, and learning data

import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import type { Observation } from '../types/observation'

/**
 * Pattern metadata extracted from observations
 */
export interface Pattern {
  id: string
  name: string
  toolSequence: string // JSON array of tool names
  successRate: number
  usageCount: number
  avgExecutionTime: number
  category: string
  createdAt: number
  lastUsedAt: number
}

/**
 * Reflexion analysis result
 */
export interface Reflexion {
  id: string
  observationId: string
  confidence: number
  metrics: string // JSON object with detailed metrics
  suggestedImprovements: string
  createdAt: number
}

/**
 * Teaching moment for Ollama learning
 */
export interface TeachingMoment {
  id: string
  timestamp: number
  concept: string
  explanation: string
  codeExample?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
}

/**
 * Knowledge base entry
 */
export interface KnowledgeEntry {
  id: string
  category: string
  content: string
  source: string // 'claude' | 'ollama' | 'reflexion'
  relevanceScore: number
  createdAt: number
  updatedAt: number
}

/**
 * Ship's Logbook manages persistent storage of all observation data.
 *
 * Philosophy (from Master Plan):
 * "Every observation is recorded in the ship's logbook - a permanent record
 * that allows us to analyze patterns, learn from Claude, and build our own
 * intelligence over time."
 *
 * Database Schema:
 * - observations: Raw observation records from ActivityObserver
 * - patterns: Extracted patterns (tool sequences, success rates)
 * - reflexions: Sigma Reflexion Engine analysis results
 * - teaching_moments: Learning materials for Ollama
 * - knowledge_base: Accumulated knowledge from all sources
 */
export class ShipsLogbook {
  private db: Database.Database
  private dbPath: string

  constructor(dataDir: string) {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    this.dbPath = path.join(dataDir, 'shared-context.db')
    this.db = new Database(this.dbPath)

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL')

    console.log(`📚 Ship's Logbook initialized at ${this.dbPath}`)
  }

  /**
   * Initialize database schema
   * Creates all tables and indexes if they don't exist
   */
  initialize(): void {
    // 1. Observations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        user_message TEXT NOT NULL,
        claude_response TEXT NOT NULL,
        tools_used TEXT NOT NULL, -- JSON array of tool calls
        context TEXT,
        total_execution_time INTEGER NOT NULL,
        success INTEGER NOT NULL, -- 0 or 1
        created_at INTEGER NOT NULL
      )
    `)

    // 2. Patterns table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tool_sequence TEXT NOT NULL, -- JSON array
        success_rate REAL NOT NULL,
        usage_count INTEGER NOT NULL,
        avg_execution_time REAL NOT NULL,
        category TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER NOT NULL
      )
    `)

    // 3. Reflexions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reflexions (
        id TEXT PRIMARY KEY,
        observation_id TEXT NOT NULL,
        confidence REAL NOT NULL,
        metrics TEXT NOT NULL, -- JSON object
        suggested_improvements TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (observation_id) REFERENCES observations(id)
      )
    `)

    // 4. Teaching Moments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS teaching_moments (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        concept TEXT NOT NULL,
        explanation TEXT NOT NULL,
        code_example TEXT,
        difficulty TEXT NOT NULL,
        category TEXT NOT NULL
      )
    `)

    // 5. Knowledge Base table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        relevance_score REAL NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // 6. Night Orders table (Phase 2.2)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS night_orders (
        id TEXT PRIMARY KEY,
        captain_orders TEXT NOT NULL,
        tasks TEXT NOT NULL, -- JSON array of OrderedTask
        mission_context TEXT NOT NULL,
        priority TEXT NOT NULL, -- 'low' | 'medium' | 'high' | 'critical'
        status TEXT NOT NULL, -- 'active' | 'completed' | 'failed' | 'aborted'
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    `)

    // 7. Task Execution table (Phase 2.2)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_execution (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        agent_role TEXT NOT NULL,
        agent_context TEXT NOT NULL, -- JSON AgentContext snapshot
        result TEXT,
        status TEXT NOT NULL, -- 'pending' | 'in_progress' | 'completed' | 'failed' | 'retry'
        started_at INTEGER,
        completed_at INTEGER,
        execution_time INTEGER,
        retry_count INTEGER NOT NULL DEFAULT 0,
        deviation_severity TEXT, -- 'minor' | 'moderate' | 'major' | 'critical'
        deviation_description TEXT,
        FOREIGN KEY (order_id) REFERENCES night_orders(id)
      )
    `)

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(timestamp);
      CREATE INDEX IF NOT EXISTS idx_observations_success ON observations(success);
      CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
      CREATE INDEX IF NOT EXISTS idx_patterns_usage ON patterns(usage_count DESC);
      CREATE INDEX IF NOT EXISTS idx_reflexions_observation ON reflexions(observation_id);
      CREATE INDEX IF NOT EXISTS idx_teaching_category ON teaching_moments(category);
      CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
      CREATE INDEX IF NOT EXISTS idx_knowledge_score ON knowledge_base(relevance_score DESC);
      CREATE INDEX IF NOT EXISTS idx_night_orders_status ON night_orders(status);
      CREATE INDEX IF NOT EXISTS idx_task_execution_order ON task_execution(order_id);
      CREATE INDEX IF NOT EXISTS idx_task_execution_status ON task_execution(status);
    `)

    console.log("📚 Ship's Logbook schema initialized")
  }

  // ==================== OBSERVATIONS ====================

  /**
   * Save an observation to the database
   */
  saveObservation(observation: Observation): void {
    const stmt = this.db.prepare(`
      INSERT INTO observations (
        id, timestamp, user_message, claude_response, tools_used,
        context, total_execution_time, success, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      observation.id,
      observation.timestamp,
      observation.userMessage,
      observation.claudeResponse,
      JSON.stringify(observation.toolCalls),
      observation.context || null,
      observation.totalExecutionTime,
      observation.success ? 1 : 0,
      Date.now()
    )

    console.log(`📚 Observation saved: ${observation.id.substring(0, 8)}`)
  }

  /**
   * Get recent observations
   */
  getRecentObservations(limit = 10): Observation[] {
    const stmt = this.db.prepare(`
      SELECT * FROM observations
      ORDER BY timestamp DESC
      LIMIT ?
    `)

    const rows = stmt.all(limit) as any[]
    return rows.map(this.rowToObservation)
  }

  /**
   * Get observation by ID
   */
  getObservation(id: string): Observation | null {
    const stmt = this.db.prepare('SELECT * FROM observations WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return null
    return this.rowToObservation(row)
  }

  /**
   * Get observations by success status
   */
  getObservationsBySuccess(success: boolean, limit = 50): Observation[] {
    const stmt = this.db.prepare(`
      SELECT * FROM observations
      WHERE success = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `)

    const rows = stmt.all(success ? 1 : 0, limit) as any[]
    return rows.map(this.rowToObservation)
  }

  private rowToObservation(row: any): Observation {
    return {
      id: row.id,
      timestamp: row.timestamp,
      userMessage: row.user_message,
      claudeResponse: row.claude_response,
      toolCalls: JSON.parse(row.tools_used),
      context: row.context,
      totalExecutionTime: row.total_execution_time,
      success: row.success === 1
    }
  }

  // ==================== PATTERNS ====================

  /**
   * Save or update a pattern
   */
  savePattern(pattern: Pattern): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO patterns (
        id, name, tool_sequence, success_rate, usage_count,
        avg_execution_time, category, created_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      pattern.id,
      pattern.name,
      pattern.toolSequence,
      pattern.successRate,
      pattern.usageCount,
      pattern.avgExecutionTime,
      pattern.category,
      pattern.createdAt,
      pattern.lastUsedAt
    )

    console.log(`📚 Pattern saved: ${pattern.name}`)
  }

  /**
   * Get all patterns by category
   */
  getPatternsByCategory(category: string): Pattern[] {
    const stmt = this.db.prepare(`
      SELECT * FROM patterns
      WHERE category = ?
      ORDER BY usage_count DESC
    `)

    return stmt.all(category) as Pattern[]
  }

  /**
   * Get top patterns by usage
   */
  getTopPatterns(limit = 10): Pattern[] {
    const stmt = this.db.prepare(`
      SELECT * FROM patterns
      ORDER BY usage_count DESC
      LIMIT ?
    `)

    return stmt.all(limit) as Pattern[]
  }

  // ==================== REFLEXIONS ====================

  /**
   * Save a reflexion analysis
   */
  saveReflexion(reflexion: Reflexion): void {
    const stmt = this.db.prepare(`
      INSERT INTO reflexions (
        id, observation_id, confidence, metrics,
        suggested_improvements, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      reflexion.id,
      reflexion.observationId,
      reflexion.confidence,
      reflexion.metrics,
      reflexion.suggestedImprovements,
      reflexion.createdAt
    )

    console.log(`📚 Reflexion saved for observation: ${reflexion.observationId.substring(0, 8)}`)
  }

  /**
   * Get reflexions for an observation
   */
  getReflexionsForObservation(observationId: string): Reflexion[] {
    const stmt = this.db.prepare(`
      SELECT * FROM reflexions
      WHERE observation_id = ?
      ORDER BY created_at DESC
    `)

    return stmt.all(observationId) as Reflexion[]
  }

  // ==================== TEACHING MOMENTS ====================

  /**
   * Save a teaching moment
   */
  saveTeachingMoment(moment: TeachingMoment): void {
    const stmt = this.db.prepare(`
      INSERT INTO teaching_moments (
        id, timestamp, concept, explanation,
        code_example, difficulty, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      moment.id,
      moment.timestamp,
      moment.concept,
      moment.explanation,
      moment.codeExample || null,
      moment.difficulty,
      moment.category
    )

    console.log(`📚 Teaching moment saved: ${moment.concept}`)
  }

  /**
   * Get teaching moments by category
   */
  getTeachingMomentsByCategory(category: string): TeachingMoment[] {
    const stmt = this.db.prepare(`
      SELECT * FROM teaching_moments
      WHERE category = ?
      ORDER BY timestamp DESC
    `)

    return stmt.all(category) as TeachingMoment[]
  }

  /**
   * Get teaching moments by difficulty
   */
  getTeachingMomentsByDifficulty(difficulty: string): TeachingMoment[] {
    const stmt = this.db.prepare(`
      SELECT * FROM teaching_moments
      WHERE difficulty = ?
      ORDER BY timestamp DESC
    `)

    return stmt.all(difficulty) as TeachingMoment[]
  }

  // ==================== KNOWLEDGE BASE ====================

  /**
   * Save or update knowledge entry
   */
  saveKnowledge(entry: KnowledgeEntry): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO knowledge_base (
        id, category, content, source, relevance_score,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      entry.id,
      entry.category,
      entry.content,
      entry.source,
      entry.relevanceScore,
      entry.createdAt,
      entry.updatedAt
    )

    console.log(`📚 Knowledge saved: ${entry.category}`)
  }

  /**
   * Get knowledge by category
   */
  getKnowledgeByCategory(category: string, limit = 20): KnowledgeEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM knowledge_base
      WHERE category = ?
      ORDER BY relevance_score DESC
      LIMIT ?
    `)

    return stmt.all(category, limit) as KnowledgeEntry[]
  }

  /**
   * Search knowledge by content
   */
  searchKnowledge(searchTerm: string, limit = 10): KnowledgeEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM knowledge_base
      WHERE content LIKE ?
      ORDER BY relevance_score DESC
      LIMIT ?
    `)

    return stmt.all(`%${searchTerm}%`, limit) as KnowledgeEntry[]
  }

  // ==================== STATISTICS ====================

  /**
   * Get database statistics
   */
  getStatistics(): {
    totalObservations: number
    successfulObservations: number
    totalPatterns: number
    totalReflexions: number
    totalTeachingMoments: number
    totalKnowledge: number
  } {
    const stats = {
      totalObservations: this.db.prepare('SELECT COUNT(*) as count FROM observations').get() as any,
      successfulObservations: this.db
        .prepare('SELECT COUNT(*) as count FROM observations WHERE success = 1')
        .get() as any,
      totalPatterns: this.db.prepare('SELECT COUNT(*) as count FROM patterns').get() as any,
      totalReflexions: this.db.prepare('SELECT COUNT(*) as count FROM reflexions').get() as any,
      totalTeachingMoments: this.db
        .prepare('SELECT COUNT(*) as count FROM teaching_moments')
        .get() as any,
      totalKnowledge: this.db.prepare('SELECT COUNT(*) as count FROM knowledge_base').get() as any
    }

    return {
      totalObservations: stats.totalObservations.count,
      successfulObservations: stats.successfulObservations.count,
      totalPatterns: stats.totalPatterns.count,
      totalReflexions: stats.totalReflexions.count,
      totalTeachingMoments: stats.totalTeachingMoments.count,
      totalKnowledge: stats.totalKnowledge.count
    }
  }

  // ==================== NIGHT ORDERS (Phase 2.2) ====================

  /**
   * Save a Night Order mission to the database
   */
  saveNightOrder(order: {
    id: string
    captainOrders: string
    tasks: any[] // OrderedTask[]
    missionContext: string
    priority: string
    status: string
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO night_orders (
        id, captain_orders, tasks, mission_context,
        priority, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = Date.now()
    stmt.run(
      order.id,
      order.captainOrders,
      JSON.stringify(order.tasks),
      order.missionContext,
      order.priority,
      order.status,
      now,
      now
    )

    console.log(`📚 Night Order saved: ${order.id.substring(0, 8)}`)
  }

  /**
   * Get active Night Order (if any)
   */
  getActiveNightOrder(): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM night_orders
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `)

    const row = stmt.get() as any
    if (!row) return null

    return {
      id: row.id,
      captainOrders: row.captain_orders,
      tasks: JSON.parse(row.tasks),
      missionContext: row.mission_context,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    }
  }

  /**
   * Update Night Order status
   */
  updateNightOrderStatus(orderId: string, status: string, completedAt?: number): void {
    const stmt = this.db.prepare(`
      UPDATE night_orders
      SET status = ?, updated_at = ?, completed_at = ?
      WHERE id = ?
    `)

    stmt.run(status, Date.now(), completedAt || null, orderId)
    console.log(`📚 Night Order ${orderId.substring(0, 8)} updated: ${status}`)
  }

  /**
   * Save task execution record
   */
  saveTaskExecution(execution: {
    id: string
    orderId: string
    taskId: string
    agentRole: string
    agentContext: any // AgentContext
    result?: string
    status: string
    startedAt?: number
    completedAt?: number
    executionTime?: number
    retryCount?: number
    deviationSeverity?: string
    deviationDescription?: string
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO task_execution (
        id, order_id, task_id, agent_role, agent_context,
        result, status, started_at, completed_at, execution_time,
        retry_count, deviation_severity, deviation_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      execution.id,
      execution.orderId,
      execution.taskId,
      execution.agentRole,
      JSON.stringify(execution.agentContext),
      execution.result || null,
      execution.status,
      execution.startedAt || null,
      execution.completedAt || null,
      execution.executionTime || null,
      execution.retryCount || 0,
      execution.deviationSeverity || null,
      execution.deviationDescription || null
    )

    console.log(
      `📚 Task execution saved: ${execution.taskId} (${execution.agentRole}) - ${execution.status}`
    )
  }

  /**
   * Update task execution status
   */
  updateTaskExecution(
    executionId: string,
    updates: {
      result?: string
      status?: string
      completedAt?: number
      executionTime?: number
      retryCount?: number
      deviationSeverity?: string
      deviationDescription?: string
    }
  ): void {
    // Build dynamic UPDATE query
    const fields: string[] = []
    const values: any[] = []

    if (updates.result !== undefined) {
      fields.push('result = ?')
      values.push(updates.result)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?')
      values.push(updates.completedAt)
    }
    if (updates.executionTime !== undefined) {
      fields.push('execution_time = ?')
      values.push(updates.executionTime)
    }
    if (updates.retryCount !== undefined) {
      fields.push('retry_count = ?')
      values.push(updates.retryCount)
    }
    if (updates.deviationSeverity !== undefined) {
      fields.push('deviation_severity = ?')
      values.push(updates.deviationSeverity)
    }
    if (updates.deviationDescription !== undefined) {
      fields.push('deviation_description = ?')
      values.push(updates.deviationDescription)
    }

    if (fields.length === 0) return

    values.push(executionId)
    const sql = `UPDATE task_execution SET ${fields.join(', ')} WHERE id = ?`

    this.db.prepare(sql).run(...values)
    console.log(`📚 Task execution ${executionId.substring(0, 8)} updated`)
  }

  /**
   * Get task executions for a Night Order
   */
  getTaskExecutions(orderId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM task_execution
      WHERE order_id = ?
      ORDER BY started_at ASC
    `)

    const rows = stmt.all(orderId) as any[]
    return rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      taskId: row.task_id,
      agentRole: row.agent_role,
      agentContext: JSON.parse(row.agent_context),
      result: row.result,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      executionTime: row.execution_time,
      retryCount: row.retry_count,
      deviationSeverity: row.deviation_severity,
      deviationDescription: row.deviation_description
    }))
  }

  /**
   * Get Night Orders with filters
   */
  getNightOrders(filters?: { status?: string; limit?: number }): any[] {
    let sql = 'SELECT * FROM night_orders'
    const params: any[] = []

    if (filters?.status) {
      sql += ' WHERE status = ?'
      params.push(filters.status)
    }

    sql += ' ORDER BY created_at DESC'

    if (filters?.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params) as any[]

    return rows.map((row) => ({
      id: row.id,
      captainOrders: row.captain_orders,
      tasks: JSON.parse(row.tasks),
      missionContext: row.mission_context,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    }))
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close()
    console.log("📚 Ship's Logbook closed")
  }
}
