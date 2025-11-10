import React, { useState, useEffect } from 'react'
import { ollamaService } from '../../services/ollamaService'
import type { OllamaModel } from '../../services/ollamaService'
import './OllamaSettings.css'
import './OllamaSettings.css'

export function OllamaSettings(): React.JSX.Element {
  const [isAvailable, setIsAvailable] = useState(false)
  const [models, setModels] = useState<OllamaModel[]>([])
  const [isChecking, setIsChecking] = useState(true)
  const [selectedModel, setSelectedModel] = useState('llama2')
  const [intelligenceModel, setIntelligenceModel] = useState('')
  const [isPullingModel, setIsPullingModel] = useState(false)
  const [pullProgress, setPullProgress] = useState('')

  useEffect(() => {
    checkOllamaStatus()
    loadIntelligenceModelSetting()
  }, [])

  const loadIntelligenceModelSetting = (): void => {
    // Load from user profile or local storage
    const saved = localStorage.getItem('intelligence_fleet_model')
    if (saved) {
      setIntelligenceModel(saved)
    }
  }

  const saveIntelligenceModel = (modelName: string): void => {
    setIntelligenceModel(modelName)
    localStorage.setItem('intelligence_fleet_model', modelName)

    // Notify main process to update Intelligence Fleet config
    // TODO: Add IPC call to update Intelligence Fleet
    console.log('🧠 Intelligence Fleet model updated:', modelName)
  }

  const handlePullModel = async (modelName: string): Promise<void> => {
    if (!isAvailable || !modelName) return

    setIsPullingModel(true)
    setPullProgress('Starting...')

    try {
      // Open terminal with ollama pull command
      const command = `ollama pull ${modelName}`

      // For now, just open system terminal with command
      // User needs to run it manually
      alert(
        `To download the model, open your terminal (PowerShell/CMD) and run:\n\n${command}\n\nAfter download completes, click "Refresh" button.`
      )

      // Alternative: Copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(command)
        console.log('Command copied to clipboard')
      }
    } catch (error) {
      console.error('Failed to initiate model pull:', error)
      alert('Failed to setup model download. Please run: ollama pull ' + modelName)
    } finally {
      setIsPullingModel(false)
      setPullProgress('')
    }
  }

  const checkOllamaStatus = async (): Promise<void> => {
    setIsChecking(true)
    const available = await ollamaService.isAvailable()
    setIsAvailable(available)

    if (available) {
      const modelList = await ollamaService.listModels()
      setModels(modelList)
      if (modelList.length > 0) {
        setSelectedModel(modelList[0].name)
      }
    }
    setIsChecking(false)
  }

  const handleDownloadOllama = (): void => {
    window.open('https://ollama.ai/download', '_blank')
  }

  const openModelLibrary = (): void => {
    window.open('https://ollama.ai/library', '_blank')
  }

  const formatSize = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  return (
    <div className="ollama-settings">
      <h3>
        <i className="fas fa-server"></i> Local MCP Server (Ollama)
      </h3>

      {/* Status */}
      <div className="ollama-status">
        <div className="status-indicator">
          <div className={`status-dot ${isAvailable ? 'online' : 'offline'}`}></div>
          <span className="status-text">
            {isChecking
              ? 'Kontrol ediliyor...'
              : isAvailable
                ? 'Çevrimiçi (localhost:11434)'
                : 'Çevrimdışı'}
          </span>
        </div>
        <button onClick={checkOllamaStatus} className="refresh-btn" disabled={isChecking}>
          <i className={`fas fa-sync ${isChecking ? 'fa-spin' : ''}`}></i>
          Yenile
        </button>
      </div>

      {/* Kurulum Gerekliyse */}
      {!isAvailable && !isChecking && (
        <div className="ollama-install">
          <div className="install-info">
            <i className="fas fa-info-circle"></i>
            <div>
              <h4>Ollama Kurulu Değil</h4>
              <p>Local MCP Server kullanmak için Ollama kurulumu gereklidir.</p>
            </div>
          </div>

          <div className="install-steps">
            <h5>Kurulum Adımları:</h5>
            <ol>
              <li>
                <strong>Ollama İndir:</strong>
                <button onClick={handleDownloadOllama} className="download-btn">
                  <i className="fas fa-download"></i>
                  ollama.ai/download
                </button>
              </li>
              <li>
                <strong>Kurulumu Tamamla:</strong> İndirdiğiniz dosyayı çalıştırın
              </li>
              <li>
                <strong>Terminal Aç:</strong> PowerShell veya CMD açın
              </li>
              <li>
                <strong>Ollama Başlat:</strong>
                <code>ollama serve</code>
              </li>
              <li>
                <strong>Model İndir:</strong>
                <code>ollama pull llama2</code>
              </li>
            </ol>
          </div>

          <div className="install-note">
            <i className="fas fa-lightbulb"></i>
            <span>
              Kurulum sonrası bu sayfadaki &quot;Yenile&quot; butonuna tıklayarak bağlantıyı kontrol
              edin.
            </span>
          </div>
        </div>
      )}

      {/* Modeller */}
      {isAvailable && (
        <div className="ollama-models">
          <div className="models-header">
            <h4>
              <i className="fas fa-brain"></i> Yüklü Modeller ({models.length})
            </h4>
            <button onClick={openModelLibrary} className="library-btn">
              <i className="fas fa-plus-circle"></i>
              Model Kütüphanesi
            </button>
          </div>

          {models.length === 0 ? (
            <div className="no-models">
              <i className="fas fa-box-open"></i>
              <p>Henüz model yüklenmemiş</p>
              <div className="model-suggestions">
                <h5>Önerilen Modeller:</h5>
                <code>ollama pull llama2</code>
                <code>ollama pull mistral</code>
                <code>ollama pull codellama</code>
              </div>
            </div>
          ) : (
            <div className="models-list">
              {models.map((model) => (
                <div
                  key={model.name}
                  className={`model-card ${selectedModel === model.name ? 'selected' : ''}`}
                  onClick={() => setSelectedModel(model.name)}
                >
                  <div className="model-info">
                    <i className="fas fa-cube"></i>
                    <div>
                      <div className="model-name">{model.name}</div>
                      <div className="model-size">{formatSize(model.size)}</div>
                    </div>
                  </div>
                  {selectedModel === model.name && (
                    <div className="model-badge">
                      <i className="fas fa-check"></i>
                      Aktif
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Intelligence Fleet Model Selection */}
      {isAvailable && (
        <div className="intelligence-fleet-section">
          <h4>
            <i className="fas fa-brain"></i> Intelligence Fleet - Pattern Learning
          </h4>
          <p className="section-description">
            Intelligence Fleet observes Claude and OpenAI, learning from their tool usage patterns.
            Configure a model to enable AI-powered pattern extraction.
          </p>

          {/* Model Selection */}
          <div className="model-selection">
            <label htmlFor="intelligence-model">
              <i className="fas fa-robot"></i> Learning Model:
            </label>
            <select
              id="intelligence-model"
              value={intelligenceModel}
              onChange={(e) => saveIntelligenceModel(e.target.value)}
              className="model-select"
            >
              <option value="">None (Basic pattern extraction only)</option>
              <optgroup label="Recommended for Learning">
                <option value="qwen2.5-coder:1.5b">
                  qwen2.5-coder:1.5b (1 GB - Fast, 4GB RAM)
                </option>
                <option value="qwen2.5-coder:7b">qwen2.5-coder:7b (5 GB - Smart, 8GB RAM)</option>
              </optgroup>
              <optgroup label="Alternative Models">
                <option value="deepseek-coder:1.3b">deepseek-coder:1.3b (0.8 GB - Fastest)</option>
                <option value="codellama:7b">codellama:7b (4 GB - Code specialist)</option>
              </optgroup>
              {models.length > 0 && (
                <optgroup label="Your Installed Models">
                  {models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name} ({formatSize(model.size)})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Model Status */}
          {intelligenceModel && (
            <div className="intelligence-status">
              {models.some((m) => m.name === intelligenceModel) ? (
                <div className="status-ready">
                  <i className="fas fa-check-circle"></i>
                  Model ready! Intelligence Fleet is active.
                </div>
              ) : (
                <div className="status-not-installed">
                  <i className="fas fa-exclamation-triangle"></i>
                  Model &quot;{intelligenceModel}&quot; not installed
                  <button
                    onClick={() => handlePullModel(intelligenceModel)}
                    disabled={isPullingModel}
                    className="pull-model-btn"
                  >
                    {isPullingModel ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Downloading... {pullProgress}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download"></i>
                        Download Model
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="intelligence-info">
            <i className="fas fa-info-circle"></i>
            <div>
              <strong>How it works:</strong>
              <ul>
                <li>Observes both Claude and OpenAI tool executions</li>
                <li>Extracts patterns: which tools, in what order, success rates</li>
                <li>Learns differences between teachers (methodical vs efficient)</li>
                <li>
                  <strong>Privacy:</strong> All processing happens locally, no data leaves your PC
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Kullanım Bilgisi */}
      <div className="usage-info">
        <h5>
          <i className="fas fa-question-circle"></i> Nasıl Kullanılır?
        </h5>
        <ul>
          <li>Chat panelinden &quot;Local MCP&quot; seçeneğini aktif edin</li>
          <li>Sorularınızı gönderin - tamamen lokal olarak işlenir</li>
          <li>API key gerekmez, internet bağlantısı gerekmez</li>
          <li>Verileriniz cihazınızda kalır</li>
        </ul>
      </div>
    </div>
  )
}
