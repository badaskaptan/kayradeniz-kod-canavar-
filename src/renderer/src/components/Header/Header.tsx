import { useState } from 'react'
import { Settings, X, Key, Brain, Zap, History } from 'lucide-react'
import { useAIStore, AI_MODELS } from '../../stores/aiStore'
import type { AIProvider } from '../../types'
import { cn } from '../../lib/utils'
import { SessionMemorySettings } from '../Settings/SessionMemorySettings'

type SettingsTab = 'ai' | 'memory'

export function Header(): React.JSX.Element {
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')
  const { config, hasHydrated, setProvider, setModel, setApiKey, setTemperature, setMaxTokens } =
    useAIStore()

  const handleProviderChange = (provider: AIProvider): void => {
    setProvider(provider)
    const models = AI_MODELS[provider]
    if (models.length > 0) {
      setModel(models[0].id)
    }
  }

  return (
    <>
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">LUMA AI</h1>
          <span className="text-xs text-muted-foreground">v2.1</span>
        </div>

        <div className="flex items-center gap-4">
          {!hasHydrated ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          ) : config.apiKey ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-green-500" />
              <span>
                {config.provider.toUpperCase()} · {config.model}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-yellow-500">
              <Key className="w-4 h-4" />
              <span>API Key Required</span>
            </div>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Open AI Settings"
            title="Open AI Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-semibold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label="Close Settings"
                title="Close Settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border bg-muted/30">
              <button
                onClick={() => setActiveTab('ai')}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 font-medium transition-all',
                  activeTab === 'ai'
                    ? 'text-primary border-b-2 border-primary bg-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Brain className="w-4 h-4" />
                AI Configuration
              </button>
              <button
                onClick={() => setActiveTab('memory')}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 font-medium transition-all',
                  activeTab === 'memory'
                    ? 'text-primary border-b-2 border-primary bg-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <History className="w-4 h-4" />
                Session Memory
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'ai' && (
                <div className="space-y-6">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">AI Provider</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(['openai', 'anthropic', 'google', 'groq', 'ollama'] as AIProvider[]).map(
                        (provider) => (
                          <button
                            key={provider}
                            onClick={() => handleProviderChange(provider)}
                            className={cn(
                              'p-3 rounded-lg border-2 transition-all capitalize',
                              config.provider === provider
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {provider}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div>
                    <label htmlFor="model-select" className="block text-sm font-medium mb-2">
                      Model
                    </label>
                    <select
                      id="model-select"
                      value={config.model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Select AI Model"
                    >
                      {AI_MODELS[config.provider].map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.contextWindow.toLocaleString()} tokens)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      API Key
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Stored in localStorage)
                      </span>
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`Enter your ${config.provider} API key`}
                      className="w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Temperature */}
                  <div>
                    <label htmlFor="temperature-slider" className="block text-sm font-medium mb-2">
                      Temperature
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({config.temperature})
                      </span>
                    </label>
                    <input
                      id="temperature-slider"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full"
                      aria-label="AI Temperature Setting"
                      title={`Temperature: ${config.temperature}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <label htmlFor="max-tokens-slider" className="block text-sm font-medium mb-2">
                      Max Tokens
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({config.maxTokens})
                      </span>
                    </label>
                    <input
                      id="max-tokens-slider"
                      type="range"
                      min="100"
                      max="4000"
                      step="100"
                      value={config.maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full"
                      aria-label="Maximum Tokens Setting"
                      title={`Max Tokens: ${config.maxTokens}`}
                    />
                  </div>
                </div>
              )}

              {/* Session Memory Tab */}
              {activeTab === 'memory' && <SessionMemorySettings />}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
