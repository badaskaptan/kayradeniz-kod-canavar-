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

// Git Operations
export { gitStatusTool, gitStatusImpl } from './gitStatus'
export { gitDiffTool, gitDiffImpl } from './gitDiff'
export { gitLogTool, gitLogImpl } from './gitLog'
export { gitAddTool, gitAddImpl } from './gitAdd'
export { gitCommitTool, gitCommitImpl } from './gitCommit'

// Data Transformation
export { jsonTransformTool, jsonTransformImpl } from './jsonTransform'

// Advanced HTTP
export { httpRequestTool, httpRequestImpl } from './httpRequest'

// Code Formatting
export { codeFormatTool, codeFormatImpl } from './codeFormat'

// Archive Operations
export {
  archiveCompressTool,
  archiveCompressImpl,
  archiveExtractTool,
  archiveExtractImpl,
  archiveListTool,
  archiveListImpl
} from './archiveTools'

// WebSocket Operations
export {
  wsConnectTool,
  wsConnectImpl,
  wsSendTool,
  wsSendImpl,
  wsCloseTool,
  wsCloseImpl,
  wsListTool,
  wsListImpl
} from './webSocketTool'

// YAML Operations
export { yamlParseTool, yamlParseImpl, yamlWriteTool, yamlWriteImpl } from './yamlTransform'

// Advanced Git Operations
export {
  gitBranchCreateTool,
  gitBranchCreateImpl,
  gitBranchSwitchTool,
  gitBranchSwitchImpl,
  gitBranchListTool,
  gitBranchListImpl,
  gitMergeTool,
  gitMergeImpl,
  gitBranchDeleteTool,
  gitBranchDeleteImpl
} from './gitBranch'

// Environment Variable Manager
export {
  envGetTool,
  envGetImpl,
  envSetTool,
  envSetImpl,
  envLoadFileTool,
  envLoadFileImpl,
  envSaveFileTool,
  envSaveFileImpl
} from './envManager'

// Docker Helper
export {
  dockerPsTool,
  dockerPsImpl,
  dockerImagesTool,
  dockerImagesImpl,
  dockerRunTool,
  dockerRunImpl,
  dockerStopTool,
  dockerStopImpl,
  dockerLogsTool,
  dockerLogsImpl,
  dockerExecTool,
  dockerExecImpl
} from './dockerHelper'

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

// Git Tools
import { gitStatusTool } from './gitStatus'
import { gitDiffTool } from './gitDiff'
import { gitLogTool } from './gitLog'
import { gitAddTool } from './gitAdd'
import { gitCommitTool } from './gitCommit'

// Data Tools
import { jsonTransformTool } from './jsonTransform'

// Advanced Web Tools
import { httpRequestTool } from './httpRequest'

// Code Formatting
import { codeFormatTool } from './codeFormat'

// Archive Tools
import { archiveCompressTool, archiveExtractTool, archiveListTool } from './archiveTools'

// WebSocket Tools
import { wsConnectTool, wsSendTool, wsCloseTool, wsListTool } from './webSocketTool'

// YAML Tools
import { yamlParseTool, yamlWriteTool } from './yamlTransform'

// Advanced Git Tools
import {
  gitBranchCreateTool,
  gitBranchSwitchTool,
  gitBranchListTool,
  gitMergeTool,
  gitBranchDeleteTool
} from './gitBranch'

// Environment Manager
import { envGetTool, envSetTool, envLoadFileTool, envSaveFileTool } from './envManager'

// Docker Tools
import {
  dockerPsTool,
  dockerImagesTool,
  dockerRunTool,
  dockerStopTool,
  dockerLogsTool,
  dockerExecTool
} from './dockerHelper'

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
  changeDirectoryTool,

  // Git Operations
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitAddTool,
  gitCommitTool,

  // Process Management (Disabled - API needs implementation)
  // processSpawnTool,
  // processKillTool,

  // Data Transformation
  jsonTransformTool,

  // Advanced HTTP Client
  httpRequestTool,

  // Code Formatting
  codeFormatTool,

  // Archive Operations
  archiveCompressTool,
  archiveExtractTool,
  archiveListTool,

  // WebSocket Real-time Communication
  wsConnectTool,
  wsSendTool,
  wsCloseTool,
  wsListTool,

  // YAML Support
  yamlParseTool,
  yamlWriteTool,

  // Advanced Git Operations
  gitBranchCreateTool,
  gitBranchSwitchTool,
  gitBranchListTool,
  gitMergeTool,
  gitBranchDeleteTool,

  // Environment Variable Management
  envGetTool,
  envSetTool,
  envLoadFileTool,
  envSaveFileTool,

  // Docker Container Management
  dockerPsTool,
  dockerImagesTool,
  dockerRunTool,
  dockerStopTool,
  dockerLogsTool,
  dockerExecTool
]

/**
 * All Available Tools
 * Total: 52 tools
 * ⚓ Phase 1 + Phase 2 + Phase 3 Integration:
 * - Git Operations (10 tools)
 * - HTTP/WebSocket (5 tools)
 * - Data Transform (4 tools: JSON, YAML)
 * - Code Management (4 tools)
 * - Environment Variables (4 tools)
 * - Docker Management (6 tools)
 * - File/Search/Terminal (19 tools)
 * 🌊 Production-ready multi-agent system!
 */
export const BASE_TOOLS = CLAUDE_OFFICIAL_TOOLS
