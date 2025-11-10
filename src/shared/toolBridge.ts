export interface ToolBridgeResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ToolBridgeDirectoryItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  modified: string
}

export interface ToolBridgeFileStats {
  size: number
  modified: string
  created: string
  isDirectory: boolean
  isFile: boolean
}

export interface ToolBridgeSearchMatch {
  file: string
  line: number
  column: number
  content: string
  matchText?: string
}

export interface ToolBridgeGrepOptions {
  pattern: string
  isRegex: boolean
  caseSensitive?: boolean
  maxResults?: number
  includePattern?: string
  excludePattern?: string
}

export interface ToolBridgeGlobOptions {
  pattern: string
  maxResults?: number
  excludePattern?: string
  followSymlinks?: boolean
}

// ============================================================================
// Git Types
// ============================================================================

export interface ToolBridgeGitStatusResult {
  branch: string
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  untracked: string[]
}

export interface ToolBridgeGitDiffOptions {
  workspaceRoot?: string
  file?: string
  staged?: boolean
  fromCommit?: string
  toCommit?: string
  contextLines?: number
}

export interface ToolBridgeGitLogOptions {
  workspaceRoot?: string
  maxCount?: number
  file?: string
  oneline?: boolean
  graph?: boolean
  stat?: boolean
}

export interface ToolBridgeGitAddOptions {
  workspaceRoot?: string
  files?: string[]
  all?: boolean
  update?: boolean
}

export interface ToolBridgeGitCommitOptions {
  workspaceRoot?: string
  message: string
  amend?: boolean
  allowEmpty?: boolean
}

export interface ToolBridgeAPI {
  fs: {
    readFile: (path: string, encoding?: string) => Promise<ToolBridgeResult<string>>
    writeFile: (path: string, content: string, encoding?: string) => Promise<ToolBridgeResult<void>>
    deleteFile: (path: string) => Promise<ToolBridgeResult<void>>
    moveFile: (source: string, destination: string) => Promise<ToolBridgeResult<void>>
    createDirectory: (path: string) => Promise<ToolBridgeResult<void>>
    readDirectory: (path: string) => Promise<ToolBridgeResult<ToolBridgeDirectoryItem[]>>
    getStats: (path: string) => Promise<ToolBridgeResult<ToolBridgeFileStats>>
    exists: (path: string) => Promise<ToolBridgeResult<boolean>>
  }
  terminal: {
    exec: (
      command: string,
      cwd?: string
    ) => Promise<
      ToolBridgeResult<{ stdout: string; stderr: string; exitCode: number; executionTime?: number }>
    >
    getCwd: () => Promise<ToolBridgeResult<string>>
    setCwd: (cwd: string) => Promise<ToolBridgeResult<void>>
    getEnv: () => Promise<ToolBridgeResult<Record<string, string | undefined>>>
    setEnv: (key: string, value: string) => Promise<ToolBridgeResult<void>>
  }
  search: {
    grep: (options: ToolBridgeGrepOptions) => Promise<ToolBridgeResult<ToolBridgeSearchMatch[]>>
    glob: (options: ToolBridgeGlobOptions) => Promise<ToolBridgeResult<string[]>>
  }
  git: {
    status: (workspaceRoot?: string) => Promise<ToolBridgeResult<ToolBridgeGitStatusResult>>
    diff: (options: ToolBridgeGitDiffOptions) => Promise<ToolBridgeResult<string>>
    log: (options: ToolBridgeGitLogOptions) => Promise<ToolBridgeResult<string>>
    add: (options: ToolBridgeGitAddOptions) => Promise<ToolBridgeResult<string>>
    commit: (options: ToolBridgeGitCommitOptions) => Promise<ToolBridgeResult<string>>
  }
  shell: {
    openUrl: (url: string) => Promise<ToolBridgeResult<void>>
  }
  dialog: {
    openFile(options?: OpenFileDialogOptions): Promise<ToolBridgeResult<string[] | null>>
    openDirectory(options?: OpenDirectoryDialogOptions): Promise<ToolBridgeResult<string | null>>
    saveFile(options?: SaveFileDialogOptions): Promise<ToolBridgeResult<string | null>>
  }
  nightOrders: {
    issueFromNaturalLanguage: (
      userRequest: string
    ) => Promise<{ success: boolean; order?: any; error?: string }>
    getCurrentOrder: () => Promise<{ success: boolean; order?: any; error?: string }>
    getNextPendingTask: () => Promise<{ success: boolean; task?: any; error?: string }>
    executeNextTask: () => Promise<{
      success: boolean
      task?: any
      context?: any
      error?: string
      needsReview?: boolean
    }>
    getStatistics: () => Promise<{ success: boolean; stats?: any; error?: string }>
    completeOrder: (success: boolean) => Promise<{ success: boolean; error?: string }>
    updateConfig: (config: any) => Promise<{ success: boolean; error?: string }>
    getConfig: () => Promise<{ success: boolean; config?: any; error?: string }>
    startAutonomous: () => Promise<{ success: boolean; error?: string }>
    stopAutonomous: () => Promise<{ success: boolean; error?: string }>
  }
}

export interface FileDialogFilter {
  name: string
  extensions: string[]
}

export interface OpenFileDialogOptions {
  title?: string
  filters?: FileDialogFilter[]
  allowMultiple?: boolean
  defaultPath?: string
}

export interface OpenDirectoryDialogOptions {
  title?: string
  defaultPath?: string
}

export interface SaveFileDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileDialogFilter[]
}
