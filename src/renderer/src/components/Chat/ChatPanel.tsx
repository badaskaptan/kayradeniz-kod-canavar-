import { useState, useRef, useEffect, useMemo } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { Send, AlertCircle, Loader2, Brain } from 'lucide-react'
import { ThinkingStepCard } from './ThinkingStepCard'
import './ChatPanel.css'

interface ChatPanelProps {
  onSendMessage: (message: string) => void
}

export function ChatPanel({ onSendMessage }: ChatPanelProps): React.JSX.Element {
  const { getActiveConversation, isLoading, loadingMessage } = useChatStore()
  const [input, setInput] = useState('')
  const [mcpServer, setMcpServer] = useState<'claude' | 'local'>('claude')
  const [hasApiKey, setHasApiKey] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConversation = getActiveConversation()
  const messages = useMemo(() => activeConversation?.messages || [], [activeConversation?.messages])

  const isButtonDisabled = !input.trim() || (mcpServer === 'claude' && !hasApiKey)

  // Check for API key on mount and when MCP server changes
  useEffect(() => {
    const checkApiKey = async (): Promise<void> => {
      if (mcpServer === 'claude') {
        const hasKey = await window.claudeAPI?.hasApiKey()
        setHasApiKey(hasKey || false)
      } else {
        setHasApiKey(true) // Local MCP doesn't need API key
      }
    }
    checkApiKey()
  }, [mcpServer])

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    console.log('[ChatPanel] Form submitted, input:', input)
    console.log('[ChatPanel] MCP Server:', mcpServer)
    console.log('[ChatPanel] hasApiKey:', hasApiKey, 'isButtonDisabled:', isButtonDisabled)

    if (input.trim()) {
      console.log('[ChatPanel] Calling onSendMessage with:', input, 'server:', mcpServer)
      
      // MCP server bilgisini mesaja ekle
      const messageWithServer = mcpServer === 'local' 
        ? `[LOCAL-MCP] ${input}` 
        : input
      
      onSendMessage(messageWithServer)
      setInput('')
    } else {
      console.warn('[ChatPanel] Input is empty, not sending')
    }
  }

  return (
    <div className="chat-content">
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <i className="fas fa-comments"></i>
            <h4>Hoş Geldiniz!</h4>
            <p>Bir şeyler sormak veya kod yazmak için mesaj gönderin.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.role === 'thinking' ? 'system' : msg.role}`}
            >
              {msg.role === 'thinking' ? (
                // Thinking process visualization
                <>
                  <div className="message-content">
                    <Brain className="w-4 h-4" />
                    <span>{msg.content}</span>
                  </div>
                  <div className="thinking-steps">
                    {msg.thinkingSteps?.map((step) => (
                      <ThinkingStepCard key={step.id} step={step} />
                    ))}
                  </div>
                </>
              ) : (
                // Regular message
                <>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">{msg.timestamp.toLocaleTimeString()}</div>
                </>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="chat-loading">
            <Loader2 className="w-4 h-4" />
            <div>{loadingMessage || 'Processing...'}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="chat-input-container">
        {/* MCP Server Selector */}
        <div className="mcp-server-selector">
          <button
            type="button"
            className={`mcp-server-btn ${mcpServer === 'claude' ? 'active' : ''}`}
            onClick={() => setMcpServer('claude')}
            title="Claude API"
          >
            <i className="fas fa-cloud"></i>
            <span>Claude MCP</span>
          </button>
          <button
            type="button"
            className={`mcp-server-btn ${mcpServer === 'local' ? 'active' : ''}`}
            onClick={() => setMcpServer('local')}
            title="Ollama (Yerel)"
          >
            <i className="fas fa-server"></i>
            <span>Ollama</span>
          </button>
        </div>

        {mcpServer === 'claude' && !hasApiKey && (
          <div className="chat-warning">
            <AlertCircle className="w-4 h-4" />
            <span>Claude API key gerekli. Lütfen Settings&apos;ten API key ekleyin.</span>
          </div>
        )}
        <div className="chat-input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder={
              mcpServer === 'claude'
                ? hasApiKey
                  ? "Claude AI'ya bir soru sorun..."
                  : 'Claude API key ekleyin...'
                : "Local MCP Server'a bir soru sorun..."
            }
            disabled={mcpServer === 'claude' && !hasApiKey}
            rows={2}
          />
          <button
            type="submit"
            disabled={isButtonDisabled}
            title={
              mcpServer === 'claude' && !hasApiKey ? 'Claude API key gerekli' : 'Mesaj gönder'
            }
            className="send-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
