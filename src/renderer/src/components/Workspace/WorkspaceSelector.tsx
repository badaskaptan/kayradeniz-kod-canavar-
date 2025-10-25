import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import type { ToolBridgeAPI } from '../../types'

const getApi = (): ToolBridgeAPI => {
  if (typeof window !== 'undefined' && window.api) {
    return window.api
  }
  throw new Error('Tool Bridge API is unavailable')
}

export function WorkspaceSelector(): React.JSX.Element | null {
  const { workspacePath, recentWorkspaces, setWorkspacePath } = useWorkspaceStore()
  const [isSelecting, setIsSelecting] = useState(false)

  const handleSelectWorkspace = async (): Promise<void> => {
    setIsSelecting(true)
    try {
      const api = getApi()
      const result = await api.dialog.openDirectory({
        title: 'Select Workspace Folder'
      })

      if (result.success && result.data) {
        setWorkspacePath(result.data)
      }
    } catch (error) {
      console.error('[Workspace] Selection error:', error)
    } finally {
      setIsSelecting(false)
    }
  }

  if (workspacePath) {
    return null // Workspace already selected
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[600px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/40">
          <h2 className="text-lg font-semibold text-foreground">Select Workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a folder to open as your workspace
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Select Folder Button */}
          <button
            type="button"
            onClick={() => void handleSelectWorkspace()}
            disabled={isSelecting}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen className="h-5 w-5" />
            <span className="font-medium">{isSelecting ? 'Selecting...' : 'Open Folder'}</span>
          </button>

          {/* Recent Workspaces */}
          {recentWorkspaces.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-foreground mb-3">Recent Workspaces</h3>
              <div className="space-y-2">
                {recentWorkspaces.slice(0, 5).map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => setWorkspacePath(path)}
                    className="w-full text-left px-4 py-3 bg-muted/20 hover:bg-muted/40 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground truncate">{path}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-muted/20 rounded-md">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> Select a folder containing your project files. The file
              explorer and terminal will open in this directory.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
