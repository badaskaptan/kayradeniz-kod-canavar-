import { ElectronAPI } from '@electron-toolkit/preload'
import type { ToolBridgeAPI } from '../shared/toolBridge'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ToolBridgeAPI
  }
}
