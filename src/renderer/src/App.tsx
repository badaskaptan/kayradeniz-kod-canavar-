import { useEffect, useState, useCallback } from 'react'
import { ChatPanel } from './components/Chat/ChatPanel'
import { EditorPanel } from './components/Editor/EditorPanel'
import { AgentPanel } from './components/AgentPanel/AgentPanel'
import { FileExplorer } from './components/Explorer/FileExplorer'
import { TerminalPanel } from './components/Terminal/TerminalPanel'
import { WorkspaceSelector } from './components/Workspace/WorkspaceSelector'
import { ApiKeyManager } from '../../components/ApiKeyManager'
import { useChatStore } from './stores/chatStore'
import { useLayoutStore } from './stores/layoutStore'
import { useEditorStore } from './stores/editorStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import { ollamaService } from './services/ollamaService'
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
  const [agentMode, setAgentMode] = useState(false)

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

  // 🎨 Resizable panels
  const [leftPanelWidth, setLeftPanelWidth] = useState(300)
  const [rightPanelWidth, setRightPanelWidth] = useState(400)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250)
  const [isResizing, setIsResizing] = useState<'left' | 'right' | 'bottom' | null>(null)

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
          throw new Error('No models available. Please run: ollama pull phi3.5:3.8b')
        }

        const selectedModel = models[0].name // İlk modeli kullan (phi3.5:3.8b olmalı)
        console.log('[App] Using model:', selectedModel)

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
        const workspaceContext = workspacePath
          ? `\n\nCurrent workspace: ${workspacePath}\n\nIMPORTANT: You cannot access workspace files directly. If user asks about project files, explain that workspace integration is not yet available and suggest using Claude MCP server instead.`
          : ''
        
        await ollamaService.chatStream(
          {
            model: selectedModel,
            messages: [
              {
                role: 'system',
                content: `You are LUMA AI coding assistant. Answer concisely in ENGLISH ONLY. Keep responses short and technical.${workspaceContext}`
              },
              { role: 'user', content: cleanMessage }
            ],
            options: {
              temperature: 0.7,
              top_p: 0.9,
              num_ctx: 4096, // 8GB RAM için optimize (daha hızlı)
              num_thread: 4 // i5-1135G7 için optimize
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

        if (stepId) {
          updateThinkingStep(thinkingId, stepId, {
            status: 'completed',
            content: `✅ Response generated (${fullResponse.length} characters)`
          })
        }

        completeThinking(thinkingId)
        setLoading(false)

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
            `❌ **Ollama Error**\n\n${errorMessage}\n\n` +
            `**Troubleshooting:**\n` +
            `1. Ollama Desktop uygulaması çalışıyor mu?\n` +
            `2. Model indirildi mi? → \`ollama pull phi3.5:3.8b\`\n` +
            `3. http://localhost:11434 erişilebilir mi?\n\n` +
            `**Hızlı Test:**\n` +
            `Terminal'de \`ollama list\` çalıştır`
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
            temperature: 0.7,
            num_ctx: 4096,
            num_thread: 4
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

      if (!result?.success || !result?.response) {
        throw new Error(result?.error || 'No response from Claude API')
      }

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

      addMessage({
        role: 'assistant',
        content: result.response
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
          <div className="sidebar left-sidebar" style={{ width: `${leftPanelWidth}px` }}>
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
            <div className="terminal-section" style={{ height: `${bottomPanelHeight}px` }}>
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
          <div className="sidebar right-sidebar" style={{ width: `${rightPanelWidth}px` }}>
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
