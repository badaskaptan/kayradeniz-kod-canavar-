import { Brain, History, Zap } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'

export function SessionMemorySettings(): React.JSX.Element {
  const { sessionConfig, updateSessionConfig } = useChatStore()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Session Memory Configuration
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Control how LUMA manages conversation context. Trimming keeps recent messages, while
          summarization compresses older conversations using AI.
        </p>
      </div>

      {/* Context Window Limit */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Context Window Limit
          </span>
          <span className="text-blue-600 font-semibold">{sessionConfig.maxTurns} turns</span>
        </label>
        <input
          type="range"
          min="3"
          max="20"
          value={sessionConfig.maxTurns}
          onChange={(e) => updateSessionConfig({ maxTurns: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          aria-label="Context Window Limit"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>3 turns (Minimal)</span>
          <span>20 turns (Maximum)</span>
        </div>
        <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
          💡 <strong>Recommended:</strong> 10 turns for most conversations. Increase for complex
          multi-step tasks.
        </p>
      </div>

      {/* Summarization Toggle */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sessionConfig.enableSummarization || false}
            onChange={(e) => updateSessionConfig({ enableSummarization: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="flex items-center gap-2 text-sm font-medium">
            <Zap className="w-4 h-4" />
            Enable AI-Powered Summarization
          </span>
        </label>
        <p className="text-xs text-gray-600 ml-7">
          When enabled, LUMA will automatically compress older conversations into concise summaries,
          preserving key context while reducing token usage.
        </p>
      </div>

      {/* Summarization Settings (only if enabled) */}
      {sessionConfig.enableSummarization && (
        <div className="ml-7 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-2">
            <label className="text-sm font-medium">Context Limit (Before Summarization)</label>
            <input
              type="number"
              min="5"
              max="20"
              value={sessionConfig.contextLimit || 10}
              onChange={(e) => updateSessionConfig({ contextLimit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              aria-label="Context Limit Before Summarization"
            />
            <p className="text-xs text-gray-600">
              Maximum user turns before triggering summarization
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Keep Last N Turns Verbatim</label>
            <input
              type="number"
              min="1"
              max="5"
              value={sessionConfig.keepLastNTurns || 3}
              onChange={(e) => updateSessionConfig({ keepLastNTurns: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              aria-label="Keep Last N Turns Verbatim"
            />
            <p className="text-xs text-gray-600">
              Recent turns to keep unchanged (preserved exactly as-is)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Summarization Model</label>
            <select
              value={sessionConfig.summarizerModel || 'gpt-4o-mini'}
              onChange={(e) => updateSessionConfig({ summarizerModel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              aria-label="Summarization Model"
            >
              <option value="gpt-4o-mini">GPT-4o Mini (Fast & Economical)</option>
              <option value="gpt-4o">GPT-4o (Best Quality)</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
            </select>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold text-sm">How Session Memory Works:</h4>
        <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
          <li>
            <strong>Trimming:</strong> Keeps only the last N user turns + all assistant responses
            between them. Fast and deterministic.
          </li>
          <li>
            <strong>Summarization:</strong> Compresses old turns into a structured summary using AI.
            Preserves context across long conversations.
          </li>
          <li>
            <strong>Auto-Cleanup:</strong> Applied automatically after each message to keep context
            window within limits.
          </li>
        </ul>
      </div>

      {/* Pattern Attribution */}
      <div className="text-xs text-gray-500 italic border-t pt-4">
        📚 <strong>Pattern Source:</strong> Based on OpenAI Cookbook - Session Memory with Agents
        SDK
        <br />
        <a
          href="https://github.com/openai/openai-cookbook/blob/main/examples/agents_sdk/session_memory.ipynb"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View Original Implementation →
        </a>
      </div>
    </div>
  )
}
