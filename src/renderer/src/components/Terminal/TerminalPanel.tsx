import { useState, useRef, useEffect } from 'react'
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Trash2,
  Plus,
  SplitSquareVertical
} from 'lucide-react'
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

interface TerminalSession {
  id: string
  name: string
  history: CommandHistoryEntry[]
  cwd: string
  commandHistory: string[] // For arrow key navigation
  historyIndex: number
}

export function TerminalPanel(): React.JSX.Element {
  const { workspacePath } = useWorkspaceStore()
  const api = getApi()

  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: 'terminal-1',
      name: 'Terminal 1',
      history: [],
      cwd: workspacePath || '',
      commandHistory: [],
      historyIndex: -1
    }
  ])
  const [activeSessionId, setActiveSessionId] = useState('terminal-1')
  const [currentCommand, setCurrentCommand] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  // Sync terminal working directory with workspace path
  useEffect(() => {
    const syncWorkspacePath = async (): Promise<void> => {
      if (workspacePath) {
        // Set backend terminal working directory to workspace
        await api.terminal.setCwd(workspacePath)

        // Update all sessions with workspace path
        setSessions((prev) =>
          prev.map((session) => ({
            ...session,
            cwd: workspacePath // Always use workspace path
          }))
        )
      }
    }
    void syncWorkspacePath()
  }, [api, workspacePath])

  // 🎯 Listen for Claude's terminal commands
  useEffect(() => {
    const handleClaudeCommand = (
      _event: Electron.IpcRendererEvent,
      data: { command: string; cwd: string }
    ): void => {
      // Add command to active terminal
      const entry: CommandHistoryEntry = {
        id: `cmd-${Date.now()}`,
        command: data.command,
        output: '⏳ Çalıştırılıyor...',
        exitCode: -1,
        timestamp: new Date()
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                history: [...s.history, entry],
                cwd: data.cwd || s.cwd
              }
            : s
        )
      )
    }

    const handleClaudeResult = (
      _event: Electron.IpcRendererEvent,
      data: { command: string; output: string; exitCode: number; success: boolean }
    ): void => {
      // Update the last command with result
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s

          const lastEntry = s.history[s.history.length - 1]
          if (lastEntry && lastEntry.command === data.command) {
            return {
              ...s,
              history: [
                ...s.history.slice(0, -1),
                {
                  ...lastEntry,
                  output: data.output,
                  exitCode: data.exitCode
                }
              ]
            }
          }
          return s
        })
      )
    }

    // Register IPC listeners
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('terminal:executeCommand', handleClaudeCommand)
      window.electron.ipcRenderer.on('terminal:commandResult', handleClaudeResult)
    }

    // Cleanup
    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeListener('terminal:executeCommand', handleClaudeCommand)
        window.electron.ipcRenderer.removeListener('terminal:commandResult', handleClaudeResult)
      }
    }
  }, [activeSessionId]) // Ensure new terminals start in workspace directory
  useEffect(() => {
    if (workspacePath && sessions.length > 0) {
      setSessions((prev) =>
        prev.map((session) => ({
          ...session,
          cwd: session.cwd || workspacePath
        }))
      )
    }
  }, [workspacePath, sessions.length])

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [activeSession?.history])

  const createNewTerminal = (): void => {
    const newId = `terminal-${Date.now()}`
    const newSession: TerminalSession = {
      id: newId,
      name: `Terminal ${sessions.length + 1}`,
      history: [],
      cwd: workspacePath || '',
      commandHistory: [],
      historyIndex: -1
    }
    setSessions((prev) => [...prev, newSession])
    setActiveSessionId(newId)
  }

  const splitTerminal = (): void => {
    const newId = `terminal-${Date.now()}`
    const currentSession = sessions.find((s) => s.id === activeSessionId)
    const newSession: TerminalSession = {
      id: newId,
      name: `Terminal ${sessions.length + 1}`,
      history: [],
      cwd: currentSession?.cwd || workspacePath || '',
      commandHistory: [],
      historyIndex: -1
    }
    setSessions((prev) => [...prev, newSession])
    setActiveSessionId(newId)
  }

  const closeTerminal = (sessionId: string): void => {
    if (sessions.length === 1) {
      // Don't close last terminal, just clear it
      clearHistory(sessionId)
      return
    }

    const sessionIndex = sessions.findIndex((s) => s.id === sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))

    // Switch to adjacent terminal
    if (sessionId === activeSessionId) {
      const newActiveIndex = sessionIndex > 0 ? sessionIndex - 1 : 0
      setActiveSessionId(
        sessions[newActiveIndex === sessionIndex ? sessionIndex + 1 : newActiveIndex].id
      )
    }
  }

  const executeCommand = async (): Promise<void> => {
    if (!currentCommand.trim() || isExecuting || !activeSession) return

    const cmd = currentCommand.trim()
    setCurrentCommand('')
    setIsExecuting(true)

    const entry: CommandHistoryEntry = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      command: cmd,
      output: '',
      exitCode: -1,
      timestamp: new Date()
    }

    // Add to command history for navigation
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              commandHistory: [...s.commandHistory, cmd],
              historyIndex: -1
            }
          : s
      )
    )

    // Add command to history immediately
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, history: [...s.history, entry] } : s))
    )

    try {
      // Handle special commands
      if (cmd.startsWith('cd ')) {
        const newPath = cmd
          .slice(3)
          .trim()
          .replace(/^["']|["']$/g, '') // Remove quotes
        const result = await api.terminal.setCwd(newPath)

        if (result.success) {
          const cwdResult = await api.terminal.getCwd()
          if (cwdResult.success && cwdResult.data) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === activeSessionId ? { ...s, cwd: cwdResult.data || s.cwd } : s
              )
            )
          }
          entry.output = `Changed directory to: ${newPath}`
          entry.exitCode = 0
        } else {
          entry.output = result.error || 'Failed to change directory'
          entry.exitCode = 1
        }
      } else if (cmd === 'clear' || cmd === 'cls') {
        clearHistory(activeSessionId)
        setIsExecuting(false)
        return
      } else if (cmd === 'exit') {
        closeTerminal(activeSessionId)
        setIsExecuting(false)
        return
      } else {
        // Execute normal command - support ALL commands
        const result = await api.terminal.exec(cmd, activeSession.cwd)

        if (result.success && result.data) {
          entry.output = result.data.stdout || result.data.stderr || ''
          entry.exitCode = result.data.exitCode || 0
        } else {
          entry.output = result.error || 'Command execution failed'
          entry.exitCode = 1
        }
      }

      // Update the entry in history
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, history: s.history.map((e) => (e.id === entry.id ? entry : e)) }
            : s
        )
      )
    } catch (error) {
      entry.output = error instanceof Error ? error.message : 'Unknown error'
      entry.exitCode = 1
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, history: s.history.map((e) => (e.id === entry.id ? entry : e)) }
            : s
        )
      )
    } finally {
      setIsExecuting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      void executeCommand()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (activeSession && activeSession.commandHistory.length > 0) {
        const newIndex =
          activeSession.historyIndex === -1
            ? activeSession.commandHistory.length - 1
            : Math.max(0, activeSession.historyIndex - 1)

        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, historyIndex: newIndex } : s))
        )
        setCurrentCommand(activeSession.commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (activeSession && activeSession.historyIndex !== -1) {
        const newIndex =
          activeSession.historyIndex < activeSession.commandHistory.length - 1
            ? activeSession.historyIndex + 1
            : -1

        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, historyIndex: newIndex } : s))
        )
        setCurrentCommand(newIndex === -1 ? '' : activeSession.commandHistory[newIndex])
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C - Cancel current command
      e.preventDefault()
      setCurrentCommand('')
    } else if (e.key === 'l' && e.ctrlKey) {
      // Ctrl+L - Clear screen
      e.preventDefault()
      if (activeSession) {
        clearHistory(activeSession.id)
      }
    }
  }

  const clearHistory = (sessionId: string): void => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, history: [] } : s)))
  }

  const focusInput = (): void => {
    inputRef.current?.focus()
  }

  if (!activeSession) return <div>No active terminal</div>

  return (
    <div className="terminal-panel">
      {/* Header with tabs */}
      <div className="terminal-header">
        <div className="terminal-tabs">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={cn('terminal-tab', session.id === activeSessionId && 'active')}
            >
              <TerminalIcon size={12} />
              <span>{session.name}</span>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTerminal(session.id)
                  }}
                  className="terminal-tab-close"
                  title="Close Terminal"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="terminal-actions">
          <button
            type="button"
            onClick={createNewTerminal}
            className="terminal-action-btn"
            title="New Terminal"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={splitTerminal}
            className="terminal-action-btn"
            title="Split Terminal"
          >
            <SplitSquareVertical size={14} />
          </button>
          <button
            type="button"
            onClick={() => clearHistory(activeSessionId)}
            className="terminal-action-btn"
            title="Clear Terminal (Ctrl+L)"
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
      <div ref={outputRef} onClick={focusInput} className="terminal-content">
        {activeSession.history.map((entry) => (
          <div key={entry.id} className="terminal-entry">
            {/* Command line */}
            <div className="terminal-prompt">
              <span className="terminal-cwd">
                {entry.command.startsWith('cd ') ? activeSession.cwd : activeSession.cwd}
              </span>
              <span className="terminal-symbol">$</span>
              <span className="terminal-command">{entry.command}</span>
            </div>

            {/* Output */}
            {entry.output && (
              <pre className={cn('terminal-output', entry.exitCode !== 0 && 'terminal-error')}>
                {entry.output}
              </pre>
            )}
          </div>
        ))}

        {/* Current prompt */}
        <div className="terminal-prompt terminal-input-line">
          <span className="terminal-cwd">{activeSession.cwd}</span>
          <span className="terminal-symbol">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            className="terminal-input"
            placeholder={isExecuting ? '⏳ Executing command...' : 'Type a command...'}
            autoFocus
          />
        </div>
      </div>
    </div>
  )

  async function fetchCwd(): Promise<void> {
    const result = await api.terminal.getCwd()
    if (result.success && result.data && activeSession) {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, cwd: result.data || s.cwd } : s))
      )
    }
  }
}
