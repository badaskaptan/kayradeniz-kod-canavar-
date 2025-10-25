import { create } from 'zustand'
import type { Agent, Task, TaskResult } from '../types'

interface AgentState {
  // Agent management
  agents: Agent[]
  activeAgentId: string | null

  // Task management
  taskQueue: Task[]
  taskResults: Map<string, TaskResult>
  executingTaskId: string | null

  // Agent actions
  registerAgent: (agent: Agent) => void
  unregisterAgent: (agentId: string) => void
  setActiveAgent: (agentId: string) => void
  updateAgentStatus: (agentId: string, status: Agent['status']) => void

  // Task actions
  addTask: (task: Task) => void
  updateTaskStatus: (taskId: string, status: Task['status']) => void
  addTaskResult: (taskId: string, result: TaskResult) => void
  clearCompletedTasks: () => void
  getTaskById: (taskId: string) => Task | undefined
  getTasksByAgent: (agentType: Agent['type']) => Task[]

  // Queue management
  getNextTask: () => Task | undefined
  setExecutingTask: (taskId: string | null) => void
}

export const useAgentStore = create<AgentState>((set, get) => ({
  // Initial state
  agents: [
    {
      id: 'router-agent',
      name: 'Router Agent',
      type: 'router',
      status: 'idle',
      active: true,
      capabilities: ['intent-detection', 'agent-selection', 'task-distribution'],
      metadata: {
        version: '1.0.0',
        description: 'LUMA Supreme Agent - Orchestrates all other agents'
      }
    },
    {
      id: 'generator-agent',
      name: 'Code Generator Agent',
      type: 'generator',
      status: 'idle',
      active: true,
      capabilities: ['code-generation', 'template-processing', 'night-orders'],
      metadata: {
        version: '1.0.0',
        description: 'Generates code based on requirements and templates'
      }
    },
    {
      id: 'executor-agent',
      name: 'Code Executor Agent',
      type: 'executor',
      status: 'idle',
      active: true,
      capabilities: ['command-execution', 'file-operations', 'terminal-control'],
      metadata: {
        version: '1.0.0',
        description: 'Executes commands and performs file operations'
      }
    },
    {
      id: 'narrator-agent',
      name: 'Narrator Agent',
      type: 'narrator',
      status: 'idle',
      active: true,
      capabilities: ['teaching', 'explanation', 'error-analysis'],
      metadata: {
        version: '1.0.0',
        description: 'Usta Modu - Real-time teaching and explanations in Turkish'
      }
    },
    {
      id: 'analyzer-agent',
      name: 'Reflexion Agent',
      type: 'analyzer',
      status: 'idle',
      active: true,
      capabilities: ['error-analysis', 'code-review', 'reflection', 'quality-check'],
      metadata: {
        version: '1.0.0',
        description: 'Analyzes code quality, detects placeholders, suggests fixes'
      }
    }
  ],
  activeAgentId: 'router-agent',
  taskQueue: [],
  taskResults: new Map(),
  executingTaskId: null,

  // Agent actions
  registerAgent: (agent) =>
    set((state) => ({
      agents: [...state.agents, agent]
    })),

  unregisterAgent: (agentId) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== agentId)
    })),

  setActiveAgent: (agentId) =>
    set(() => ({
      activeAgentId: agentId
    })),

  updateAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === agentId ? { ...a, status } : a))
    })),

  // Task actions
  addTask: (task) =>
    set((state) => ({
      taskQueue: [...state.taskQueue, task].sort((a, b) => b.priority - a.priority)
    })),

  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      taskQueue: state.taskQueue.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              ...(status === 'in-progress' && { startedAt: new Date() }),
              ...(status === 'completed' && { completedAt: new Date() }),
              ...(status === 'failed' && { completedAt: new Date() })
            }
          : t
      )
    })),

  addTaskResult: (taskId, result) =>
    set((state) => {
      const newResults = new Map(state.taskResults)
      newResults.set(taskId, result)
      return { taskResults: newResults }
    }),

  clearCompletedTasks: () =>
    set((state) => ({
      taskQueue: state.taskQueue.filter((t) => t.status !== 'completed' && t.status !== 'failed')
    })),

  getTaskById: (taskId) => {
    return get().taskQueue.find((t) => t.id === taskId)
  },

  getTasksByAgent: (agentType) => {
    return get().taskQueue.filter((t) => t.assignedAgent === agentType)
  },

  // Queue management
  getNextTask: () => {
    const { taskQueue } = get()
    return taskQueue.find((t) => t.status === 'pending')
  },

  setExecutingTask: (taskId) =>
    set(() => ({
      executingTaskId: taskId
    }))
}))
