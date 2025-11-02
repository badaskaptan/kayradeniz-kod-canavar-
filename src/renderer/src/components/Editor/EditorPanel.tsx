import { useEditorStore } from '../../stores/editorStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useRef, useState } from 'react'
import Editor, { OnMount, loader } from '@monaco-editor/react'
import * as monacoEditor from 'monaco-editor'
import type * as Monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Configure Monaco to use local workers instead of CDN
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  }
}

// Set Monaco to use the imported instance instead of CDN
loader.config({ monaco: monacoEditor })

// Configure TypeScript/JavaScript compiler options
loader.init().then((monaco) => {
  // TypeScript defaults
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false
  })

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowJs: true,
    typeRoots: ['node_modules/@types']
  })

  // JavaScript defaults
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false
  })

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true
  })
})

import { ProblemsPanel, type Diagnostic } from './ProblemsPanel'
import './EditorPanel.css'

// Detect language from file extension
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    md: 'markdown',
    markdown: 'markdown',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    sh: 'shell',
    bash: 'shell',
    sql: 'sql',
    txt: 'plaintext'
  }
  return languageMap[ext || ''] || 'plaintext'
}

export function EditorPanel(): React.JSX.Element {
  const { tabs, getActiveTab, openTab, closeTab, setActiveTab, saveActiveTab, updateTabContent } =
    useEditorStore()
  const { setWorkspacePath } = useWorkspaceStore()
  const activeTab = getActiveTab()
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [showProblems, setShowProblems] = useState(true)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)

  // File watcher devre dışı (kullanıcı deneyimini bozuyor, dosya silme sorunu)
  // İhtiyaç olursa manuel Reload butonu eklenebilir

  // Monaco Editor setup
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Configure Monaco
    monaco.editor.setTheme('vs-dark')

    // Function to update diagnostics from markers
    const updateDiagnostics = (): void => {
      if (!editorRef.current) return

      const model = editorRef.current.getModel()
      if (!model) return

      const markers = monaco.editor.getModelMarkers({ resource: model.uri })
      const newDiagnostics: Diagnostic[] = markers.map((marker) => ({
        severity:
          marker.severity === monaco.MarkerSeverity.Error
            ? 'error'
            : marker.severity === monaco.MarkerSeverity.Warning
              ? 'warning'
              : 'info',
        message: marker.message,
        line: marker.startLineNumber,
        column: marker.startColumn,
        source: marker.source || 'monaco',
        filePath: activeTab?.path
      }))

      setDiagnostics(newDiagnostics)
      console.log(`[EditorPanel] 🔍 Found ${newDiagnostics.length} diagnostics:`, newDiagnostics)
    }

    // Listen to model markers (errors/warnings)
    monaco.editor.onDidChangeMarkers(() => {
      updateDiagnostics()
    })

    // Initial diagnostics check
    setTimeout(() => {
      updateDiagnostics()
    }, 500)

    // Listen to content changes for manual validation
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel()
      if (!model) return

      // Trigger validation after typing
      setTimeout(() => {
        updateDiagnostics()
      }, 300)
    })
  }

  // Handle editor content change
  const handleEditorChange = (value: string | undefined): void => {
    if (value !== undefined && activeTab) {
      updateTabContent(activeTab.id, value)
    }
  }

  // Jump to problem location
  const handleProblemClick = (diagnostic: Diagnostic): void => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(diagnostic.line)
      editorRef.current.setPosition({ lineNumber: diagnostic.line, column: diagnostic.column })
      editorRef.current.focus()
    }
  }

  // Tab kapat - Welcome ekranına dön
  const handleCloseTab = (tabId: string): void => {
    closeTab(tabId)
  }

  // Dosya kaydet
  const handleSave = async (): Promise<void> => {
    await saveActiveTab()
    console.log('[EditorPanel] 💾 File saved')
  }

  // İçeriği panoya kopyala
  const handleCopy = (): void => {
    if (activeTab?.content) {
      navigator.clipboard.writeText(activeTab.content)
    }
  }

  // Dosya Aç - Masaüstünden dosya seç ve editor'da aç
  const handleOpenFile = async (): Promise<void> => {
    const result = await window.api.dialog.openFile({
      title: 'Dosya Aç',
      allowMultiple: false,
      filters: [
        { name: 'Tüm Dosyalar', extensions: ['*'] },
        { name: 'TypeScript', extensions: ['ts', 'tsx'] },
        { name: 'JavaScript', extensions: ['js', 'jsx'] },
        { name: 'Web', extensions: ['html', 'css', 'json'] },
        { name: 'Markdown', extensions: ['md'] }
      ]
    })

    if (result.success && result.data && result.data.length > 0) {
      const filePath = result.data[0]
      const fileResult = await window.api.fs.readFile(filePath, 'utf-8')

      if (fileResult.success && typeof fileResult.data === 'string') {
        const fileName = filePath.split(/[\\/]/).pop() || 'untitled'
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        const languageMap: Record<string, string> = {
          ts: 'typescript',
          tsx: 'typescript',
          js: 'javascript',
          jsx: 'javascript',
          json: 'json',
          css: 'css',
          html: 'html',
          md: 'markdown',
          py: 'python',
          java: 'java'
        }
        const language = languageMap[ext] || 'plaintext'
        openTab(filePath, fileResult.data, language)
      }
    }
  }

  // Klasör Aç - Workspace olarak klasör seç
  const handleOpenFolder = async (): Promise<void> => {
    const result = await window.api.dialog.openDirectory({
      title: 'Workspace Klasörü Seç'
    })

    if (result.success && result.data) {
      setWorkspacePath(result.data)
    }
  }

  // Yeni Dosya - Kaydetme konumu seç ve boş dosya oluştur
  const handleNewFile = async (): Promise<void> => {
    const result = await window.api.dialog.saveFile({
      title: 'Yeni Dosya Oluştur',
      filters: [
        { name: 'TypeScript', extensions: ['ts'] },
        { name: 'JavaScript', extensions: ['js'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] }
      ]
    })

    if (result.success && result.data) {
      const filePath = result.data
      // Boş dosya oluştur
      const writeResult = await window.api.fs.writeFile(filePath, '', 'utf-8')

      if (writeResult.success) {
        // Editor'da aç
        const fileName = filePath.split(/[\\/]/).pop() || 'untitled'
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        const languageMap: Record<string, string> = {
          ts: 'typescript',
          tsx: 'typescript',
          js: 'javascript',
          jsx: 'javascript',
          json: 'json',
          css: 'css',
          html: 'html',
          md: 'markdown',
          txt: 'plaintext'
        }
        const language = languageMap[ext] || 'plaintext'
        openTab(filePath, '', language)
      }
    }
  }

  return (
    <div className="editor-panel">
      {activeTab ? (
        <>
          {/* Tab Bar */}
          <div className="tab-bar">
            <div className="tabs-container">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`tab ${tab.id === activeTab?.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon">
                    <i className="fas fa-file-code"></i>
                  </span>
                  <span className="tab-title">
                    {tab.path.split(/[\\/]/).pop()}
                    {tab.modified && '*'}
                  </span>
                  <button
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCloseTab(tab.id)
                    }}
                    title="Kapat"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="new-tab-btn" title="Yeni Sekme" onClick={() => void handleNewFile()}>
              <i className="fas fa-plus"></i>
            </button>
          </div>

          {/* Editor Area */}
          <div className="editor-area">
            <div className="editor-toolbar">
              <div className="editor-info">
                <span className="file-name">{activeTab.path.split(/[\\/]/).pop()}</span>
                <span className="file-path">{activeTab.path}</span>
              </div>
              <div className="editor-actions">
                <button
                  className="editor-btn"
                  title="Kaydet (Ctrl+S)"
                  onClick={() => void handleSave()}
                >
                  <i className="fas fa-save"></i>
                </button>
                <button className="editor-btn" title="Kopyala" onClick={handleCopy}>
                  <i className="fas fa-copy"></i>
                </button>
                <button
                  className={`editor-btn ${showProblems ? 'active' : ''}`}
                  title="Problems Panel"
                  onClick={() => setShowProblems(!showProblems)}
                >
                  <i className="fas fa-exclamation-triangle"></i>
                  {diagnostics.length > 0 && <span className="badge">{diagnostics.length}</span>}
                </button>
              </div>
            </div>

            <div className="editor-main-area">
              <div className="monaco-editor-wrapper">
                <Editor
                  height="100%"
                  defaultLanguage={getLanguageFromPath(activeTab.path)}
                  language={getLanguageFromPath(activeTab.path)}
                  path={activeTab.path}
                  value={activeTab.content}
                  onChange={handleEditorChange}
                  onMount={handleEditorDidMount}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                    fontLigatures: true,
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    guides: {
                      indentation: true,
                      bracketPairs: true
                    }
                  }}
                />
              </div>

              {showProblems && (
                <div className="problems-container">
                  <ProblemsPanel diagnostics={diagnostics} onProblemClick={handleProblemClick} />
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="content-area">
          <div className="welcome-screen">
            <div className="welcome-content">
              <h2>
                DRAGON AI <span className="gradient-text">Code Assistant</span>
              </h2>
              <p>AI destekli kod üretimi ve dosya yönetimi için modern desktop uygulaması</p>

              <div className="welcome-actions">
                <button className="welcome-btn primary" onClick={() => void handleOpenFile()}>
                  <i className="fas fa-folder-open"></i>
                  Dosya Aç
                </button>
                <button className="welcome-btn" onClick={() => void handleNewFile()}>
                  <i className="fas fa-file-plus"></i>
                  Yeni Dosya
                </button>
                <button className="welcome-btn" onClick={() => void handleOpenFolder()}>
                  <i className="fas fa-folder"></i>
                  Klasör Aç
                </button>
              </div>

              <div className="recent-files">
                <h3>Son Kullanılan Dosyalar</h3>
                <div className="recent-list">
                  <div className="empty-state">
                    <i className="fas fa-clock"></i>
                    <p>Henüz dosya açılmamış</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
