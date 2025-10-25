import { useEditorStore } from '../../stores/editorStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import './EditorPanel.css'

export function EditorPanel(): React.JSX.Element {
  const { tabs, getActiveTab, openTab, closeTab, setActiveTab, saveActiveTab } = useEditorStore()
  const { setWorkspacePath } = useWorkspaceStore()
  const activeTab = getActiveTab()

  // Tab kapat - Welcome ekranına dön
  const handleCloseTab = (tabId: string): void => {
    closeTab(tabId)
  }

  // Dosya kaydet
  const handleSave = async (): Promise<void> => {
    await saveActiveTab()
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
                <button className="editor-btn" title="Kaydet" onClick={() => void handleSave()}>
                  <i className="fas fa-save"></i>
                </button>
                <button className="editor-btn" title="Kopyala" onClick={handleCopy}>
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            </div>

            <div className="editor-container">
              <div className="line-numbers">
                {activeTab.content.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <div className="editor-wrapper">
                <pre className="code-highlight">
                  <code>{activeTab.content}</code>
                </pre>
              </div>
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
