import { useState, useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, RefreshCw, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import type { ToolBridgeAPI } from '../../types'
import './TerminalPanel.css'

const getApi = (): ToolBridgeAPI => {
  if (typeof window !== 'undefined' && window.api) {
    return window.api
  }
  throw new Error('Tool Bridge API is unavailable')
}

interface CommandHistoryEntry {
  id: string
  command: string
  output: string
  exitCode: number
  timestamp: Date
}

export function TerminalPanel(): React.JSX.Element {
  const [history, setHistory] = useState<CommandHistoryEntry[]>([])
  const [currentCommand, setCurrentCommand] = useState('')
  const [cwd, setCwd] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const { workspacePath } = useWorkspaceStore()
  const api = getApi()

  // Get current working directory on mount
  useEffect(() => {
    const fetchCwd = async (): Promise<void> => {
      // Use workspace path instead of system cwd
      if (workspacePath) {
        setCwd(workspacePath)
        // Set working directory via terminal API
        await api.terminal.setCwd(workspacePath)
      }
    }
    void fetchCwd()
  }, [api, workspacePath])

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [history])

  const executeCommand = async (): Promise<void> => {
    if (!currentCommand.trim() || isExecuting) return

    const cmd = currentCommand.trim()
    setCurrentCommand('')
    setIsExecuting(true)

    const entry: CommandHistoryEntry = {
      id: `cmd-${Date.now()}`,
      command: cmd,
      output: '',
      exitCode: -1,
      timestamp: new Date()
    }

    // Add command to history immediately
    setHistory((prev) => [...prev, entry])

    try {
      // Handle special commands
      if (cmd.startsWith('cd ')) {
        const newPath = cmd.slice(3).trim()
        const result = await api.terminal.setCwd(newPath)

        if (result.success) {
          const cwdResult = await api.terminal.getCwd()
          if (cwdResult.success && cwdResult.data) {
            setCwd(cwdResult.data)
          }
          entry.output = `Changed directory to: ${newPath}`
          entry.exitCode = 0
        } else {
          entry.output = result.error || 'Failed to change directory'
          entry.exitCode = 1
        }
      } else if (cmd === 'clear' || cmd === 'cls') {
        setHistory([])
        setIsExecuting(false)
        return
      } else {
        // Execute normal command
        const result = await api.terminal.exec(cmd, cwd)

        if (result.success && result.data) {
          entry.output = result.data.stdout || result.data.stderr || ''
          entry.exitCode = result.data.exitCode || 0
        } else {
          entry.output = result.error || 'Command execution failed'
          entry.exitCode = 1
        }
      }

      // Update the entry in history
      setHistory((prev) => prev.map((e) => (e.id === entry.id ? entry : e)))
    } catch (error) {
      entry.output = error instanceof Error ? error.message : 'Unknown error'
      entry.exitCode = 1
      setHistory((prev) => prev.map((e) => (e.id === entry.id ? entry : e)))
    } finally {
      setIsExecuting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      void executeCommand()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      // TODO: Navigate command history
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      // TODO: Navigate command history
    }
  }

  const clearHistory = (): void => {
    setHistory([])
  }

  const focusInput = (): void => {
    inputRef.current?.focus()
  }

  return (
    <div className="terminal-panel">
      {/* Header */}
      <div className="terminal-header">
        <div className="terminal-title">
          <TerminalIcon size={16} />
          <span>TERMINAL</span>
        </div>
        <div className="terminal-actions">
          <button
            type="button"
            onClick={clearHistory}
            className="terminal-action-btn"
            title="Clear Terminal"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => void fetchCwd()}
            className="terminal-action-btn"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div
        ref={outputRef}
        onClick={focusInput}
        className="terminal-content"
      >
        {history.map((entry) => (
          <div key={entry.id} className="terminal-entry">
            {/* Command line */}
            <div className="terminal-prompt">
              <span className="terminal-cwd">{cwd}</span>
              <span className="terminal-symbol">$</span>
              <span className="terminal-command">{entry.command}</span>
            </div>

            {/* Output */}
            {entry.output && (
              <pre
                className={cn(
                  'terminal-output',
                  entry.exitCode !== 0 && 'terminal-error'
                )}
              >
                {entry.output}
              </pre>
            )}
          </div>
        ))}

        {/* Current prompt */}
        <div className="terminal-prompt terminal-input-line">
          <span className="terminal-cwd">{cwd}</span>
          <span className="terminal-symbol">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            className="terminal-input"
            placeholder={isExecuting ? 'Executing...' : 'Type a command...'}
            autoFocus
          />
        </div>
      </div>
    </div>
  )

  async function fetchCwd(): Promise<void> {
    const result = await api.terminal.getCwd()
    if (result.success && result.data) {
      setCwd(result.data)
    }
  }
}
