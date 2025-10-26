import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceStore {
  workspacePath: string | null
  recentWorkspaces: string[]

  setWorkspacePath: (path: string) => void
  addRecentWorkspace: (path: string) => void
  clearWorkspace: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      workspacePath: null,
      recentWorkspaces: [],

      setWorkspacePath: (path) => {
        // 🔧 FIX: Notify Claude service about workspace change
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer
            .invoke('claude:setWorkspacePath', path)
            .catch((error) =>
              console.error('[WorkspaceStore] Failed to set Claude workspace:', error)
            )
        }

        set((state) => {
          // Add to recent workspaces
          const recent = [path, ...state.recentWorkspaces.filter((p) => p !== path)].slice(0, 10)
          return {
            workspacePath: path,
            recentWorkspaces: recent
          }
        })
      },

      addRecentWorkspace: (path) =>
        set((state) => ({
          recentWorkspaces: [path, ...state.recentWorkspaces.filter((p) => p !== path)].slice(0, 10)
        })),

      clearWorkspace: () => set({ workspacePath: null })
    }),
    {
      name: 'luma-workspace-storage'
    }
  )
)
