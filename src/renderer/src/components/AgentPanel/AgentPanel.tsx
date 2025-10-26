import React from 'react'
import { Bot, Zap } from 'lucide-react'
import { useAgentStore } from '../../stores/agentStore'
import './AgentPanel.css'
import { cn } from '../../lib/utils'
import type { Agent, Task } from '../../types'

export function AgentPanel(): React.JSX.Element {
  const { agents, activeAgentId, taskQueue, setActiveAgent } = useAgentStore()

  // TODO: Template sistemi için ayrı modül gerekiyor
  // - TemplateManager modülü oluşturulacak
  // - Template CRUD işlemleri
  // - Template execution engine
  // - File/folder generation system

  const getAgentIcon = (type: Agent['type']): React.ReactNode => {
    const iconProps = { className: 'w-4 h-4' }
    switch (type) {
      case 'router':
        return <Bot {...iconProps} />
      case 'generator':
        return <Zap {...iconProps} />
      default:
        return <Bot {...iconProps} />
    }
  }

  return (
    <div className="agent-panel">
      {/* Quick Start Templates */}
      <div className="quick-start-templates">
        <h5>⚡ Hızlı Proje Başlangıç Sihirbazı</h5>
        <p className="template-description">
          Projenizi hızla başlatın. Sağ taraftaki chat&apos;ten de özel görevler
          tanımlayabilirsiniz.
        </p>
        <div className="template-grid">
          <button className="template-btn" disabled>
            <i className="fas fa-bolt"></i>
            <span>Quick Start</span>
          </button>
          <button className="template-btn" disabled>
            <i className="fas fa-react"></i>
            <span>React App</span>
          </button>
          <button className="template-btn" disabled>
            <i className="fas fa-node"></i>
            <span>Node API</span>
          </button>
          <button className="template-btn" disabled>
            <i className="fas fa-database"></i>
            <span>Database</span>
          </button>
        </div>
        <button className="template-manage-btn" disabled>
          <i className="fas fa-plus-circle"></i>
          <span>Yeni Şablon Ekle</span>
        </button>
      </div>

      {/* Agent Status */}
      <div className="agent-status-section">
        <h5>
          <i className="fas fa-robot"></i> Aktif Agentler
        </h5>
        <div className="agent-status-grid">
          {agents.slice(0, 4).map((agent) => (
            <div
              key={agent.id}
              className={cn('agent-card', agent.id === activeAgentId && 'active')}
              onClick={() => setActiveAgent(agent.id)}
            >
              <div className="agent-card-header">
                <span className="agent-card-title">{agent.name}</span>
                <div className={cn('agent-card-icon', agent.status)}>
                  {getAgentIcon(agent.type)}
                </div>
              </div>
              <div className={cn('agent-card-status', agent.status)}>{agent.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Queue */}
      {taskQueue.length > 0 && (
        <div className="task-queue">
          <div className="task-queue-header">
            <h5 className="task-queue-title">
              <i className="fas fa-tasks"></i>
              Görev Kuyruğu
              <span className="task-queue-count">{taskQueue.length}</span>
            </h5>
          </div>
          <div className="task-list">
            {taskQueue.slice(0, 5).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: Task
}

function TaskCard({ task }: TaskCardProps): React.JSX.Element {
  return (
    <div className={cn('task-item', task.status)}>
      <div className="task-item-header">
        <span className="task-item-title">{task.description}</span>
        <span className={cn('task-item-status', task.status)}>
          {task.status === 'pending' && 'Bekliyor'}
          {task.status === 'in-progress' && 'Çalışıyor'}
          {task.status === 'completed' && 'Tamamlandı'}
          {task.status === 'failed' && 'Hata'}
        </span>
      </div>
      <div className="task-item-description">
        Agent: {task.assignedAgent} • Öncelik: {task.priority}
      </div>
    </div>
  )
}
