/**
 * Tool Implementations Index
 * Export all available tools
 */

export { readFileTool, readFileImpl } from './readFile'
export { createNewFileTool, createNewFileImpl } from './createNewFile'
export { singleFindAndReplaceTool, singleFindAndReplaceImpl } from './singleFindAndReplace'
export { multiEditTool, multiEditImpl } from './multiEdit'
export { lsTool, lsImpl } from './lsTool'
export { readFileRangeTool, readFileRangeImpl } from './readFileRange'
export { runTerminalCommandTool, runTerminalCommandImpl } from './runTerminalCommand'
export { changeDirectoryTool, changeDirectoryImpl } from './changeDirectory'
export { grepSearchTool, grepSearchImpl } from './grepSearch'
export { globSearchTool, globSearchImpl } from './globSearch'

// Git Operations (5 tools)
export { gitStatusTool, gitStatusImpl } from './gitStatus'
export { gitDiffTool, gitDiffImpl } from './gitDiff'
export { gitLogTool, gitLogImpl } from './gitLog'
export { gitAddTool, gitAddImpl } from './gitAdd'
export { gitCommitTool, gitCommitImpl } from './gitCommit'

// Re-export all tools as array for easy registration
import { readFileTool } from './readFile'
import { createNewFileTool } from './createNewFile'
import { singleFindAndReplaceTool } from './singleFindAndReplace'
import { multiEditTool } from './multiEdit'
import { lsTool } from './lsTool'
import { readFileRangeTool } from './readFileRange'
import { runTerminalCommandTool } from './runTerminalCommand'
import { changeDirectoryTool } from './changeDirectory'
import { grepSearchTool } from './grepSearch'
import { globSearchTool } from './globSearch'
import { gitStatusTool } from './gitStatus'
import { gitDiffTool } from './gitDiff'
import { gitLogTool } from './gitLog'
import { gitAddTool } from './gitAdd'
import { gitCommitTool } from './gitCommit'

export const BASE_TOOLS = [
  // File Operations (6 tools)
  readFileTool,
  readFileRangeTool,
  createNewFileTool,
  singleFindAndReplaceTool,
  multiEditTool,
  lsTool,

  // Terminal (2 tools)
  runTerminalCommandTool,
  changeDirectoryTool,

  // Search (2 tools)
  grepSearchTool,
  globSearchTool,

  // Git Operations (5 tools)
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitAddTool,
  gitCommitTool
]
