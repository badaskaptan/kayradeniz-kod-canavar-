// Claude AI Chat Panel Component
import React, { useState, useEffect, useRef } from 'react'
import './ClaudePanel.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Tool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

interface ClaudePanelProps {
  onSettingsClick: () => void
  refreshKey?: number // API key güncellendiğinde artırılacak
  workspacePath?: string // Workspace root path
}

export const ClaudePanel: React.FC<ClaudePanelProps> = ({
  onSettingsClick,
  refreshKey,
  workspacePath
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [availableTools, setAvailableTools] = useState<Tool[]>([])
  const [streamingResponse, setStreamingResponse] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Workspace path'i Claude service'e gönder
    if (workspacePath) {
      window.claudeAPI?.setWorkspacePath(workspacePath)
    }

    // API key kontrolü - refreshKey değiştiğinde yeniden çalışır
    const checkApiKey = async (): Promise<void> => {
      const hasKey = await window.claudeAPI?.hasApiKey()
      setHasApiKey(hasKey || false)
    }
    checkApiKey()

    // Tool'ları yükle
    window.claudeAPI?.listTools().then(setAvailableTools)

    // Streaming dinleyicisi
    const cleanupStreaming = window.claudeAPI?.onStreamingResponse((chunk: string) => {
      setStreamingResponse((prev) => prev + chunk)
    })

    const cleanupToolUsed = window.claudeAPI?.onToolUsed((tool) => {
      console.log('Tool kullanıldı:', tool.name)
    })

    return () => {
      cleanupStreaming?.()
      cleanupToolUsed?.()
    }
  }, [refreshKey, workspacePath]) // refreshKey ve workspacePath değişince yeniden kontrol et

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingResponse])

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return

    if (!hasApiKey) {
      alert('Lütfen önce API key ayarlayın')
      onSettingsClick()
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingResponse('')

    try {
      const result = await window.claudeAPI?.sendMessage(input)

      if (result?.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.response || '',
          timestamp: new Date()
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        alert('Hata: ' + (result?.error || 'Bilinmeyen hata'))
      }
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error)
      alert('Mesaj gönderilemedi')
    } finally {
      setIsLoading(false)
      setStreamingResponse('')
    }
  }

  const executeQuickTool = async (toolName: string): Promise<void> => {
    // Monaco Editor'dan kod al (basit implementasyon)
    const selectedCode = (
      window as unknown as {
        monaco?: { editor?: { getActiveEditor?: () => { getValue?: () => string } } }
      }
    ).monaco?.editor
      ?.getActiveEditor?.()
      ?.getValue?.()

    if (!selectedCode) {
      alert('Lütfen önce editörde kod yazın')
      return
    }

    if (!hasApiKey) {
      alert('Lütfen önce API key ayarlayın')
      onSettingsClick()
      return
    }

    setIsLoading(true)

    try {
      const result = await window.claudeAPI?.executeTool(toolName, {
        code: selectedCode,
        language: 'typescript'
      })

      if (result?.success) {
        const message: Message = {
          role: 'assistant',
          content: result.response || '',
          timestamp: new Date()
        }
        setMessages((prev) => [...prev, message])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const clearConversation = async (): Promise<void> => {
    if (confirm('Tüm konuşmayı silmek istediğinizden emin misiniz?')) {
      await window.claudeAPI?.clearHistory()
      setMessages([])
      setStreamingResponse('')
    }
  }

  return (
    <div className="claude-panel">
      {/* Header */}
      <div className="claude-panel-header">
        <div>
          <h3 className="claude-panel-title">Claude AI Assistant</h3>
          {!hasApiKey && <p className="claude-panel-warning">⚠️ API key ayarlanmamış</p>}
        </div>
        <div className="claude-panel-header-actions">
          <button
            onClick={clearConversation}
            className="claude-btn-icon"
            title="Konuşmayı temizle"
            disabled={messages.length === 0}
          >
            🗑️
          </button>
          <button onClick={onSettingsClick} className="claude-btn-icon" title="API Key Ayarları">
            ⚙️
          </button>
        </div>
      </div>

      {/* Quick Tools */}
      {hasApiKey && availableTools.length > 0 && (
        <div className="claude-quick-tools">
          {availableTools.slice(0, 4).map((tool) => (
            <button
              key={tool.name}
              onClick={() => executeQuickTool(tool.name)}
              disabled={isLoading}
              className="claude-quick-tool-btn"
              title={tool.description}
            >
              {tool.name.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="claude-messages">
        {messages.length === 0 && (
          <div className="claude-welcome">
            <h4>👋 Merhaba!</h4>
            <p>Claude AI asistanınızla konuşmaya başlayın.</p>
            <ul>
              <li>Kod analizi yapın</li>
              <li>Kod üretin</li>
              <li>Bug bulun</li>
              <li>Test yazın</li>
            </ul>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`claude-message ${msg.role === 'user' ? 'claude-message-user' : 'claude-message-assistant'}`}
          >
            <div className="claude-message-header">
              <span>{msg.role === 'user' ? 'Siz' : 'Claude'}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(msg.content)
                  alert('📋 Mesaj kopyalandı!')
                }}
                className="claude-btn-copy"
                title="Kopyala"
              >
                📋
              </button>
            </div>
            <div className="claude-message-content">{msg.content}</div>
          </div>
        ))}

        {/* Streaming Response */}
        {streamingResponse && (
          <div className="claude-message claude-message-assistant claude-message-streaming">
            <div className="claude-message-header">
              <span>Claude</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(streamingResponse)
                  alert('📋 Mesaj kopyalandı!')
                }}
                className="claude-btn-copy"
                title="Kopyala"
              >
                📋
              </button>
            </div>
            <div className="claude-message-content">
              {streamingResponse}
              <span className="claude-cursor">▋</span>
            </div>
          </div>
        )}

        {isLoading && !streamingResponse && (
          <div className="claude-loading">
            <span className="claude-loading-dots">Claude düşünüyor</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="claude-input-area">
        <div className="claude-input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={hasApiKey ? "Claude'a bir şey sorun..." : 'Önce API key ayarlayın...'}
            disabled={isLoading || !hasApiKey}
            className="claude-input"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || !hasApiKey}
            className="claude-send-btn"
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  )
}
