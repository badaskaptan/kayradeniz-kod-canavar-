// Learning Dashboard - MCP Learning Statistics & Patterns
import React, { useState, useEffect } from 'react'
import './LearningDashboard.css'

interface LearningStats {
  totalActivities: number
  successfulActivities: number
  totalPatterns: number
  avgSuccessRate: number
  totalToolCalls: number
}

interface LearnedPattern {
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
}

interface Activity {
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
}

interface LearningDashboardProps {
  onClose: () => void
}

export const LearningDashboard: React.FC<LearningDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [patterns, setPatterns] = useState<LearnedPattern[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [activeTab, setActiveTab] = useState<'stats' | 'patterns' | 'activities'>('stats')
  const [selectedPattern, setSelectedPattern] = useState<LearnedPattern | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    try {
      const [statsData, patternsData, activitiesData] = await Promise.all([
        window.claudeAPI?.getLearningStats(),
        window.claudeAPI?.getLearnedPatterns(),
        window.claudeAPI?.getRecentActivities(20)
      ])

      if (statsData) setStats(statsData)
      if (patternsData) setPatterns(patternsData)
      if (activitiesData) setActivities(activitiesData)
    } catch (error) {
      console.error('Failed to load learning data:', error)
    }
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('tr-TR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="learning-dashboard-overlay">
      <div className="learning-dashboard">
        {/* Header */}
        <div className="learning-dashboard-header">
          <h2>🧠 MCP Learning Dashboard</h2>
          <button onClick={onClose} className="learning-close-btn">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="learning-tabs">
          <button
            className={`learning-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 İstatistikler
          </button>
          <button
            className={`learning-tab ${activeTab === 'patterns' ? 'active' : ''}`}
            onClick={() => setActiveTab('patterns')}
          >
            🎯 Öğrenilen Pattern'ler ({patterns.length})
          </button>
          <button
            className={`learning-tab ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            📝 Son Aktiviteler ({activities.length})
          </button>
        </div>

        {/* Content */}
        <div className="learning-content">
          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="learning-stats">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.totalActivities}</div>
                  <div className="stat-label">Toplam Aktivite</div>
                </div>
              </div>

              <div className="stat-card success">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.successfulActivities}</div>
                  <div className="stat-label">Başarılı</div>
                  <div className="stat-percentage">
                    {stats.totalActivities > 0
                      ? `${((stats.successfulActivities / stats.totalActivities) * 100).toFixed(0)}%`
                      : '0%'}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.totalPatterns}</div>
                  <div className="stat-label">Öğrenilen Pattern</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🛠️</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.totalToolCalls}</div>
                  <div className="stat-label">Tool Kullanımı</div>
                </div>
              </div>

              <div className="stat-card confidence">
                <div className="stat-icon">💯</div>
                <div className="stat-info">
                  <div className="stat-value">{(stats.avgSuccessRate * 100).toFixed(0)}%</div>
                  <div className="stat-label">Ortalama Başarı</div>
                </div>
              </div>

              {/* Learning Progress */}
              <div className="learning-progress-section">
                <h3>📈 Öğrenme İlerlemesi</h3>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min((stats.totalPatterns / 50) * 100, 100)}%`
                    }}
                  >
                    <span className="progress-text">
                      {stats.totalPatterns}/50 Pattern (Hedef)
                    </span>
                  </div>
                </div>
                <p className="progress-description">
                  {stats.totalPatterns < 10 && '🌱 Başlangıç seviyesi - Daha fazla öğrenmeye devam edin!'}
                  {stats.totalPatterns >= 10 && stats.totalPatterns < 30 && '🌿 Gelişiyor - İyi bir başlangıç yaptınız!'}
                  {stats.totalPatterns >= 30 && stats.totalPatterns < 50 && '🌳 İleri seviye - Sistem çok iyi öğreniyor!'}
                  {stats.totalPatterns >= 50 && '🚀 Uzman seviye - Sistem neredeyse her şeyi biliyor!'}
                </p>
              </div>
            </div>
          )}

          {/* Patterns Tab */}
          {activeTab === 'patterns' && (
            <div className="learning-patterns">
              {patterns.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎯</div>
                  <h3>Henüz Pattern Öğrenilmedi</h3>
                  <p>Claude'u kullanmaya başladıkça sistem otomatik olarak pattern'leri öğrenecek.</p>
                </div>
              ) : (
                <div className="patterns-grid">
                  {patterns.map((pattern) => (
                    <div
                      key={pattern.id}
                      className="pattern-card"
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <div className="pattern-header">
                        <div className="pattern-confidence">
                          {(pattern.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="pattern-stats">
                          <span className="pattern-success">✅ {pattern.successCount}</span>
                          {pattern.failureCount > 0 && (
                            <span className="pattern-failure">❌ {pattern.failureCount}</span>
                          )}
                        </div>
                      </div>

                      <div className="pattern-trigger">
                        <strong>Trigger:</strong> {pattern.trigger}
                      </div>

                      <div className="pattern-keywords">
                        {pattern.triggerKeywords.slice(0, 3).map((kw, i) => (
                          <span key={i} className="keyword-badge">
                            {kw}
                          </span>
                        ))}
                        {pattern.triggerKeywords.length > 3 && (
                          <span className="keyword-badge">+{pattern.triggerKeywords.length - 3}</span>
                        )}
                      </div>

                      <div className="pattern-actions">
                        <strong>Actions:</strong>
                        <div className="action-flow">
                          {pattern.actionSequence.map((action, i) => (
                            <React.Fragment key={i}>
                              <span className="action-tool">{action.tool}</span>
                              {i < pattern.actionSequence.length - 1 && <span className="arrow">→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      <div className="pattern-meta">
                        <span>⏱️ Avg: {formatDuration(pattern.avgDuration)}</span>
                        <span>📅 {formatDate(pattern.learnedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="learning-activities">
              {activities.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h3>Henüz Aktivite Yok</h3>
                  <p>Claude ile konuşmaya başlayın, tüm aktiviteler burada görünecek.</p>
                </div>
              ) : (
                <div className="activities-list">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`activity-card ${activity.finalResult}`}
                    >
                      <div className="activity-header">
                        <div className="activity-status">
                          {activity.finalResult === 'success' && '✅'}
                          {activity.finalResult === 'failure' && '❌'}
                          {activity.finalResult === 'pending' && '⏳'}
                        </div>
                        <div className="activity-request">{activity.userRequest}</div>
                        <div className="activity-time">{formatDate(activity.timestamp)}</div>
                      </div>

                      <div className="activity-tools">
                        {activity.toolCalls.map((tool, i) => (
                          <div key={i} className={`tool-call ${tool.success ? 'success' : 'failure'}`}>
                            <span className="tool-name">{tool.name}</span>
                            <span className="tool-duration">{formatDuration(tool.duration)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="activity-footer">
                        <span>Total: {formatDuration(activity.totalDuration)}</span>
                        <span>{activity.toolCalls.length} tool calls</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pattern Detail Modal */}
        {selectedPattern && (
          <div className="pattern-modal-overlay" onClick={() => setSelectedPattern(null)}>
            <div className="pattern-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pattern-modal-header">
                <h3>Pattern Detayları</h3>
                <button onClick={() => setSelectedPattern(null)}>✕</button>
              </div>

              <div className="pattern-modal-content">
                <div className="modal-section">
                  <h4>Trigger</h4>
                  <p>{selectedPattern.trigger}</p>
                </div>

                <div className="modal-section">
                  <h4>Keywords</h4>
                  <div className="keywords-list">
                    {selectedPattern.triggerKeywords.map((kw, i) => (
                      <span key={i} className="keyword-badge">{kw}</span>
                    ))}
                  </div>
                </div>

                <div className="modal-section">
                  <h4>Action Sequence</h4>
                  <div className="actions-detailed">
                    {selectedPattern.actionSequence.map((action, i) => (
                      <div key={i} className="action-item">
                        <span className="action-number">{i + 1}</span>
                        <span className="action-tool-name">{action.tool}</span>
                        <pre className="action-params">
                          {JSON.stringify(action.paramTemplate, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-section">
                  <h4>Statistics</h4>
                  <div className="pattern-modal-stats">
                    <div>✅ Success: {selectedPattern.successCount}</div>
                    <div>❌ Failure: {selectedPattern.failureCount}</div>
                    <div>💯 Confidence: {(selectedPattern.confidence * 100).toFixed(0)}%</div>
                    <div>⏱️ Avg Duration: {formatDuration(selectedPattern.avgDuration)}</div>
                  </div>
                </div>

                <div className="modal-section">
                  <h4>Expected Outcome</h4>
                  <pre className="expected-outcome">{selectedPattern.expectedOutcome}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
