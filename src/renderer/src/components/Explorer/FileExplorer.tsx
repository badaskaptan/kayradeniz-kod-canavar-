import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Folder,
  FolderOpen,
  RefreshCw
} from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import './FileExplorer.css'
import type { ToolBridgeAPI, ToolBridgeDirectoryItem } from '../../types'
import { cn, getLanguageFromFilename, truncate } from '../../lib/utils'

type DirectoryChildrenMap = Record<string, ToolBridgeDirectoryItem[]>

type LoadingState = {
  isLoading: boolean
  message?: string
}

const getApi = (): ToolBridgeAPI => {
  if (typeof window !== 'undefined' && window.api) {
    return window.api
  }

  throw new Error('Tool Bridge API is unavailable. Ensure preload exposes window.api.')
}

const normalizePath = (value: string): string => value.replace(/\\/g, '/').replace(/\/+$/, '')

const getRelativePath = (rootPath: string, targetPath: string): string => {
  if (!rootPath) return targetPath

  const normalizedRoot = normalizePath(rootPath)
  const normalizedTarget = normalizePath(targetPath)

  if (normalizedTarget.startsWith(normalizedRoot)) {
    const remainder = normalizedTarget.slice(normalizedRoot.length)
    return remainder.startsWith('/') ? remainder.slice(1) : remainder || normalizedTarget
  }

  return normalizedTarget
}

const sortExplorerItems = (items: ToolBridgeDirectoryItem[] = []): ToolBridgeDirectoryItem[] =>
  [...items].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

const ExplorerPlaceholder = ({ message }: { message: string }): React.JSX.Element => (
  <div className="explorer-placeholder">{message}</div>
)

const ExplorerToolbar = ({
  onRefresh,
  isRefreshing,
  rootPath,
  error
}: {
  onRefresh: () => void
  isRefreshing: boolean
  rootPath: string
  error: string | null
}): React.JSX.Element => (
  <div className="explorer-toolbar">
    <div className="explorer-breadcrumb">
      <span className="breadcrumb-title">WORKSPACE</span>
      <span className="breadcrumb-path" title={rootPath}>
        {rootPath ? truncate(getRelativePath(rootPath, rootPath) || rootPath, 40) : 'Loading...'}
      </span>
      {error ? <span className="breadcrumb-error">{error}</span> : null}
    </div>
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      className={cn('explorer-refresh-btn', isRefreshing && 'refreshing')}
      title="Refresh Explorer"
      aria-label="Refresh File Explorer"
    >
      <RefreshCw size={16} className={cn(isRefreshing && 'animate-spin')} />
    </button>
  </div>
)

const DirectoryNode = ({
  node,
  depth,
  expanded,
  onToggle
}: {
  node: ToolBridgeDirectoryItem
  depth: number
  expanded: boolean
  onToggle: (node: ToolBridgeDirectoryItem) => void
}): React.JSX.Element => {
  const Icon = expanded ? FolderOpen : Folder
  const ChevronIcon = expanded ? ChevronDown : ChevronRight

  return (
    <button
      type="button"
      onClick={() => onToggle(node)}
      className={cn('tree-item', `depth-${depth}`)}
    >
      <ChevronIcon className="tree-chevron" size={14} />
      <Icon className="tree-item-icon folder-icon" size={16} />
      <span className="tree-item-name">{node.name}</span>
    </button>
  )
}

const FileNode = ({
  node,
  depth,
  onOpen
}: {
  node: ToolBridgeDirectoryItem
  depth: number
  onOpen: (node: ToolBridgeDirectoryItem) => void
}): React.JSX.Element => (
  <button
    type="button"
    onClick={() => onOpen(node)}
    className={cn('tree-item', `depth-${depth + 1}`)}
  >
    <FileIcon className="tree-item-icon file-icon" size={16} />
    <span className="tree-item-name">{node.name}</span>
  </button>
)

export function FileExplorer(): React.JSX.Element {
  const [rootPath, setRootPath] = useState<string>('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [directoryChildren, setDirectoryChildren] = useState<DirectoryChildrenMap>({})
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: true })
  const [error, setError] = useState<string | null>(null)
  const { openTab } = useEditorStore()
  const { workspacePath } = useWorkspaceStore()
  const api = useMemo(() => getApi(), [])

  const fetchDirectory = async (path: string): Promise<void> => {
    setLoadingState({ isLoading: true })
    const result = await api.fs.readDirectory(path)

    if (!result.success || !result.data) {
      setError(result.error || 'Unable to read directory')
      setLoadingState({ isLoading: false })
      return
    }

    setDirectoryChildren((prev) => ({
      ...prev,
      [path]: sortExplorerItems(result.data)
    }))
    setLoadingState({ isLoading: false })
    setError(null)
  }

  const bootWorkspace = async (): Promise<void> => {
    setLoadingState({ isLoading: true, message: 'Loading workspace…' })

    // Use workspace path from store instead of cwd
    const workspaceToLoad = workspacePath

    if (!workspaceToLoad) {
      setError('No workspace selected')
      setLoadingState({ isLoading: false })
      return
    }

    setRootPath(workspaceToLoad)
    await fetchDirectory(workspaceToLoad)

    setExpandedPaths((prev) => {
      const next = new Set(prev)
      next.add(workspaceToLoad)
      return next
    })
  }

  useEffect(() => {
    void bootWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacePath])

  const handleToggleDirectory = async (node: ToolBridgeDirectoryItem): Promise<void> => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(node.path)) {
        next.delete(node.path)
      } else {
        next.add(node.path)
      }
      return next
    })

    const hasChildrenLoaded = directoryChildren[node.path]
    if (!hasChildrenLoaded) {
      await fetchDirectory(node.path)
    }
  }

  const handleOpenFile = async (node: ToolBridgeDirectoryItem): Promise<void> => {
    const fileResult = await api.fs.readFile(node.path, 'utf-8')

    if (!fileResult.success || typeof fileResult.data !== 'string') {
      setError(fileResult.error || `Failed to open ${node.name}`)
      return
    }

    const language = getLanguageFromFilename(node.name)
    openTab(node.path, fileResult.data, language)
  }

  const renderChildren = (path: string, depth: number = 0): React.ReactNode => {
    const children = directoryChildren[path]
    if (!children) {
      return null
    }

    return children.map((child) => {
      if (child.type === 'directory') {
        const isExpanded = expandedPaths.has(child.path)
        return (
          <div key={child.path}>
            <DirectoryNode
              node={child}
              depth={depth}
              expanded={isExpanded}
              onToggle={handleToggleDirectory}
            />
            {isExpanded ? renderChildren(child.path, depth + 1) : null}
          </div>
        )
      }

      return <FileNode key={child.path} node={child} depth={depth} onOpen={handleOpenFile} />
    })
  }

  const handleRefresh = async (): Promise<void> => {
    if (!rootPath) {
      await bootWorkspace()
      return
    }

    await fetchDirectory(rootPath)
    setExpandedPaths((prev) => new Set(prev).add(rootPath))
  }

  const renderContent = (): React.ReactNode => {
    if (loadingState.isLoading && !directoryChildren[rootPath]) {
      return <ExplorerPlaceholder message={loadingState.message || 'Loading…'} />
    }

    if (!rootPath) {
      return <ExplorerPlaceholder message="Workspace path unavailable" />
    }

    if (!directoryChildren[rootPath] || directoryChildren[rootPath].length === 0) {
      return <ExplorerPlaceholder message="No files found" />
    }

    return <div className="py-1">{renderChildren(rootPath)}</div>
  }

  return (
    <div className="file-explorer">
      <ExplorerToolbar
        onRefresh={() => void handleRefresh()}
        isRefreshing={loadingState.isLoading}
        rootPath={rootPath}
        error={error}
      />
      <div className="explorer-content">{renderContent()}</div>
    </div>
  )
}
