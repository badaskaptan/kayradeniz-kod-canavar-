import { create } from 'zustand'
import type { ChatMessage, Conversation, ThinkingStep, SessionConfig } from '../types'
import { generateId } from '../lib/utils'

interface ChatStore {
  conversations: Conversation[]
  activeConversationId: string | null
  isLoading: boolean
  loadingMessage: string
  activeThinkingMessageId: string | null

  // Session Memory Configuration
  sessionConfig: SessionConfig

  // Conversation management
  createConversation: (title?: string) => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void

  // Message management
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  clearMessages: (conversationId: string) => void

  // Thinking process
  startThinking: (title: string) => string
  addThinkingStep: (messageId: string, step: Omit<ThinkingStep, 'id' | 'timestamp'>) => void
  updateThinkingStep: (messageId: string, stepId: string, updates: Partial<ThinkingStep>) => void
  completeThinking: (messageId: string) => void

  // Session Memory Management
  trimMessages: (conversationId?: string) => void
  updateSessionConfig: (config: Partial<SessionConfig>) => void
  getMessageHistory: (conversationId?: string) => ChatMessage[]

  // Loading state
  setLoading: (loading: boolean, message?: string) => void

  // Getters
  getActiveConversation: () => Conversation | null
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  loadingMessage: '',
  activeThinkingMessageId: null,

  // Default Session Memory Configuration
  sessionConfig: {
    maxTurns: 10, // Keep last 10 user turns by default
    enableSummarization: false, // Start with simple trimming
    contextLimit: 10,
    keepLastNTurns: 3,
    summarizerModel: 'gpt-4o-mini'
  },

  createConversation: (title = 'New Chat') => {
    const id = generateId()
    const newConversation: Conversation = {
      id,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    }

    set((state) => ({
      conversations: [...state.conversations, newConversation],
      activeConversationId: id
    }))

    return id
  },

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  updateConversationTitle: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: new Date() } : c
      )
    })),

  addMessage: (message) => {
    let { activeConversationId } = get()

    // Auto-create first conversation if none exists
    if (!activeConversationId) {
      console.log('[ChatStore] No active conversation, creating default...')
      activeConversationId = get().createConversation('Default Chat')
    }

    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date()
    }

    console.log('[ChatStore] Adding message:', newMessage.role, newMessage.content.substring(0, 50))

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: [...c.messages, newMessage],
              updatedAt: new Date()
            }
          : c
      )
    }))

    // Auto-trim messages after adding
    // Only trim for user/assistant messages (not thinking messages)
    if (message.role === 'user' || message.role === 'assistant') {
      get().trimMessages(activeConversationId)
    }

    return newMessage.id
  },

  clearMessages: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, messages: [], updatedAt: new Date() } : c
      )
    })),

  // Thinking process methods
  startThinking: (title) => {
    const messageId = get().addMessage({
      role: 'thinking',
      content: title,
      thinkingSteps: []
    })
    set({ activeThinkingMessageId: messageId })
    return messageId
  },

  addThinkingStep: (messageId, step) => {
    const newStep: ThinkingStep = {
      ...step,
      id: generateId(),
      timestamp: new Date()
    }

    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                thinkingSteps: [...(m.thinkingSteps || []), newStep]
              }
            : m
        )
      }))
    }))
  },

  updateThinkingStep: (messageId, stepId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                thinkingSteps: m.thinkingSteps?.map((s) =>
                  s.id === stepId ? { ...s, ...updates } : s
                )
              }
            : m
        )
      }))
    }))
  },

  completeThinking: (messageId) => {
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                thinkingSteps: m.thinkingSteps?.map((s) =>
                  s.status === 'running' ? { ...s, status: 'completed' as const } : s
                )
              }
            : m
        )
      })),
      activeThinkingMessageId: null
    }))
  },

  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get()
    return conversations.find((c) => c.id === activeConversationId) || null
  },

  // ==================== Session Memory Methods ====================

  /**
   * Trim messages to keep only last N user turns
   * Implements the "TrimmingSession" pattern from OpenAI Cookbook
   */
  trimMessages: (conversationId) => {
    const { sessionConfig, activeConversationId } = get()
    const targetId = conversationId || activeConversationId

    if (!targetId) return

    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== targetId) return c

        const messages = c.messages
        const userIndices: number[] = []

        // Find indices of user messages (scanning backwards)
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user' && !messages[i].meta?.synthetic) {
            userIndices.unshift(i)
            if (userIndices.length === sessionConfig.maxTurns) break
          }
        }

        // If we have fewer user messages than maxTurns, keep all
        if (userIndices.length === 0 || userIndices.length < sessionConfig.maxTurns) {
          return c
        }

        // 🎭 PRESERVE PROFILE & SYSTEM MESSAGES
        // Extract profile/system messages from the beginning (usually first 1-3 messages)
        const profileMessages = messages.slice(0, Math.min(5, userIndices[0])).filter((msg) => {
          const content = typeof msg.content === 'string' ? msg.content : ''
          return (
            msg.role === 'system' ||
            msg.role === 'assistant' && (
              content.includes('🎭') ||
              content.includes('YOUR IDENTITY') ||
              content.includes('LUMA') ||
              content.includes('Personality') ||
              content.includes('adın ne') || // First greeting response
              content.includes('Ben LUMA') ||
              content.toLowerCase().includes('luma')
            )
          )
        })

        // Keep from earliest user message index to end
        const conversationMessages = messages.slice(userIndices[0])

        // Combine: [profile messages] + [trimmed conversation]
        const trimmedMessages = [...profileMessages, ...conversationMessages]

        console.log(
          `[SessionMemory] Trimmed from ${messages.length} to ${trimmedMessages.length} messages (${profileMessages.length} profile messages preserved)`
        )

        return {
          ...c,
          messages: trimmedMessages,
          updatedAt: new Date()
        }
      })
    }))
  },

  /**
   * Update session memory configuration
   */
  updateSessionConfig: (config) => {
    set((state) => ({
      sessionConfig: { ...state.sessionConfig, ...config }
    }))

    // Auto-trim if maxTurns changed
    if (config.maxTurns !== undefined) {
      const { activeConversationId } = get()
      if (activeConversationId) {
        get().trimMessages(activeConversationId)
      }
    }
  },

  /**
   * Get message history for AI context (after trimming)
   */
  getMessageHistory: (conversationId) => {
    const { conversations, activeConversationId } = get()
    const targetId = conversationId || activeConversationId

    if (!targetId) return []

    const conversation = conversations.find((c) => c.id === targetId)
    if (!conversation) return []

    // Filter out thinking messages (they're for UI only)
    return conversation.messages.filter((m) => m.role !== 'thinking')
  }
}))
