// Global TypeScript Definitions for Claude API
export {}

declare global {
  interface Window {
    claudeAPI?: {
      // API Key Management
      getApiKey: () => Promise<string | undefined>
      saveApiKey: (apiKey: string) => Promise<{ success: boolean }>
      validateApiKey: (apiKey: string) => Promise<{ valid: boolean }>
      clearApiKey: () => Promise<{ success: boolean }>
      hasApiKey: () => Promise<boolean>

      // Workspace
      setWorkspacePath: (workspacePath: string) => Promise<{ success: boolean }>

      // Claude Conversation
      sendMessage: (
        message: string,
        context?: Record<string, unknown>
      ) => Promise<{
        success: boolean
        response?: string
        error?: string
      }>

      listTools: () => Promise<
        Array<{
          name: string
          description: string
          input_schema: Record<string, unknown>
        }>
      >

      executeTool: (
        toolName: string,
        params: Record<string, unknown>
      ) => Promise<{
        success: boolean
        response?: string
        error?: string
      }>

      clearHistory: () => Promise<{ success: boolean }>

      // 🎭 User Profile Management
      setUserProfile: (profile: unknown) => Promise<{ success: boolean }>
      getUserProfile: () => Promise<unknown>
      clearUserProfile: () => Promise<{ success: boolean }>

      // Streaming & Events
      onStreamingResponse: (callback: (chunk: string) => void) => () => void
      onToolUsed: (callback: (tool: { name: string; id: string }) => void) => () => void

      // 🧠 MCP Learning API
      getLearningStats: () => Promise<{
        totalActivities: number
        successfulActivities: number
        totalPatterns: number
        avgSuccessRate: number
        totalToolCalls: number
      }>

      getLearnedPatterns: () => Promise<
        Array<{
          id: string
          trigger: string
          triggerKeywords: string[]
          actionSequence: Array<{
            tool: string
            paramTemplate: Record<string, unknown>
          }>
          expectedOutcome: string
          successCount: number
          failureCount: number
          avgDuration: number
          confidence: number
          learnedAt: Date
          lastUsed?: Date
        }>
      >

      getRecentActivities: (count?: number) => Promise<
        Array<{
          id: string
          timestamp: Date
          userRequest: string
          toolCalls: Array<{
            name: string
            input: Record<string, unknown>
            output: string
            success: boolean
            duration: number
            timestamp: Date
          }>
          finalResult: 'success' | 'failure' | 'pending'
          totalDuration: number
          conversationContext?: string
        }>
      >

      findMatchingPattern: (userRequest: string) => Promise<{
        id: string
        trigger: string
        triggerKeywords: string[]
        actionSequence: Array<{
          tool: string
          paramTemplate: Record<string, unknown>
        }>
        expectedOutcome: string
        successCount: number
        failureCount: number
        avgDuration: number
        confidence: number
        learnedAt: Date
        lastUsed?: Date
      } | null>
    }
  }
}
