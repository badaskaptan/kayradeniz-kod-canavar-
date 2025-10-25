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

  useEffect(() => {
    checkOllamaStatus()
  }, [])

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
              Kurulum sonrası bu sayfadaki "Yenile" butonuna tıklayarak bağlantıyı kontrol edin.
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

      {/* Kullanım Bilgisi */}
      <div className="usage-info">
        <h5>
          <i className="fas fa-question-circle"></i> Nasıl Kullanılır?
        </h5>
        <ul>
          <li>Chat panelinden "Local MCP" seçeneğini aktif edin</li>
          <li>Sorularınızı gönderin - tamamen lokal olarak işlenir</li>
          <li>API key gerekmez, internet bağlantısı gerekmez</li>
          <li>Verileriniz cihazınızda kalır</li>
        </ul>
      </div>
    </div>
  )
}
