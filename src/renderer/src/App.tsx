import { useEffect, useState, useCallback } from 'react'
import { ChatPanel } from './components/Chat/ChatPanel'
import { EditorPanel } from './components/Editor/EditorPanel'
import { AgentPanel } from './components/AgentPanel/AgentPanel'
import { FileExplorer } from './components/Explorer/FileExplorer'
import { TerminalPanel } from './components/Terminal/TerminalPanel'
import { UstaModuPanel } from './components/UstaModu/UstaModuPanel'
import { WorkspaceSelector } from './components/Workspace/WorkspaceSelector'
import { ApiKeyManager } from '../../components/ApiKeyManager'
import { useChatStore } from './stores/chatStore'
import { useLayoutStore } from './stores/layoutStore'
import { useEditorStore } from './stores/editorStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import { ollamaService } from './services/ollamaService'
import { nightOrders } from './services/nightOrdersService'
import { getToolRegistry } from './tools/registry'
import { BASE_TOOLS } from './tools/implementations'
import type { ToolBridgeAPI } from './types'
import DragonLogo from './assets/dragon_logo.svg'

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
  const [currentTheme, setCurrentTheme] = useState('dragon')
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark')
  const [agentMode, setAgentMode] = useState(true) // 🔧 TOOL MODE ENABLED by default

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

  // 🎨 Load saved theme/mode on mount
  useEffect(() => {
    // Priority: localStorage > userProfile
    const savedTheme = localStorage.getItem('luma-theme')
    const savedMode = localStorage.getItem('luma-color-mode') as 'dark' | 'light' | null

    // If no localStorage theme, check userProfile
    if (!savedTheme) {
      const savedProfile = localStorage.getItem('userProfile')
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile)
          if (profile.theme?.current) {
            setCurrentTheme(profile.theme.current)
          }
        } catch (e) {
          console.error('Profile parse error:', e)
        }
      }
    } else {
      setCurrentTheme(savedTheme)
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
          console.warn('[App] ⚠️ No models installed - run: ollama pull qwen2.5:0.5b')
          return
        }

        const modelToPreload = models.find((m) => m.name === 'qwen2.5:0.5b') || models[0]
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
    const isLocalMCP = message.startsWith('[LOCAL-MCP]')
    const cleanMessage = isOllama
      ? message.replace('[OLLAMA]', '').trim()
      : isLocalMCP
        ? message.replace('[LOCAL-MCP]', '').trim()
        : message

    console.log('[App] Server Type:', isOllama ? 'Ollama' : isLocalMCP ? 'Local MCP' : 'Claude')
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
          throw new Error('No models available. Please run: ollama pull qwen2.5:0.5b')
        }

        // Varsayılan model: qwen2.5:0.5b (400MB, ultra-fast, Tool Calling ✅)
        const DEFAULT_MODEL = 'qwen2.5:0.5b'
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

    const thinkingId = startThinking('💭 Thinking...')

    try {
      addThinkingStep(thinkingId, {
        type: 'analysis',
        title: 'Claude MCP Server',
        content: 'Connecting to Anthropic Claude API...',
        status: 'running'
      })

      setLoading(true, 'Processing with Claude...')

      // Claude API'ye mesaj gönder (workspace context ile - profil artık IPC'de)
      const result = await window.claudeAPI?.sendMessage(cleanMessage, {
        workspacePath: workspacePath,
        timestamp: new Date().toISOString()
      })

      if (!result?.success) {
        throw new Error(result?.error || 'Claude API request failed')
      }

      // Boş response kabul edilebilir (Claude bazen tool sonrası hiçbir şey demez)
      const responseText = result.response || ''

      const stepId = useChatStore
        .getState()
        .getActiveConversation()
        ?.messages.find((m) => m.id === thinkingId)?.thinkingSteps?.[0]?.id

      if (stepId) {
        updateThinkingStep(thinkingId, stepId, {
          status: 'completed',
          content: 'Response received from Claude'
        })
      }

      completeThinking(thinkingId)
      setLoading(false)

      // Boş response ise bilgilendirme mesajı ekle
      const finalMessage =
        responseText.trim() === ''
          ? '✅ İşlem tamamlandı (Claude herhangi bir açıklama yapmadı)'
          : responseText

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
    </div>
  )
}

export default App
