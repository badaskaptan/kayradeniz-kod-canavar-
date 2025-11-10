/**
 * 🌙 Night Orders Panel - Mission Monitor (Read-Only)
 *
 * AI-DRIVEN AUTONOMOUS EXECUTION
 * - Users do NOT create missions manually
 * - Chat AI detects complex tasks and auto-starts Night Orders
 * - This panel is for MONITORING ONLY
 * - Users can intervene: pause, retry, modify
 */

import React, { useState, useEffect } from 'react'
import type { NightOrder } from '../../../../types/night-orders'
import './NightOrdersPanel.css'

interface NightOrdersPanelProps {
  onClose?: () => void
}

export const NightOrdersPanel: React.FC<NightOrdersPanelProps> = ({ onClose }) => {
  const [activeMission, setActiveMission] = useState<NightOrder | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  // Auto-refresh active mission every 2 seconds
  useEffect(() => {
    const loadMission = async (): Promise<void> => {
      try {
        const result = await window.api.nightOrders.getCurrentOrder()
        if (result.success && result.order) {
          setActiveMission(result.order)
        } else {
          setActiveMission(null)
        }
      } catch (err) {
        console.error('[NightOrders] Failed to load mission:', err)
      }
    }

    loadMission()
    const interval = setInterval(loadMission, 2000)
    return () => clearInterval(interval)
  }, [])

  // Intervention handlers
  const handlePauseMission = async (): Promise<void> => {
    try {
      await window.api.nightOrders.stopAutonomous()
      console.log('[NightOrders] Mission paused')
    } catch (err) {
      console.error('[NightOrders] Failed to pause:', err)
    }
  }

  const handleResumeMission = async (): Promise<void> => {
    try {
      await window.api.nightOrders.startAutonomous()
      console.log('[NightOrders] Mission resumed')
    } catch (err) {
      console.error('[NightOrders] Failed to resume:', err)
    }
  }

  const renderEmptyState = (): React.ReactElement => {
    return (
      <div className="night-orders-empty">
        <div className="empty-icon">🌙</div>
        <h2>No Active Missions</h2>
        <p className="empty-description">
          Night Orders prevents context loss in lightweight AI models during complex multi-step
          tasks.
        </p>

        <div className="empty-info-box">
          <h3>🎯 Why Night Orders?</h3>
          <p>
            <strong>Small models</strong> (Gemma 2B, Qwen 7B, Phi 3.8B) have limited context
            (2K-8K tokens). During multi-step tasks, they forget the mission and drift off course.
          </p>
          <p>
            <strong>Night Orders solution:</strong> Injects full mission context at every step →
            agent never loses track.
          </p>
          <p className="model-note">
            💡 <strong>Note:</strong> Large models (Claude Opus, GPT-4) with 200K+ context don't
            need this as much, but it still helps with very complex tasks (5+ steps).
          </p>
        </div>

        <div className="empty-examples">
          <h3>Try asking in chat:</h3>
          <div className="example-list">
            <div className="example-item">💡 "Refactor auth system to use JWT"</div>
            <div className="example-item">💡 "Add dark mode to the application"</div>
            <div className="example-item">💡 "Create a user dashboard with charts"</div>
          </div>
        </div>

        <div className="empty-hint">
          AI will auto-detect complexity and start Night Orders when needed (especially for
          lightweight models).
        </div>
      </div>
    )
  }

  const renderActiveMission = (): React.ReactElement => {
    if (!activeMission) return renderEmptyState()

    const completedTasks = activeMission.taskBreakdown.filter((t) => t.status === 'completed')
    const currentTask = activeMission.taskBreakdown.find((t) => t.status === 'in-progress')
    const failedTasks = activeMission.taskBreakdown.filter((t) => t.status === 'failed')

    const progress = (completedTasks.length / activeMission.taskBreakdown.length) * 100
    const isExecuting = activeMission.status === 'executing'
    const isCompleted = activeMission.status === 'completed'

    return (
      <div className="night-orders-monitor">
        {/* Mission Header */}
        <div className="mission-header">
          <div className="mission-title-section">
            <h2>🎯 {activeMission.missionTitle}</h2>
            <span className="mission-status">{activeMission.status}</span>
          </div>
          <div className="mission-meta">
            <span className="mission-id">ID: {activeMission.id.slice(0, 8)}</span>
            <span className="mission-time">
              Started: {new Date(activeMission.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="progress-stats">
            <span className="stat-item">
              ✅ {completedTasks.length} / {activeMission.taskBreakdown.length} completed
            </span>
            {failedTasks.length > 0 && (
              <span className="stat-item error">❌ {failedTasks.length} failed</span>
            )}
          </div>
        </div>

        {/* Current Task (if executing) */}
        {currentTask && isExecuting && (
          <div className="current-task-section">
            <h3>⚙️ Current Task</h3>
            <div className="task-card active">
              <div className="task-header">
                <span className="task-id">{currentTask.taskId}</span>
                <span className="task-agent">👤 {currentTask.assignedTo}</span>
              </div>
              <div className="task-description">{currentTask.description}</div>
              <div className="task-status-bar">
                <div className="status-indicator running">In Progress...</div>
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="tasks-section">
          <h3>📋 Task Breakdown</h3>

          <div className="tasks-list">
            {activeMission.taskBreakdown.map((task) => {
              const isActive = task.taskId === currentTask?.taskId
              const statusIcon =
                task.status === 'completed'
                  ? '✅'
                  : task.status === 'failed'
                    ? '❌'
                    : task.status === 'in-progress'
                      ? '⚙️'
                      : '⏳'

              return (
                <div
                  key={task.taskId}
                  className={`task-card ${task.status} ${isActive ? 'active' : ''}`}
                >
                  <div className="task-header">
                    <span className="task-status-icon">{statusIcon}</span>
                    <span className="task-id">{task.taskId}</span>
                    <span className="task-agent">{task.assignedTo}</span>
                  </div>
                  <div className="task-description">{task.description}</div>
                  {task.dependencies.length > 0 && (
                    <div className="task-dependencies">
                      Depends on: {task.dependencies.join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Intervention Controls */}
        <div className="intervention-section">
          <h3>🎮 Intervention Controls</h3>
          <div className="control-buttons">
            {isExecuting ? (
              <>
                <button className="btn-control pause" onClick={handlePauseMission}>
                  ⏸️ Pause Mission
                </button>
                <button className="btn-control info" disabled>
                  ℹ️ View Logs
                </button>
              </>
            ) : isCompleted ? (
              <div className="completion-message">
                <span className="completion-icon">🎉</span>
                <span>Mission Completed Successfully!</span>
              </div>
            ) : (
              <>
                <button className="btn-control resume" onClick={handleResumeMission}>
                  ▶️ Resume Mission
                </button>
                <button className="btn-control danger">❌ Cancel Mission</button>
              </>
            )}
          </div>
        </div>

        {/* Objectives */}
        <div className="objectives-section">
          <h3>🎯 Mission Objectives</h3>
          <ul className="objectives-list">
            {activeMission.objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="night-orders-panel">
      <div className="panel-header">
        <div className="header-title">
          <h1>🌙 Night Orders Monitor</h1>
          <p className="header-subtitle">AI-Driven Autonomous Execution</p>
        </div>
        {onClose && (
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="panel-content">
        {activeMission ? renderActiveMission() : renderEmptyState()}
      </div>

      {/* View Toggle */}
      <div className="panel-footer">
        <button
          className={`tab-button ${!showCompleted ? 'active' : ''}`}
          onClick={() => setShowCompleted(false)}
        >
          🔴 Active
        </button>
        <button
          className={`tab-button ${showCompleted ? 'active' : ''}`}
          onClick={() => setShowCompleted(true)}
        >
          ✅ Completed
        </button>
      </div>
    </div>
  )
}
