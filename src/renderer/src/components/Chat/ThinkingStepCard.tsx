import type { ReactNode } from 'react'
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  FileText,
  Code,
  Play,
  BarChart3
} from 'lucide-react'
import type { ThinkingStep } from '../../types'

interface ThinkingStepCardProps {
  step: ThinkingStep
}

const getStepIcon = (type: ThinkingStep['type'], status: ThinkingStep['status']): ReactNode => {
  const iconClass = 'w-4 h-4'

  if (status === 'running') {
    return <Loader2 className={`${iconClass} animate-spin text-blue-500`} />
  }
  if (status === 'completed') {
    return <CheckCircle2 className={`${iconClass} text-green-500`} />
  }
  if (status === 'failed') {
    return <XCircle className={`${iconClass} text-red-500`} />
  }

  // Pending state - show type icon
  switch (type) {
    case 'analysis':
      return <BarChart3 className={`${iconClass} text-muted-foreground`} />
    case 'tool_call':
      return <FileText className={`${iconClass} text-muted-foreground`} />
    case 'code_change':
      return <Code className={`${iconClass} text-muted-foreground`} />
    case 'execution':
      return <Play className={`${iconClass} text-muted-foreground`} />
    default:
      return <Circle className={`${iconClass} text-muted-foreground`} />
  }
}

const formatDuration = (ms?: number): string => {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function ThinkingStepCard({ step }: ThinkingStepCardProps): React.JSX.Element {
  const isActive = step.status === 'running'
  const isComplete = step.status === 'completed'
  const isFailed = step.status === 'failed'

  return (
    <div
      className={`flex items-start gap-3 px-3 py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-blue-500/10 border-l-2 border-blue-500'
          : isComplete
            ? 'bg-green-500/5 border-l-2 border-green-500'
            : isFailed
              ? 'bg-red-500/10 border-l-2 border-red-500'
              : 'bg-muted/50 border-l-2 border-transparent'
      }`}
    >
      <div className="pt-0.5">{getStepIcon(step.type, step.status)}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm font-medium ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : isComplete
                  ? 'text-foreground'
                  : isFailed
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground'
            }`}
          >
            {step.title}
          </span>

          {step.duration && (
            <span className="text-xs text-muted-foreground">{formatDuration(step.duration)}</span>
          )}
        </div>

        {step.content && (
          <p className="text-xs text-muted-foreground mt-1 break-words">{step.content}</p>
        )}

        {/* Metadata badges */}
        {step.metadata && (
          <div className="flex flex-wrap gap-2 mt-2">
            {step.metadata.file && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-xs text-foreground border border-border">
                <FileText className="w-3 h-3" />
                {step.metadata.file}
              </span>
            )}

            {step.metadata.lineChanges && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-xs border border-border">
                <span className="text-green-600">+{step.metadata.lineChanges.added}</span>
                <span className="text-red-600">-{step.metadata.lineChanges.removed}</span>
              </span>
            )}

            {step.metadata.confidence !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-xs text-foreground border border-border">
                {(step.metadata.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
