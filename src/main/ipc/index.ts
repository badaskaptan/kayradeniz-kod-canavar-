/**
 * IPC Handlers Index
 * Tüm IPC handler'ları buradan export ediyoruz
 */

// File and terminal handlers auto-register on import
import './fileHandlers'
import './terminalHandlers'
import { setupSearchHandlers } from './searchHandlers'
import { setupGitHandlers } from './gitHandlers'

export function setupIpcHandlers(): void {
  // File and terminal handlers are already registered
  setupSearchHandlers()
  setupGitHandlers()
}

// Diğer handler'ları buraya ekleyebiliriz:
// import './agentHandlers';
// import './reflexionHandlers';
// import './ustaModuHandlers';
