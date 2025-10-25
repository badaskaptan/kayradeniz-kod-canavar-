import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIConfig, AIProvider } from '../types'

interface AIStore {
  config: AIConfig
  hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
  setProvider: (provider: AIProvider) => void
  setModel: (model: string) => void
  setApiKey: (apiKey: string) => void
  setTemperature: (temperature: number) => void
  setMaxTokens: (maxTokens: number) => void
  setStreamEnabled: (enabled: boolean) => void
  resetConfig: () => void
}

const defaultConfig: AIConfig = {
  provider: 'google',
  model: 'gemini-2.0-flash',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2000,
  streamEnabled: true
}

export const useAIStore = create<AIStore>()(
  persist(
    (set) => ({
      config: defaultConfig,
      hasHydrated: false,

      setHasHydrated: (state) => {
        set({ hasHydrated: state })
      },

      setProvider: (provider) =>
        set((state) => ({
          config: { ...state.config, provider, apiKey: '', model: '' }
        })),

      setModel: (model) =>
        set((state) => ({
          config: { ...state.config, model }
        })),

      setApiKey: (apiKey) =>
        set((state) => ({
          config: { ...state.config, apiKey }
        })),

      setTemperature: (temperature) =>
        set((state) => ({
          config: { ...state.config, temperature }
        })),

      setMaxTokens: (maxTokens) =>
        set((state) => ({
          config: { ...state.config, maxTokens }
        })),

      setStreamEnabled: (enabled) =>
        set((state) => ({
          config: { ...state.config, streamEnabled: enabled }
        })),

      resetConfig: () => set({ config: defaultConfig })
    }),
    {
      name: 'luma-ai-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      }
    }
  )
)

// Available models per provider - Official API names verified
// Docs: https://platform.openai.com/docs/models
//       https://docs.anthropic.com/en/docs/about-claude/models
//       https://ai.google.dev/gemini-api/docs/models/gemini
//       https://console.groq.com/docs/models
//       https://ollama.com/library
export const AI_MODELS: Record<
  AIProvider,
  { id: string; name: string; contextWindow: number; cost?: string; recommended?: boolean }[]
> = {
  openai: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini (UCUZ)',
      contextWindow: 128000,
      cost: '$0.15/1M in',
      recommended: true
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      contextWindow: 128000,
      cost: '$2.50/1M in'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      contextWindow: 128000,
      cost: '$10/1M in'
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      contextWindow: 8192,
      cost: '$30/1M in'
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo (UCUZ)',
      contextWindow: 16385,
      cost: '$0.50/1M in',
      recommended: true
    }
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet (Latest)',
      contextWindow: 200000,
      cost: '$3/1M in',
      recommended: true
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku (UCUZ)',
      contextWindow: 200000,
      cost: '$0.80/1M in',
      recommended: true
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      contextWindow: 200000,
      cost: '$15/1M in'
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      contextWindow: 200000,
      cost: '$3/1M in'
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku (UCUZ)',
      contextWindow: 200000,
      cost: '$0.25/1M in',
      recommended: true
    }
  ],
  google: [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash (DEFAULT - ÜCRETSİZ)',
      contextWindow: 1000000,
      cost: 'FREE',
      recommended: true
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash (UCUZ)',
      contextWindow: 1000000,
      cost: '$0.075/1M in',
      recommended: true
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      contextWindow: 2000000,
      cost: '$1.25/1M in'
    }
  ],
  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B (ÜCRETSİZ)',
      contextWindow: 128000,
      cost: 'FREE',
      recommended: true
    },
    {
      id: 'llama-3.1-70b-versatile',
      name: 'Llama 3.1 70B (ÜCRETSİZ)',
      contextWindow: 128000,
      cost: 'FREE',
      recommended: true
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B (ÜCRETSİZ)',
      contextWindow: 128000,
      cost: 'FREE',
      recommended: true
    },
    {
      id: 'mixtral-8x7b-instruct-v0.1',
      name: 'Mixtral 8x7B (ÜCRETSİZ)',
      contextWindow: 32768,
      cost: 'FREE',
      recommended: true
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B (ÜCRETSİZ)',
      contextWindow: 8192,
      cost: 'FREE'
    }
  ],
  ollama: [
    {
      id: 'deepseek-coder-v2',
      name: 'DeepSeek Coder V2 (Kod için)',
      contextWindow: 128000,
      cost: 'LOCAL',
      recommended: true
    },
    {
      id: 'codellama',
      name: 'Code LLaMA (Kod için)',
      contextWindow: 16000,
      cost: 'LOCAL',
      recommended: true
    },
    {
      id: 'qwen2.5-coder',
      name: 'Qwen 2.5 Coder (Kod için)',
      contextWindow: 32000,
      cost: 'LOCAL',
      recommended: true
    },
    {
      id: 'llama3.1',
      name: 'Llama 3.1 (Genel Amaçlı)',
      contextWindow: 128000,
      cost: 'LOCAL'
    },
    {
      id: 'mistral',
      name: 'Mistral',
      contextWindow: 8000,
      cost: 'LOCAL'
    }
  ]
}
