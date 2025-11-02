/**
 * Tool Implementations Index
 * Export all available tools
 * Based on Claude's Official MCP Tools + Standard IDE Tools
 */

// Claude Official Tools
export { strReplaceEditorTool, strReplaceEditorImpl } from './strReplaceEditor'
export { bashTool, bashImpl } from './bash'

// Search Tools
export { grepSearchTool, grepSearchImpl } from './grepSearch'
export { globSearchTool, globSearchImpl } from './globSearch'

// File System Tools
export { createDirectoryTool, createDirectoryImpl } from './createDirectory'
export { deleteFileTool, deleteFileImpl } from './deleteFile'
export { moveFileTool, moveFileImpl } from './moveFile'

// Web Tools
export { webSearchTool, webSearchImpl } from './webSearch'
export { webFetchTool, webFetchImpl } from './webFetch'

// Legacy tools (kept for backwards compatibility)
export { readFileTool, readFileImpl } from './readFile'
export { createNewFileTool, createNewFileImpl } from './createNewFile'
export { singleFindAndReplaceTool, singleFindAndReplaceImpl } from './singleFindAndReplace'
export { multiEditTool, multiEditImpl } from './multiEdit'
export { listDirectoryTool, lsImpl } from './lsTool'
export { readFileRangeTool, readFileRangeImpl } from './readFileRange'
export { runTerminalCommandTool, runTerminalCommandImpl } from './runTerminalCommand'
export { changeDirectoryTool, changeDirectoryImpl } from './changeDirectory'

// Git Operations (disabled - need main process)
export { gitStatusTool, gitStatusImpl } from './gitStatus'
export { gitDiffTool, gitDiffImpl } from './gitDiff'
export { gitLogTool, gitLogImpl } from './gitLog'
export { gitAddTool, gitAddImpl } from './gitAdd'
export { gitCommitTool, gitCommitImpl } from './gitCommit'

// Re-export tools as array
import { strReplaceEditorTool } from './strReplaceEditor'
import { bashTool } from './bash'
import { grepSearchTool } from './grepSearch'
import { globSearchTool } from './globSearch'
import { createDirectoryTool } from './createDirectory'
import { deleteFileTool } from './deleteFile'
import { moveFileTool } from './moveFile'
import { webSearchTool } from './webSearch'
import { webFetchTool } from './webFetch'

import { readFileTool } from './readFile'
import { createNewFileTool } from './createNewFile'
import { singleFindAndReplaceTool } from './singleFindAndReplace'
import { multiEditTool } from './multiEdit'
import { listDirectoryTool } from './lsTool'
import { readFileRangeTool } from './readFileRange'
import { runTerminalCommandTool } from './runTerminalCommand'
import { changeDirectoryTool } from './changeDirectory'

/**
 * Claude's Official Tool Set + Extensions
 */
export const CLAUDE_OFFICIAL_TOOLS = [
  // Text Editor (Claude's primary file manipulation tool)
  strReplaceEditorTool,

  // Bash (Claude's terminal tool)
  bashTool,

  // Search
  grepSearchTool,
  globSearchTool,

  // File System
  createDirectoryTool,
  deleteFileTool,
  moveFileTool,

  // Web
  webSearchTool,
  webFetchTool,

  // Legacy File Tools (still useful)
  readFileTool,
  readFileRangeTool,
  createNewFileTool,
  singleFindAndReplaceTool,
  multiEditTool,
  listDirectoryTool,

  // Terminal
  runTerminalCommandTool,
  changeDirectoryTool
]

/**
 * All Available Tools
 * Total: 19 tools (git disabled)
 */
export const BASE_TOOLS = CLAUDE_OFFICIAL_TOOLS
