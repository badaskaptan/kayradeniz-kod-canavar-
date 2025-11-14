import { useEffect, useState, useCallback } from 'react'
import { ChatPanel } from './components/Chat/ChatPanel'
import { EditorPanel } from './components/Editor/EditorPanel'
import { AgentPanel } from './components/AgentPanel/AgentPanel'
import { FileExplorer } from './components/Explorer/FileExplorer'
import { TerminalPanel } from './components/Terminal/TerminalPanel'
import { UstaModuPanel } from './components/UstaModu/UstaModuPanel'
import { NightOrdersPanel } from './components/NightOrders/NightOrdersPanel'
import { WorkspaceSelector } from './components/Workspace/WorkspaceSelector'
import { ApiKeyManager } from '../../components/ApiKeyManager'
import { useChatStore } from './stores/chatStore'
import { useLayoutStore } from './stores/layoutStore'
import { useEditorStore } from './stores/editorStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import { ollamaService } from './services/ollamaService'
import { openaiService } from './services/openaiService'
import { analyzeComplexity, createNightOrdersRequest } from './services/complexityDetector'
import { nightOrders } from './services/nightOrdersService'
import { getToolRegistry } from './tools/registry'
import { BASE_TOOLS } from './tools/implementations'
import type { ToolBridgeAPI } from './types'
import DragonLogo from './assets/dragon_logo.svg'
import ColumbinaLogo from './assets/Columbina.svg'

const getToolBridge = (): ToolBridgeAPI => {
  if (typeof window !== 'undefined' && window.api) {
    return window.api
  }
  throw new Error('Tool Bridge API is not available')
}

function App(): React.JSX.Element {
  const { layout, togglePanel } = useLayoutStore()
  const { addMessage } = useChatStore()
  const { saveActiveTab } = useEditorStore()
  const { workspacePath } = useWorkspaceStore()

  const [showApiKeyManager, setShowApiKeyManager] = useState(false)
  const [showNightOrders, setShowNightOrders] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('dragon')
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark')
  const [agentMode, setAgentMode] = useState(true) // 🔧 TOOL MODE - User controls via header button
  const [claudeToolsUsed, setClaudeToolsUsed] = useState<string[]>([]) // 🔧 Track Claude tool usage
  const [backgroundImage, setBackgroundImage] = useState<'none' | 'dragon' | 'columbina'>('dragon')

  // 🔧 Initialize Tool Registry
  const toolRegistry = getToolRegistry()

  // Register all tools on mount
  useEffect(() => {
    toolRegistry.registerAll(BASE_TOOLS)
    console.log(`[ToolBridge] ✅ Registered ${BASE_TOOLS.length} tools`)
    console.log(
      '[ToolBridge] Available:',
      toolRegistry.getAll().map((t) => t.function.name)
    )
  }, [toolRegistry])

  // 🎨 Theme change callback for ProfileManager (memoized to prevent re-renders)
  const handleThemeChange = useCallback((theme: string): void => {
    setCurrentTheme(theme)
  }, [])

  // 🎨 Apply theme and mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
    document.documentElement.setAttribute('data-mode', colorMode)
    localStorage.setItem('luma-theme', currentTheme)
    localStorage.setItem('luma-color-mode', colorMode)
  }, [currentTheme, colorMode])

  // 🖼️ Apply background image
  useEffect(() => {
    const root = document.documentElement
    
    console.log('🖼️ Setting background image:', backgroundImage)
    
    if (backgroundImage === 'none') {
      // Hide background by setting opacity to 0
      root.style.setProperty('--bg-opacity', '0')
      console.log('   → Hidden (opacity: 0)')
    } else {
      // Use imported assets (Vite will handle the paths)
      if (backgroundImage === 'dragon') {
        root.style.setProperty('--bg-opacity', '0.18')
        root.style.setProperty('--bg-top', '50%')
        root.style.setProperty('--bg-brightness', '1.3')
        const url = `url("${DragonLogo}")`
        root.style.setProperty('--bg-image-url', url)
        console.log('   → Dragon:', url)
      } else if (backgroundImage === 'columbina') {
        // Columbina: daha belirgin (opacity yüksek) ve biraz aşağıda
        root.style.setProperty('--bg-opacity', '0.35')
        root.style.setProperty('--bg-top', '58%')
        root.style.setProperty('--bg-brightness', '1.5')
        const url = `url("${ColumbinaLogo}")`
        root.style.setProperty('--bg-image-url', url)
        console.log('   → Columbina:', url, '(opacity: 0.35, top: 58%)')
      }
    }
    localStorage.setItem('luma-background-image', backgroundImage)
  }, [backgroundImage])

  // 🖼️ Listen for background image changes from ProfileManager
  useEffect(() => {
    const handleStorageChange = (): void => {
      const savedBgImage = localStorage.getItem('luma-background-image') as 'none' | 'dragon' | 'columbina' | null
      if (savedBgImage && savedBgImage !== backgroundImage) {
        setBackgroundImage(savedBgImage)
      }
    }

    // Listen to storage events (works across tabs)
    window.addEventListener('storage', handleStorageChange)

    // Also listen for profile updates in same tab
    const intervalId = setInterval(() => {
      const savedBgImage = localStorage.getItem('luma-background-image') as 'none' | 'dragon' | 'columbina' | null
      if (savedBgImage && savedBgImage !== backgroundImage) {
        setBackgroundImage(savedBgImage)
      }
    }, 500) // Check every 500ms

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(intervalId)
    }
  }, [backgroundImage])

  // 🎨 Load saved theme/mode on mount
  useEffect(() => {
    // Priority: localStorage > userProfile
    const savedTheme = localStorage.getItem('luma-theme')
    const savedMode = localStorage.getItem('luma-color-mode') as 'dark' | 'light' | null

    // Load background image
    const savedBgImage = localStorage.getItem('luma-background-image') as 'none' | 'dragon' | 'columbina' | null
    console.log('📦 Loading saved background image:', savedBgImage)
    
    // If no localStorage theme, check userProfile
    if (!savedTheme) {
      const savedProfile = localStorage.getItem('userProfile')
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile)
          if (profile.theme?.current) {
            setCurrentTheme(profile.theme.current)
          }
          if (profile.theme?.backgroundImage) {
            console.log('📦 Setting background from profile:', profile.theme.backgroundImage)
            setBackgroundImage(profile.theme.backgroundImage)
          }
        } catch (e) {
          console.error('Profile parse error:', e)
        }
      }
    } else {
      setCurrentTheme(savedTheme)
    }
    
    if (savedBgImage) {
      console.log('📦 Setting background from localStorage:', savedBgImage)
      setBackgroundImage(savedBgImage)
    }

    if (savedMode) setColorMode(savedMode)
  }, [])

  // 🦙 Preload Ollama model on startup
  useEffect(() => {
    let preloadAttempted = false

    const preloadOllama = async (): Promise<void> => {
      // Prevent duplicate preload in React Strict Mode
      if (preloadAttempted) {
        console.log('[App] 🔒 Preload already attempted, skipping duplicate')
        return
      }
      preloadAttempted = true

      try {
        console.log('[App] 🦙 Checking Ollama availability...')
        const isAvailable = await ollamaService.isAvailable()

        if (!isAvailable) {
          console.warn('[App] ⚠️ Ollama Desktop not running - skipping preload')
          return
        }

        console.log('[App] ✅ Ollama Desktop detected')
        const models = await ollamaService.listModels()

        if (models.length === 0) {
          console.warn('[App] ⚠️ No models installed - run: ollama pull qwen2.5-coder:7b')
          return
        }

        const modelToPreload = models.find((m) => m.name === 'qwen2.5-coder:7b') || models[0]
        console.log(`[App] 🚀 Preloading model: ${modelToPreload.name}`)

        await ollamaService.preloadModel(modelToPreload.name)
        console.log(`[App] ✅ Model ${modelToPreload.name} ready in RAM`)
      } catch (error) {
        console.warn('[App] Ollama preload failed (non-critical):', error)
      }
    }

    preloadOllama()
  }, [])

  // 🎨 Resizable panels
  const [leftPanelWidth, setLeftPanelWidth] = useState(300)
  const [rightPanelWidth, setRightPanelWidth] = useState(400)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250)
  const [isResizing, setIsResizing] = useState<'left' | 'right' | 'bottom' | null>(null)

  // Update CSS custom properties when panel dimensions change
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--left-panel-width', `${leftPanelWidth}px`)
    root.style.setProperty('--right-panel-width', `${rightPanelWidth}px`)
    root.style.setProperty('--bottom-panel-height', `${bottomPanelHeight}px`)
  }, [leftPanelWidth, rightPanelWidth, bottomPanelHeight])

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isResizing) return

      if (isResizing === 'left') {
        const newWidth = Math.max(200, Math.min(600, e.clientX))
        setLeftPanelWidth(newWidth)
      } else if (isResizing === 'right') {
        const newWidth = Math.max(300, Math.min(800, window.innerWidth - e.clientX))
        setRightPanelWidth(newWidth)
      } else if (isResizing === 'bottom') {
        const newHeight = Math.max(150, Math.min(600, window.innerHeight - e.clientY - 28))
        setBottomPanelHeight(newHeight)
      }
    }

    const handleMouseUp = (): void => {
      setIsResizing(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizing) {
      document.body.style.cursor = isResizing === 'bottom' ? 'row-resize' : 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // 🔧 Claude tool usage listener + VS Code Copilot-style thinking steps
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.ipcRenderer) {
      return
    }

    const ipc = window.electron.ipcRenderer
    const { addThinkingStep, updateThinkingStep } = useChatStore.getState()

    const handleClaudeToolUsed = (_event: unknown, data: { tool?: string }): void => {
      if (data.tool) {
        console.log('[App] 🔧 Claude used tool:', data.tool)
        setClaudeToolsUsed((prev) => [...prev, data.tool!])
      }
    }

    // 💭 VS Code Copilot-style thinking steps
    const handleThinkingStep = (
      _event: unknown,
      data: {
        type: string
        tool?: string
        description: string
        status: 'running' | 'completed' | 'error'
        executionTime?: number
      }
    ): void => {
      const { activeThinkingMessageId } = useChatStore.getState()
      if (!activeThinkingMessageId) return

      console.log('[App] 💭 Thinking step:', data.description, `(${data.status})`)

      // Find if step already exists for this tool
      const conversation = useChatStore.getState().getActiveConversation()
      const thinkingMessage = conversation?.messages.find((m) => m.id === activeThinkingMessageId)
      const existingStep = thinkingMessage?.thinkingSteps?.find(
        (s) => s.title === data.description
      )

      if (existingStep) {
        // Update existing step
        updateThinkingStep(activeThinkingMessageId, existingStep.id, {
          status: data.status,
          content:
            data.status === 'completed'
              ? `✅ Done (${data.executionTime}ms)`
              : data.status === 'error'
                ? '❌ Failed'
                : '⏳ Running...'
        })
      } else {
        // Add new step
        addThinkingStep(activeThinkingMessageId, {
          type: 'tool',
          title: data.description,
          content:
            data.status === 'running'
              ? '⏳ Running...'
              : data.status === 'completed'
                ? `✅ Done (${data.executionTime}ms)`
                : '❌ Failed',
          status: data.status
        })
      }
    }

    ipc.on('claude:toolUsed', handleClaudeToolUsed)
    ipc.on('claude:thinkingStep', handleThinkingStep)

    return () => {
      ipc.removeAllListeners('claude:toolUsed')
      ipc.removeAllListeners('claude:thinkingStep')
    }
  }, [])

  // Menu event listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.ipcRenderer) {
      return
    }

    const ipc = window.electron.ipcRenderer

    // File menu handlers
    const handleOpenWorkspace = async (): Promise<void> => {
      console.log('[Menu] Open Workspace')
      try {
        const api = getToolBridge()
        const result = await api.dialog.openDirectory({
          title: 'Select Workspace Folder'
        })

        if (result.success && result.data) {
          const { setWorkspacePath } = useWorkspaceStore.getState()
          setWorkspacePath(result.data)
        }
      } catch (error) {
        console.error('[Menu] Open workspace error:', error)
      }
    }

    const handleNewFile = (): void => {
      console.log('[Menu] New File')
      // TODO: Implement new file creation
    }

    const handleOpenFile = async (): Promise<void> => {
      console.log('[Menu] Open File')
      try {
        const api = getToolBridge()
        const result = await api.dialog.openFile({
          title: 'Open File',
          allowMultiple: false
        })

        if (result.success && result.data && result.data.length > 0) {
          const filePath = result.data[0]
          const fileResult = await api.fs.readFile(filePath, 'utf-8')

          if (fileResult.success && typeof fileResult.data === 'string') {
            const { openTab } = useEditorStore.getState()
            const fileName = filePath.split(/[\\/]/).pop() || 'Unknown'
            const language = fileName.split('.').pop() || 'plaintext'
            openTab(filePath, fileResult.data, language)
          }
        }
      } catch (error) {
        console.error('[Menu] Open file error:', error)
      }
    }

    const handleSave = async (): Promise<void> => {
      console.log('[Menu] Save')
      await saveActiveTab()
    }

    const handleSaveAs = async (): Promise<void> => {
      console.log('[Menu] Save As')
      // TODO: Implement save as
    }

    // View menu handlers
    const handleToggleExplorer = (): void => {
      togglePanel('explorer')
    }

    const handleToggleTerminal = (): void => {
      togglePanel('terminal')
    }

    // Help menu handlers
    const handleAbout = (): void => {
      addMessage({
        role: 'assistant',
        content:
          '# 🐉 Dragon AI - Multi-Agent Development Environment\n\n' +
          '**Version:** 2.1.0 (Fire Dragon Edition)\n' +
          '**Architecture:** 7-Agent System\n\n' +
          '- Router Agent (Supreme)\n' +
          '- Code Generator\n' +
          '- Code Executor\n' +
          '- Pattern Analyzer\n' +
          '- Narrator\n' +
          '- Reflexion\n' +
          '- Teacher (Usta Modu)\n\n' +
          '**Tool Bridge:** IPC-based file/terminal access\n' +
          '**Tech Stack:** Electron + React + TypeScript + Zustand\n\n' +
          '**Theme:** Orange Fire Dragon 🔥'
      })
    }

    // Register listeners
    ipc.on('menu:open-workspace', () => void handleOpenWorkspace())
    ipc.on('menu:new-file', handleNewFile)
    ipc.on('menu:open-file', () => void handleOpenFile())
    ipc.on('menu:save', () => void handleSave())
    ipc.on('menu:save-as', () => void handleSaveAs())
    ipc.on('menu:toggle-explorer', handleToggleExplorer)
    ipc.on('menu:toggle-terminal', handleToggleTerminal)
    ipc.on('menu:about', handleAbout)

    // Cleanup
    return () => {
      ipc.removeAllListeners('menu:open-workspace')
      ipc.removeAllListeners('menu:new-file')
      ipc.removeAllListeners('menu:open-file')
      ipc.removeAllListeners('menu:save')
      ipc.removeAllListeners('menu:save-as')
      ipc.removeAllListeners('menu:toggle-explorer')
      ipc.removeAllListeners('menu:toggle-terminal')
      ipc.removeAllListeners('menu:about')
    }
  }, [addMessage, togglePanel, saveActiveTab])

  // Handle user messages
  const handleUserMessage = async (message: string): Promise<void> => {
    console.log('[App] Received user message:', message)

    // MCP Server seçimini kontrol et
    const isOllama = message.startsWith('[OLLAMA]')
    const isOpenAI = message.startsWith('[OPENAI]')
    const isLocalMCP = message.startsWith('[LOCAL-MCP]')
    const cleanMessage = isOllama
      ? message.replace('[OLLAMA]', '').trim()
      : isOpenAI
        ? message.replace('[OPENAI]', '').trim()
        : isLocalMCP
          ? message.replace('[LOCAL-MCP]', '').trim()
          : message

    console.log(
      '[App] Server Type:',
      isOllama ? 'Ollama' : isOpenAI ? 'OpenAI' : isLocalMCP ? 'Local MCP' : 'Claude'
    )
    console.log('[App] Clean message:', cleanMessage)

    const {
      addMessage,
      setLoading,
      startThinking,
      addThinkingStep,
      updateThinkingStep,
      completeThinking
    } = useChatStore.getState()

    // Add user message to chat (clean message without prefix)
    addMessage({ role: 'user', content: cleanMessage })

    // 🧠 COMPLEXITY DETECTION: Analyze if this requires Night Orders
    const complexity = analyzeComplexity(cleanMessage)
    console.log('[App] 🧠 Complexity analysis:', complexity)

    // 🎯 MODEL AWARENESS: Decide if Night Orders is beneficial
    // Small models (Gemma, Phi, Qwen 7B) → ALWAYS use Night Orders for complex tasks
    // Large models (Claude Opus, GPT-4) → Optional, but still useful for very complex tasks
    const isSmallModel = isOllama // Ollama typically uses small models (2B-14B)
    const shouldUseNightOrders =
      complexity.isComplex &&
      complexity.confidence > 0.7 &&
      (isSmallModel || complexity.estimatedSteps! > 5) // Force for small models OR very complex tasks

    if (shouldUseNightOrders) {
      const modelType = isSmallModel ? 'lightweight model' : 'AI'
      console.log(
        `[App] 🌙 Complex task detected - Night Orders recommended for ${modelType} (${complexity.estimatedSteps} steps)`
      )

      try {
        // Create Night Orders mission
        const { mission, context } = createNightOrdersRequest(cleanMessage, complexity)

        // Notify user with model-aware message
        addMessage({
          role: 'assistant',
          content:
            `🌙 **Night Orders Initiated**\n\n` +
            `I detected a complex ${complexity.category || 'multi-step'} task requiring ${complexity.estimatedSteps || 'multiple'} steps.\n\n` +
            `**Mission:** ${mission}\n\n` +
            `${isSmallModel ? '**Context Preservation:** Using Night Orders to prevent context loss in lightweight model. Each step will receive full mission context.\n\n' : ''}` +
            `Creating autonomous execution plan... Monitor progress in Night Orders panel 🌙`
        })

        // Create and start Night Orders
        const orderResult = await window.api.nightOrders.createOrder(mission)
        
        if (orderResult.success && orderResult.orderId) {
          console.log('[App] ✅ Night Orders created:', orderResult.orderId)
          
          // Auto-start autonomous execution
          const startResult = await window.api.nightOrders.startAutonomous(orderResult.orderId)
          
          if (startResult.success) {
            console.log('[App] 🤖 Autonomous execution started')
            
            // Update chat with progress link
            addMessage({
              role: 'assistant',
              content: `✅ Autonomous execution started!\n\n📊 View progress: Click 🌙 Night Orders in the sidebar\n⏸️ You can pause or intervene anytime\n\nI'll update you as tasks complete.`
            })

            // Switch to Night Orders panel automatically
            useLayoutStore.getState().setLeftPanelTab('night-orders')
          } else {
            throw new Error(startResult.error || 'Failed to start autonomous execution')
          }
        } else {
          throw new Error(orderResult.error || 'Failed to create Night Orders')
        }

        return // Exit - Night Orders is handling this
      } catch (error) {
        console.error('[App] ❌ Night Orders failed:', error)
        
        // Fall back to normal chat
        addMessage({
          role: 'assistant',
          content: `⚠️ Night Orders failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}\n\nFalling back to direct execution...`
        })
        // Continue with normal chat flow below
      }
    }

    if (isOllama) {
      // Ollama - Yerel AI modeli
      console.log('[App] Using Ollama')

      const thinkingId = startThinking('🦙 Processing with Ollama...')

      try {
        addThinkingStep(thinkingId, {
          type: 'analysis',
          title: 'Ollama AI',
          content: 'Connecting to local Ollama server (localhost:11434)...',
          status: 'running'
        })

        setLoading(true, 'Ollama düşünüyor...')

        // Ollama durumunu kontrol et
        const isOllamaAvailable = await ollamaService.isAvailable()

        if (!isOllamaAvailable) {
          throw new Error('Ollama is not running on localhost:11434')
        }

        // Mevcut modelleri listele
        const models = await ollamaService.listModels()
        if (models.length === 0) {
          throw new Error('No models available. Please run: ollama pull qwen2.5-coder:7b')
        }

        // Varsayılan model: qwen2.5-coder:7b (7GB, powerful, Tool Calling ✅)
        const DEFAULT_MODEL = 'qwen2.5-coder:7b'
        const selectedModel = models.find((m) => m.name === DEFAULT_MODEL)?.name || models[0].name

        console.log('[App] Using model:', selectedModel)
        if (selectedModel !== DEFAULT_MODEL) {
          console.warn(
            `[App] Default model '${DEFAULT_MODEL}' not found, using '${selectedModel}' instead`
          )
        }

        const stepId = useChatStore
          .getState()
          .getActiveConversation()
          ?.messages.find((m) => m.id === thinkingId)?.thinkingSteps?.[0]?.id

        if (stepId) {
          updateThinkingStep(thinkingId, stepId, {
            content: `Model: ${selectedModel}\nGenerating response...`,
            status: 'running'
          })
        }

        // Ollama ile streaming chat
        let fullResponse = ''

        // Workspace bilgisi ekle
        const workspaceContext = workspacePath ? `\nWorkspace: ${workspacePath}` : ''

        // Kullanıcı profili ekle
        let userContext = ''
        try {
          const savedProfile = localStorage.getItem('userProfile')
          if (savedProfile) {
            const profile = JSON.parse(savedProfile)
            if (profile.name) {
              userContext = `\nUser: ${profile.name}`
              if (profile.preferences?.language) {
                userContext += ` (speaks ${profile.preferences.language})`
              }
            }
          }
        } catch (e) {
          console.error('[App] Failed to load user profile:', e)
        }

        // Track tool calls for learning (outside agentMode block for access later)
        const toolCallHistory: Array<{
          name: string
          args: Record<string, unknown>
          result: string
        }> = []

        // 🔧 TOOL BRIDGE: Agent mode ile tool calling
        if (agentMode) {
          console.log('[App] 🤖 Agent Mode: Tool calling enabled')

          const toolBridge = getToolBridge()

          // Prepare tools for Llama3.2
          const availableTools: Array<{
            type: 'function'
            function: {
              name: string
              description: string
              parameters: Record<string, unknown>
            }
          }> = toolRegistry.getForAI().map((tool) => ({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters as Record<string, unknown>
            }
          }))

          console.log(`[App] 📦 Sending ${availableTools.length} tools to model`)

          // Tool execution callback
          const handleToolCall = async (
            toolName: string,
            args: Record<string, unknown>
          ): Promise<string> => {
            console.log(`[ToolBridge] 🔧 Executing: ${toolName}`)
            console.log('[ToolBridge] Args:', args)

            const tool = toolRegistry.get(toolName)
            if (!tool) {
              return `ERROR: Tool ${toolName} not found`
            }

            try {
              const result = await tool.implementation(args, {
                ide: toolBridge,
                workspaceDir: workspacePath || undefined
              })

              // Format result
              const formatted = result.map((item) => `${item.name}:\n${item.content}`).join('\n\n')

              console.log(`[ToolBridge] ✅ ${toolName} completed`)

              // 🌙 NIGHT ORDERS: Record successful tool call
              toolCallHistory.push({
                name: toolName,
                args,
                result: formatted
              })

              return formatted
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error)
              console.error(`[ToolBridge] ❌ ${toolName} failed:`, errorMsg)

              // 🌙 NIGHT ORDERS: Learn from failure
              nightOrders.observeFailure(
                cleanMessage,
                [toolName],
                [], // We don't know correct tools yet
                errorMsg
              )

              return `ERROR: ${errorMsg}`
            }
          }

          // Use chatWithTools instead of chatStream
          // Use chatWithTools instead of chatStream
          fullResponse = await ollamaService.chatWithTools(
            {
              model: selectedModel,
              messages: [
                {
                  role: 'system',
                  content: `You are LUMA AI, a helpful coding assistant.${workspaceContext}${userContext}

AVAILABLE TOOLS (${availableTools.length} tools):
${availableTools
  .map((t, i) => `${i + 1}. ${t.function.name} - ${t.function.description.split('\n')[0]}`)
  .join('\n')}

CRITICAL TOOL USAGE RULES:
1. ONLY use the ${availableTools.length} tools listed above
2. NEVER mention or use tools not in this list (no code_analyzer, write_tests, etc.)
3. If user asks for unavailable functionality, explain which AVAILABLE tool can help
4. Simple greetings ("hi", "selam") → NO TOOLS NEEDED - just respond!
5. ONE TOOL CALL PER TASK - After success, STOP calling tools and RESPOND
6. NO DUPLICATE CALLS - Never call the same tool twice in one request

FILE HANDLING:
- Use str_replace_editor for: viewing files, editing files, creating files, listing directories
- Common filename patterns:
  * "readme" → "README.md" (auto-add .md extension)
  * "license" → "LICENSE"
  * "package.json" → use exact filename

WORKFLOW:
1. User asks question
2. Call appropriate tool ONCE (if needed)
3. Get result
4. STOP calling tools
5. Respond with helpful answer

Available tools: ${availableTools.map((t) => t.function.name).join(', ')}

Respond naturally and concisely.`
                },
                { role: 'user', content: cleanMessage }
              ],
              tools: availableTools,
              options: {
                temperature: 0.7,
                top_p: 0.9,
                num_predict: 300 // More tokens for tool calling
              }
            },
            handleToolCall,
            (chunk) => {
              console.log('[App] Response chunk:', chunk.substring(0, 50))
            }
          )
        } else {
          // Simple chat mode (no tools)
          await ollamaService.chatStream(
            {
              model: selectedModel,
              messages: [
                {
                  role: 'system',
                  content: `You are LUMA AI, a helpful local assistant.${workspaceContext}${userContext}

Respond naturally and friendly. Keep answers concise.
Note: Advanced file operations require tool mode.`
                },
                { role: 'user', content: cleanMessage }
              ],
              options: {
                temperature: 0.7,
                top_p: 0.9,
                num_predict: 150 // Max 150 tokens per response (hızlandırır)
              }
            },
            (chunk) => {
              fullResponse += chunk
              // Real-time update (her 10 chunk'ta bir)
              if (fullResponse.length % 10 === 0) {
                console.log('[App] Ollama chunk:', chunk)
              }
            }
          )
        }

        // ⚠️ Boş response kontrolü
        if (!fullResponse || fullResponse.trim().length === 0) {
          throw new Error('Empty response from Ollama - model may not be loaded')
        }

        if (stepId) {
          updateThinkingStep(thinkingId, stepId, {
            status: 'completed',
            content: `✅ Response generated (${fullResponse.length} characters)`
          })
        }

        completeThinking(thinkingId)
        setLoading(false)

        // 🌙 NIGHT ORDERS: If tools were used successfully, record pattern
        if (toolCallHistory.length > 0) {
          console.log(`[NightOrders] 📚 Recording ${toolCallHistory.length} successful tool calls`)
          // We'll use this in AŞAMA 3 to learn from Claude
          // For now, just log that Llama used tools successfully
        }

        addMessage({
          role: 'assistant',
          content: fullResponse
        })
      } catch (error) {
        console.error('[App] Ollama error:', error)
        setLoading(false)
        completeThinking(thinkingId)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        addMessage({
          role: 'assistant',
          content:
            `❌ **Ollama Hatası**\n\n${errorMessage}\n\n` +
            `**Sorun Giderme:**\n` +
            `1. ✅ **Ollama Desktop çalıyor mu?** → Sistem tepsisinde (system tray) yeşil ikon var mı?\n` +
            `2. ✅ **Model yüklü mü?** → Terminal'de \`ollama list\` komutunu çalıştır\n` +
            `3. ✅ **Gemma2 modeli var mı?** → \`ollama pull gemma2:2b\` (1.6GB)\n` +
            `4. ✅ **API erişilebilir mi?** → http://localhost:11434 adresini tarayıcıda aç\n\n` +
            `**Hızlı Çözüm:**\n` +
            `\`\`\`bash\n` +
            `ollama serve  # Ollama'yı başlat\n` +
            `ollama pull gemma2:2b  # Modeli indir (1.6GB)\n` +
            `\`\`\``
        })
      }
      return
    }

    if (isOpenAI) {
      // OpenAI - Cloud AI modeli (GPT-3.5/4)
      console.log('[App] Using OpenAI')

      const thinkingId = startThinking('🤖 Processing with OpenAI...')

      // 📡 Start Activity Observation (OPENAI teacher)
      let observationId: string | undefined
      try {
        const result = await window.electron.ipcRenderer.invoke('claude:startObservation', {
          teacher: 'OPENAI',
          message: cleanMessage,
          context: {
            workspacePath,
            agentMode,
            model: 'gpt-3.5-turbo'
          }
        })
        if (result.success) {
          observationId = result.observationId
          console.log('[App] 📡 Started OPENAI observation:', observationId)
        }
      } catch (err) {
        console.error('[App] Failed to start observation:', err)
      }

      try {
        addThinkingStep(thinkingId, {
          type: 'analysis',
          title: 'OpenAI GPT',
          content: 'Connecting to OpenAI API...',
          status: 'running'
        })

        setLoading(true, 'OpenAI düşünüyor...')

        // OpenAI durumunu kontrol et
        const isOpenAIAvailable = await openaiService.isAvailable()

        if (!isOpenAIAvailable) {
          throw new Error(
            'OpenAI API key not configured. Please add your API key in Settings (gear icon).'
          )
        }

        // Mevcut modelleri listele
        const models = await openaiService.listModels()
        if (models.length === 0) {
          throw new Error('No OpenAI models available')
        }

        // Varsayılan model: gpt-3.5-turbo (ucuz, hızlı, tool calling ✅)
        const DEFAULT_MODEL = 'gpt-3.5-turbo'
        const selectedModel = models.find((m) => m.id === DEFAULT_MODEL)?.id || models[0].id

        console.log('[App] Using model:', selectedModel)
        if (selectedModel !== DEFAULT_MODEL) {
          console.warn(
            `[App] Default model '${DEFAULT_MODEL}' not found, using '${selectedModel}' instead`
          )
        }

        const stepId = useChatStore
          .getState()
          .getActiveConversation()
          ?.messages.find((m) => m.id === thinkingId)?.thinkingSteps?.[0]?.id

        if (stepId) {
          updateThinkingStep(thinkingId, stepId, {
            content: `Model: ${selectedModel}\nGenerating response...`,
            status: 'running'
          })
        }

        // OpenAI ile streaming chat
        let fullResponse = ''

        // Workspace bilgisi ekle
        const workspaceContext = workspacePath ? `\nWorkspace: ${workspacePath}` : ''

        // Kullanıcı profili ekle (detaylı profil bilgisi)
        let userContext = ''
        try {
          const savedProfile = localStorage.getItem('userProfile')
          if (savedProfile) {
            const profile = JSON.parse(savedProfile)
            if (profile.name) {
              userContext = `\n\nUSER PROFILE:
Name: ${profile.name}
Role: ${profile.role || 'Developer'}
Experience: ${profile.experienceLevel || 'intermediate'}
Language: ${profile.preferences?.language || 'Turkish'}
Coding Style: ${profile.codingStyle || 'modern'}
Interests: ${profile.interests?.join(', ') || 'general programming'}`

              if (profile.personality) {
                userContext += `\nPersonality: ${profile.personality}`
              }
              if (profile.learningGoals?.length > 0) {
                userContext += `\nLearning Goals: ${profile.learningGoals.join(', ')}`
              }
            }
          }
        } catch (e) {
          console.error('[App] Failed to load user profile:', e)
        }

        // Track tool calls for learning
        const toolCallHistory: Array<{
          name: string
          args: Record<string, unknown>
          result: string
        }> = []

        // 🔧 TOOL BRIDGE: Agent mode ile tool calling
        if (agentMode) {
          console.log('[App] 🤖 Agent Mode: Tool calling enabled')

          const toolBridge = getToolBridge()

          // Prepare tools for OpenAI (clean schema - remove nested 'required' fields)
          const availableTools: Array<{
            type: 'function'
            function: {
              name: string
              description: string
              parameters: Record<string, unknown>
            }
          }> = toolRegistry.getForAI().map((tool) => {
            // Deep clone to avoid mutating original
            const cleanedParams = JSON.parse(JSON.stringify(tool.parameters))

            // Remove 'required' from nested properties (OpenAI doesn't support it)
            if (cleanedParams.properties) {
              Object.values(cleanedParams.properties).forEach((prop: unknown) => {
                if (prop && typeof prop === 'object' && 'required' in prop) {
                  delete (prop as Record<string, unknown>).required
                }
              })
            }

            return {
              type: 'function' as const,
              function: {
                name: tool.name,
                description: tool.description,
                parameters: cleanedParams
              }
            }
          })

          console.log(`[App] 📦 Sending ${availableTools.length} tools to model`)

          // Tool execution callback (same as Ollama)
          const handleToolCall = async (
            toolName: string,
            args: Record<string, unknown>
          ): Promise<string> => {
            console.log(`[ToolBridge] 🔧 Executing: ${toolName}`)
            console.log('[ToolBridge] Args:', args)

            const startTime = Date.now()
            const tool = toolRegistry.get(toolName)
            if (!tool) {
              return `ERROR: Tool ${toolName} not found`
            }

            let result: string
            let success = false

            try {
              const toolResult = await tool.implementation(args, {
                ide: toolBridge,
                workspaceDir: workspacePath || undefined
              })

              // Format result
              result = toolResult.map((item) => `${item.name}:\n${item.content}`).join('\n\n')
              success = true

              console.log(`[ToolBridge] ✅ ${toolName} completed`)

              // 🌙 NIGHT ORDERS: Record successful tool call
              toolCallHistory.push({
                name: toolName,
                args,
                result
              })
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error)
              console.error(`[ToolBridge] ❌ ${toolName} failed:`, errorMsg)
              result = `ERROR: ${errorMsg}`

              // 🌙 NIGHT ORDERS: Learn from failure
              nightOrders.observeFailure(
                cleanMessage,
                [toolName],
                [], // We don't know correct tools yet
                errorMsg
              )
            }

            // 📡 Record tool call for observation
            if (observationId) {
              try {
                await window.electron.ipcRenderer.invoke('claude:recordToolCall', {
                  observationId,
                  toolName,
                  params: args,
                  result,
                  success,
                  executionTime: Date.now() - startTime
                })
              } catch (err) {
                console.error('[App] Failed to record tool call:', err)
              }
            }

            return result
          }

          // Use chatWithTools (same interface as Ollama)
          fullResponse = await openaiService.chatWithTools(
            {
              model: selectedModel,
              messages: [
                {
                  role: 'system',
                  content: `You are LUMA AI, a helpful coding assistant.${workspaceContext}${userContext}

AVAILABLE TOOLS (${availableTools.length} tools):
${availableTools
  .map((t, i) => `${i + 1}. ${t.function.name} - ${t.function.description.split('\n')[0]}`)
  .join('\n')}

CRITICAL TOOL USAGE RULES:
1. ONLY use the ${availableTools.length} tools listed above
2. NEVER mention or use tools not in this list (no code_analyzer, write_tests, etc.)
3. If user asks for unavailable functionality, explain which AVAILABLE tool can help
4. Simple greetings ("hi", "selam") → NO TOOLS NEEDED - just respond!
5. ONE TOOL CALL PER TASK - After success, STOP calling tools and RESPOND
6. NO DUPLICATE CALLS - Never call the same tool twice in one request

FILE HANDLING:
- Use str_replace_editor for: viewing files, editing files, creating files, listing directories
- Common filename patterns:
  * "readme" → "README.md" (auto-add .md extension)
  * "license" → "LICENSE"
  * "package.json" → use exact filename

WORKFLOW:
1. User asks question
2. Call appropriate tool ONCE (if needed)
3. Get result
4. STOP calling tools
5. Respond with helpful answer

Available tools: ${availableTools.map((t) => t.function.name).join(', ')}

Respond naturally and concisely.`
                },
                { role: 'user', content: cleanMessage }
              ],
              tools: availableTools,
              temperature: 0.7,
              max_tokens: 1000
            },
            handleToolCall,
            (chunk) => {
              console.log('[App] Response chunk:', chunk.substring(0, 50))
            }
          )
        } else {
          // Simple chat mode (no tools)
          await openaiService.chatStream(
            {
              model: selectedModel,
              messages: [
                {
                  role: 'system',
                  content: `You are LUMA AI, a helpful assistant.${workspaceContext}${userContext}

Respond naturally and friendly. Keep answers concise.
Note: Advanced file operations require tool mode.`
                },
                { role: 'user', content: cleanMessage }
              ],
              temperature: 0.7,
              max_tokens: 500
            },
            (chunk) => {
              fullResponse += chunk
              // Real-time update
              if (fullResponse.length % 10 === 0) {
                console.log('[App] OpenAI chunk:', chunk)
              }
            }
          )
        }

        // ⚠️ Boş response kontrolü
        if (!fullResponse || fullResponse.trim().length === 0) {
          throw new Error('Empty response from OpenAI')
        }

        if (stepId) {
          updateThinkingStep(thinkingId, stepId, {
            status: 'completed',
            content: `✅ Response generated (${fullResponse.length} characters)`
          })
        }

        completeThinking(thinkingId)
        setLoading(false)

        // 📡 Complete Activity Observation (success)
        if (observationId) {
          try {
            await window.electron.ipcRenderer.invoke('claude:completeObservation', {
              observationId,
              response: fullResponse,
              success: true
            })
            console.log('[App] 📡 Completed OPENAI observation (success)')
          } catch (err) {
            console.error('[App] Failed to complete observation:', err)
          }
        }

        // 🌙 NIGHT ORDERS: If tools were used successfully, record pattern
        if (toolCallHistory.length > 0) {
          console.log(`[NightOrders] 📚 Recording ${toolCallHistory.length} successful tool calls`)
          // Learning system works the same as Ollama
        }

        addMessage({
          role: 'assistant',
          content: fullResponse
        })
      } catch (error) {
        console.error('[App] OpenAI error:', error)
        setLoading(false)
        completeThinking(thinkingId)

        // 📡 Complete Activity Observation (failure)
        if (observationId) {
          try {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            await window.electron.ipcRenderer.invoke('claude:completeObservation', {
              observationId,
              response: errorMessage,
              success: false
            })
            console.log('[App] 📡 Completed OPENAI observation (failure)')
          } catch (err) {
            console.error('[App] Failed to complete observation:', err)
          }
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        addMessage({
          role: 'assistant',
          content:
            `❌ **OpenAI Hatası**\n\n${errorMessage}\n\n` +
            `**Sorun Giderme:**\n` +
            `1. ✅ **API key ayarlandı mı?** → Settings'ten (⚙️) OpenAI API key ekleyin\n` +
            `2. ✅ **API key doğru mu?** → "sk-proj-..." ile başlamalı\n` +
            `3. ✅ **Kredi var mı?** → https://platform.openai.com/account/billing adresini kontrol edin\n` +
            `4. ✅ **Internet bağlantısı var mı?** → OpenAI cloud servis, internet gerektirir\n\n` +
            `**Hızlı Çözüm:**\n` +
            `1. Settings'i aç (⚙️ buton)\n` +
            `2. OpenAI API Key alanına key'inizi girin\n` +
            `3. Save butonuna basın\n` +
            `4. Tekrar deneyin`
        })
      }
      return
    }

    if (isLocalMCP) {
      // Local MCP Server - Ollama kullanarak işle
      console.log('[App] Using Local MCP Server with Ollama')

      const thinkingId = startThinking('🖥️ Processing with Local MCP...')

      try {
        addThinkingStep(thinkingId, {
          type: 'analysis',
          title: 'Local MCP Server',
          content: 'Connecting to Ollama (localhost:11434)...',
          status: 'running'
        })

        setLoading(true, 'Processing with Ollama...')

        // Ollama ile sohbet et
        const isOllamaAvailable = await ollamaService.isAvailable()

        if (!isOllamaAvailable) {
          throw new Error('Ollama is not running on localhost:11434')
        }

        // Mevcut modelleri listele
        const models = await ollamaService.listModels()
        const selectedModel = models.length > 0 ? models[0].name : 'phi3.5:3.8b'

        const response = await ollamaService.chat({
          model: selectedModel,
          messages: [
            { role: 'system', content: 'You are LUMA AI assistant. Be helpful and concise.' },
            { role: 'user', content: cleanMessage }
          ],
          options: {
            temperature: 0.7
          }
        })

        const stepId = useChatStore
          .getState()
          .getActiveConversation()
          ?.messages.find((m) => m.id === thinkingId)?.thinkingSteps?.[0]?.id

        if (stepId) {
          updateThinkingStep(thinkingId, stepId, {
            status: 'completed',
            content: 'Response generated successfully'
          })
        }

        completeThinking(thinkingId)
        setLoading(false)

        addMessage({
          role: 'assistant',
          content: response
        })
      } catch (error) {
        console.error('[App] Local MCP error:', error)
        setLoading(false)
        completeThinking(thinkingId)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        addMessage({
          role: 'assistant',
          content:
            `❌ **Local MCP Server Error**\n\n${errorMessage}\n\n` +
            `**Troubleshooting:**\n` +
            `1. Make sure Ollama is installed\n` +
            `2. Run: \`ollama serve\`\n` +
            `3. Pull a model: \`ollama pull llama2\`\n` +
            `4. Check if http://localhost:11434 is accessible`
        })
      }
      return
    }

    // Claude MCP Server - Direkt Claude API kullan
    console.log('[App] Using Claude MCP Server')

    const thinkingId = startThinking('💭 Claude Sonnet 4 is thinking...')

    try {
      // 💭 Step 1: Analyzing request
      const analysisStepId = Date.now().toString()
      addThinkingStep(thinkingId, {
        type: 'analysis',
        title: '🔍 Analyzing request...',
        content: 'Understanding user intent and gathering context',
        status: 'running'
      })

      setLoading(true, 'Processing with Claude...')

      // 💭 Complete analysis step
      setTimeout(() => {
        const thinkingMessage = useChatStore
          .getState()
          .getActiveConversation()
          ?.messages.find((m) => m.id === thinkingId)
        const analysisStep = thinkingMessage?.thinkingSteps?.[0]
        if (analysisStep) {
          updateThinkingStep(thinkingId, analysisStep.id, {
            status: 'completed',
            content: '✅ Context gathered, planning actions'
          })
        }
      }, 100)

      // 💭 Step 2: Connecting to Claude API
      addThinkingStep(thinkingId, {
        type: 'analysis',
        title: '🔗 Connecting to Claude API...',
        content: 'claude-sonnet-4-20250514 (200K context)',
        status: 'running'
      })

      // Claude API'ye mesaj gönder (workspace context ile - profil artık IPC'de)
      const result = await window.claudeAPI?.sendMessage(cleanMessage, {
        workspacePath: workspacePath,
        timestamp: new Date().toISOString()
      })

      if (!result?.success) {
        throw new Error(result?.error || 'Claude API request failed')
      }

      // 💭 Complete connection step
      const connectionStep = useChatStore
        .getState()
        .getActiveConversation()
        ?.messages.find((m) => m.id === thinkingId)
        ?.thinkingSteps?.find((s) => s.title.includes('Connecting'))

      if (connectionStep) {
        updateThinkingStep(thinkingId, connectionStep.id, {
          status: 'completed',
          content: '✅ Connected successfully'
        })
      }

      // Boş response kabul edilebilir (Claude bazen tool sonrası hiçbir şey demez)
      const responseText = result.response || ''

      completeThinking(thinkingId)
      setLoading(false)

      // Boş response kontrolü - Claude tool kullandıysa açıklama istemeyebilir
      let finalMessage = responseText
      if (responseText.trim() === '') {
        // Check if Claude used tools during this request
        const toolsUsed = claudeToolsUsed.length > 0 ? claudeToolsUsed : []
        if (toolsUsed.length > 0) {
          finalMessage = `✅ İşlem tamamlandı.\n\n🔧 Kullanılan araçlar: ${toolsUsed.map((t) => `\`${t}\``).join(', ')}\n\nDeğişiklikleri Editor ve Terminal panellerinde görebilirsiniz.`
        } else {
          finalMessage =
            '✅ İşlem tamamlandı. Değişiklikleri Editor panelinde görebilirsiniz.'
        }
        // Reset tools counter for next request
        setClaudeToolsUsed([])
      }

      addMessage({
        role: 'assistant',
        content: finalMessage
      })
    } catch (error) {
      console.error('[App] Claude MCP error:', error)
      setLoading(false)
      completeThinking(thinkingId)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addMessage({
        role: 'assistant',
        content:
          `❌ **Claude MCP Server Error**\n\n${errorMessage}\n\n` +
          `**Troubleshooting:**\n` +
          `1. Make sure you have a valid Claude API key\n` +
          `2. Go to Settings and add your API key\n` +
          `3. API key should start with 'sk-ant-'\n` +
          `4. Check your internet connection`
      })
    }
  }

  return (
    <div className="app-container">
      {/* Workspace Selector Modal */}
      <WorkspaceSelector />

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo dragon-logo">
            <img src={DragonLogo} alt="Dragon AI" className="dragon-svg-logo" />
            <div className="logo-text">
              <span className="logo-title">DRAGON AI</span>
              <span className="logo-subtitle">Code Assistant</span>
            </div>
          </div>
        </div>

        <div className="header-center">{/* Workspace Info */}</div>

        <div className="header-right">
          <button
            className="header-btn theme-toggle-btn"
            onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
            title={colorMode === 'dark' ? 'Light Moda Geç' : 'Dark Moda Geç'}
          >
            <i className={`fas fa-${colorMode === 'dark' ? 'sun' : 'moon'}`}></i>
            <span className="theme-name">{colorMode === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button
            className="header-btn night-orders-btn"
            onClick={() => setShowNightOrders(!showNightOrders)}
            title="Night Orders - Mission Control"
          >
            <i className="fas fa-moon"></i>
            <span className="btn-label">Night Orders</span>
          </button>
          <button
            className="header-btn agent-mode-btn"
            onClick={() => setAgentMode(!agentMode)}
            title="AI Agent Modu"
          >
            <i className="fas fa-robot"></i>
            <span className="agent-status">{agentMode ? 'AKTİF' : 'PASİF'}</span>
          </button>
          <button className="header-btn" onClick={() => setShowApiKeyManager(true)} title="Ayarlar">
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="main-layout">
        {/* Left Sidebar */}
        {layout.panels.explorer.visible && !layout.panels.explorer.minimized && (
          <div className="sidebar left-sidebar dynamic-left-panel">
            <div className="file-explorer">
              <div className="sidebar-header">
                <h3>
                  <i className="fas fa-folder-tree"></i> Dosya Gezgini
                </h3>
                <div className="explorer-actions">
                  <button className="refresh-btn" title="Yenile">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                </div>
              </div>
              <FileExplorer />
            </div>

            {/* Agent Mode Panel */}
            {agentMode && (
              <div className="agent-mode-panel">
                <div className="sidebar-header">
                  <h3>
                    <i className="fas fa-robot"></i> AI Asistan
                  </h3>
                </div>
                <AgentPanel />
              </div>
            )}
          </div>
        )}

        {/* Left Resizer */}
        {layout.panels.explorer.visible && !layout.panels.explorer.minimized && (
          <div className="resizer left-resizer" onMouseDown={() => setIsResizing('left')}></div>
        )}

        {/* Center Area */}
        <div className="center-area">
          {/* Editor Section */}
          <div className="editor-section">
            <EditorPanel />
          </div>

          {/* Bottom Resizer */}
          {layout.panels.terminal.visible && !layout.panels.terminal.minimized && (
            <div
              className="resizer bottom-resizer"
              onMouseDown={() => setIsResizing('bottom')}
            ></div>
          )}

          {/* Terminal Section */}
          {layout.panels.terminal.visible && !layout.panels.terminal.minimized && (
            <div className="terminal-section dynamic-bottom-panel">
              <TerminalPanel />
            </div>
          )}
        </div>

        {/* Right Resizer */}
        {layout.panels.chat.visible && !layout.panels.chat.minimized && (
          <div className="resizer right-resizer" onMouseDown={() => setIsResizing('right')}></div>
        )}

        {/* Right Sidebar */}
        {layout.panels.chat.visible && !layout.panels.chat.minimized && (
          <div className="sidebar right-sidebar dynamic-right-panel">
            <div className="ai-chat-panel">
              <div className="sidebar-header">
                <h3>
                  <i className="fas fa-comments"></i> AI Chat
                </h3>
                <div className="chat-header-controls">
                  <button className="clear-chat-btn" title="Sohbeti Temizle">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <ChatPanel onSendMessage={handleUserMessage} />
            </div>

            {/* Usta Modu Panel - Floating */}
            {layout.panels.ustaModu?.visible && <UstaModuPanel />}
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          <span className="status-item">Hazır</span>
          <span className="status-separator">|</span>
          <span className="status-item">
            {workspacePath ? `Workspace: ${workspacePath}` : 'No workspace'}
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">UTF-8</span>
          <span className="status-separator">|</span>
          <span className="status-item">
            <i className="fas fa-dragon status-dragon-icon"></i>
            Dragon AI v2.1.0
          </span>
        </div>
      </footer>

      {/* API Key Manager Modal */}
      {showApiKeyManager && (
        <ApiKeyManager
          onSave={() => {
            setShowApiKeyManager(false)
          }}
          onCancel={() => setShowApiKeyManager(false)}
          onThemeChange={handleThemeChange}
        />
      )}

      {/* Night Orders Panel Modal */}
      {showNightOrders && <NightOrdersPanel onClose={() => setShowNightOrders(false)} />}
    </div>
  )
}

export default App
