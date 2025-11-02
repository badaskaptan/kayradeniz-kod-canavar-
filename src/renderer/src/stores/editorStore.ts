import { create } from 'zustand'
import type { EditorTab } from '../types'
import { generateId } from '../lib/utils'

interface EditorStore {
  tabs: EditorTab[]
  activeTabId: string | null
  theme: 'vs-dark' | 'vs-light'
  fontSize: number
  wordWrap: boolean

  // Tab management
  openTab: (path: string, content: string, language: string) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  markTabAsModified: (id: string, modified: boolean) => void
  updateCursorPosition: (id: string, line: number, column: number) => void
  saveActiveTab: () => Promise<void>

  // Editor settings
  setTheme: (theme: 'vs-dark' | 'vs-light') => void
  setFontSize: (size: number) => void
  setWordWrap: (enabled: boolean) => void

  // Getters
  getActiveTab: () => EditorTab | null
  getTabByPath: (path: string) => EditorTab | null
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  theme: 'vs-dark',
  fontSize: 14,
  wordWrap: true,

  openTab: (path, content, language) => {
    const existingTab = get().getTabByPath(path)

    if (existingTab) {
      set({ activeTabId: existingTab.id })
      return
    }

    const newTab: EditorTab = {
      id: generateId(),
      path,
      content,
      language,
      modified: false,
      cursorPosition: { line: 1, column: 1 }
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))
  },

  closeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id)
      const newActiveId =
        state.activeTabId === id
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].id
            : null
          : state.activeTabId

      return {
        tabs: newTabs,
        activeTabId: newActiveId
      }
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              content,
              modified: true // ✅ Kullanıcı değiştirdiğinde modified=true
            }
          : t
      )
    })),

  markTabAsModified: (id, modified) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, modified } : t))
    })),

  updateCursorPosition: (id, line, column) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, cursorPosition: { line, column } } : t))
    })),

  saveActiveTab: async () => {
    const activeTab = get().getActiveTab()
    if (!activeTab) {
      console.log('[EditorStore] ❌ No active tab to save')
      return
    }

    console.log('[EditorStore] 💾 Saving file:', activeTab.path)
    console.log('[EditorStore] 📄 Content length:', activeTab.content.length)
    console.log('[EditorStore] 🏷️ Modified flag:', activeTab.modified)

    try {
      if (typeof window !== 'undefined' && window.api?.fs?.writeFile) {
        const result = await window.api.fs.writeFile(activeTab.path, activeTab.content, 'utf-8')

        if (result.success) {
          set((state) => ({
            tabs: state.tabs.map((t) => (t.id === activeTab.id ? { ...t, modified: false } : t))
          }))
          console.log('[EditorStore] ✅ File saved successfully:', activeTab.path)
        } else {
          console.error('[EditorStore] ❌ Save failed:', result.error)
        }
      } else {
        console.error('[EditorStore] ❌ window.api.fs.writeFile not available')
      }
    } catch (error) {
      console.error('[EditorStore] ❌ Save error:', error)
    }
  },

  setTheme: (theme) => set({ theme }),

  setFontSize: (fontSize) => set({ fontSize }),

  setWordWrap: (wordWrap) => set({ wordWrap }),

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find((t) => t.id === activeTabId) || null
  },

  getTabByPath: (path) => {
    const { tabs } = get()
    return tabs.find((t) => t.path === path) || null
  }
}))
