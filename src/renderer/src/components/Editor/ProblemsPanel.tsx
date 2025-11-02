import { useState } from 'react'
import './ProblemsPanel.css'

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info'
  message: string
  line: number
  column: number
  source: string
  filePath?: string
}

interface ProblemsPanelProps {
  diagnostics: Diagnostic[]
  onProblemClick?: (diagnostic: Diagnostic) => void
}

export function ProblemsPanel({
  diagnostics,
  onProblemClick
}: ProblemsPanelProps): React.JSX.Element {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  const filteredDiagnostics =
    filter === 'all' ? diagnostics : diagnostics.filter((d) => d.severity === filter)

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length
  const infoCount = diagnostics.filter((d) => d.severity === 'info').length

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'error':
        return 'fa-circle-xmark'
      case 'warning':
        return 'fa-triangle-exclamation'
      case 'info':
        return 'fa-circle-info'
      default:
        return 'fa-circle'
    }
  }

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'error':
        return '#f85149'
      case 'warning':
        return '#d29922'
      case 'info':
        return '#1f6feb'
      default:
        return '#8b949e'
    }
  }

  return (
    <div className="problems-panel">
      <div className="problems-header">
        <div className="problems-title">
          <i className="fas fa-exclamation-triangle"></i>
          <span>PROBLEMS</span>
        </div>
        <div className="problems-stats">
          <button
            className={`stat-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            title="Tüm sorunlar"
          >
            <i className="fas fa-list"></i>
            {diagnostics.length}
          </button>
          <button
            className={`stat-btn error ${filter === 'error' ? 'active' : ''}`}
            onClick={() => setFilter('error')}
            title="Hatalar"
          >
            <i className="fas fa-circle-xmark"></i>
            {errorCount}
          </button>
          <button
            className={`stat-btn warning ${filter === 'warning' ? 'active' : ''}`}
            onClick={() => setFilter('warning')}
            title="Uyarılar"
          >
            <i className="fas fa-triangle-exclamation"></i>
            {warningCount}
          </button>
          <button
            className={`stat-btn info ${filter === 'info' ? 'active' : ''}`}
            onClick={() => setFilter('info')}
            title="Bilgiler"
          >
            <i className="fas fa-circle-info"></i>
            {infoCount}
          </button>
        </div>
      </div>

      <div className="problems-list">
        {filteredDiagnostics.length === 0 ? (
          <div className="problems-empty">
            <i className="fas fa-check-circle"></i>
            <p>Sorun bulunamadı</p>
          </div>
        ) : (
          filteredDiagnostics.map((diagnostic, index) => (
            <div
              key={index}
              className={`problem-item ${diagnostic.severity}`}
              onClick={() => onProblemClick?.(diagnostic)}
            >
              <div className="problem-icon">
                <i
                  className={`fas ${getSeverityIcon(diagnostic.severity)}`}
                  style={{ color: getSeverityColor(diagnostic.severity) }}
                ></i>
              </div>
              <div className="problem-content">
                <div className="problem-message">{diagnostic.message}</div>
                <div className="problem-location">
                  {diagnostic.filePath && (
                    <span className="problem-file">{diagnostic.filePath.split(/[\\/]/).pop()}</span>
                  )}
                  <span className="problem-position">
                    [{diagnostic.line}:{diagnostic.column}]
                  </span>
                  {diagnostic.source && <span className="problem-source">{diagnostic.source}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
