import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LayoutConfig, PanelId } from '../types'

interface LayoutStore {
  layout: LayoutConfig

  setPanelVisible: (panelId: PanelId, visible: boolean) => void
  setPanelSize: (panelId: PanelId, size: number) => void
  setPanelMinimized: (panelId: PanelId, minimized: boolean) => void
  togglePanel: (panelId: PanelId) => void
  setOrientation: (orientation: 'horizontal' | 'vertical') => void
  resetLayout: () => void
}

const defaultLayout: LayoutConfig = {
  panels: {
    explorer: { id: 'explorer', visible: true, size: 20, minimized: false },
    editor: { id: 'editor', visible: true, size: 50, minimized: false },
    chat: { id: 'chat', visible: true, size: 30, minimized: false },
    terminal: { id: 'terminal', visible: true, size: 30, minimized: false },
    reflexion: { id: 'reflexion', visible: true, size: 30, minimized: false }
  },
  orientation: 'horizontal'
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      layout: defaultLayout,

      setPanelVisible: (panelId, visible) =>
        set((state) => ({
          layout: {
            ...state.layout,
            panels: {
              ...state.layout.panels,
              [panelId]: { ...state.layout.panels[panelId], visible }
            }
          }
        })),

      setPanelSize: (panelId, size) =>
        set((state) => ({
          layout: {
            ...state.layout,
            panels: {
              ...state.layout.panels,
              [panelId]: { ...state.layout.panels[panelId], size }
            }
          }
        })),

      setPanelMinimized: (panelId, minimized) =>
        set((state) => ({
          layout: {
            ...state.layout,
            panels: {
              ...state.layout.panels,
              [panelId]: { ...state.layout.panels[panelId], minimized }
            }
          }
        })),

      togglePanel: (panelId) =>
        set((state) => ({
          layout: {
            ...state.layout,
            panels: {
              ...state.layout.panels,
              [panelId]: {
                ...state.layout.panels[panelId],
                visible: !state.layout.panels[panelId].visible
              }
            }
          }
        })),

      setOrientation: (orientation) =>
        set((state) => ({
          layout: { ...state.layout, orientation }
        })),

      resetLayout: () => set({ layout: defaultLayout })
    }),
    {
      name: 'luma-layout-storage'
    }
  )
)
