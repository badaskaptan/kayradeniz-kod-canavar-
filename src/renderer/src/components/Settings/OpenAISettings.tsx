import React, { useState, useEffect } from 'react'
import { openaiService } from '../../services/openaiService'
import './OpenAISettings.css'

export function OpenAISettings(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo')
  const [isSaving, setIsSaving] = useState(false)

  const availableModels = [
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Hızlı ve ekonomik - Geliştirme için ideal',
      price: '$0.0005 / 1K tokens (~0.5¢)',
      icon: '💰'
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'En ucuz GPT-4 modeli - Dengeili performans',
      price: '$0.00015 / 1K tokens (~0.15¢)',
      icon: '🔥'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'En güçlü model - Production için önerilir',
      price: '$0.005 / 1K tokens (~5¢)',
      icon: '⚡'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'Gelişmiş yetenekler - Karmaşık görevler',
      price: '$0.01 / 1K tokens (~10¢)',
      icon: '🚀'
    }
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    setIsChecking(true)

    // Load API key from localStorage
    const savedKey = localStorage.getItem('openai-api-key')
    if (savedKey) {
      setApiKey(savedKey)
    }

    // Load selected model
    const savedModel = localStorage.getItem('openai-selected-model')
    if (savedModel) {
      setSelectedModel(savedModel)
    }

    // Check if OpenAI is available
    if (savedKey) {
      const available = await openaiService.isAvailable()
      setIsAvailable(available)
    }

    setIsChecking(false)
  }

  const handleSaveSettings = async (): Promise<void> => {
    if (!apiKey.trim()) {
      alert('Lütfen API key giriniz')
      return
    }

    if (!apiKey.startsWith('sk-')) {
      alert('Geçersiz API key formatı. OpenAI API keyleri "sk-" ile başlamalıdır.')
      return
    }

    setIsSaving(true)

    try {
      // Save to localStorage
      localStorage.setItem('openai-api-key', apiKey)
      localStorage.setItem('openai-selected-model', selectedModel)

      // Test connection
      const available = await openaiService.isAvailable()
      setIsAvailable(available)

      if (available) {
        alert(
          `✅ OpenAI ayarları kaydedildi!\n\n` +
            `Model: ${availableModels.find((m) => m.id === selectedModel)?.name}\n` +
            `API key doğrulandı ve kullanıma hazır.`
        )
      } else {
        alert(
          '⚠️ API key kaydedildi ancak doğrulanamadı.\n\n' +
            "Lütfen key'inizi kontrol edin:\n" +
            '1. https://platform.openai.com/api-keys\n' +
            '2. Key aktif mi?\n' +
            '3. Kredi var mı?'
        )
      }
    } catch (error) {
      console.error('OpenAI settings save error:', error)
      alert('Ayarlar kaydedilirken hata oluştu.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearSettings = (): void => {
    if (confirm('OpenAI ayarlarını silmek istediğinizden emin misiniz?')) {
      localStorage.removeItem('openai-api-key')
      localStorage.removeItem('openai-selected-model')
      setApiKey('')
      setSelectedModel('gpt-3.5-turbo')
      setIsAvailable(false)
      alert('OpenAI ayarları silindi')
    }
  }

  return (
    <div className="openai-settings">
      <h3>
        <i className="fas fa-brain"></i> OpenAI API Settings
      </h3>

      {/* Status Badge */}
      <div className={`status-badge ${isAvailable ? 'online' : 'offline'}`}>
        <i className={`fas ${isAvailable ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
        <span>{isChecking ? 'Kontrol ediliyor...' : isAvailable ? 'Bağlı' : 'Bağlı Değil'}</span>
      </div>

      {/* API Key Input */}
      <div className="setting-group">
        <label>
          <i className="fas fa-key"></i> API Key
        </label>
        <div className="input-with-icon">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-proj-xxxxxxxxxxxxxxxx"
            className="api-key-input"
          />
          <button
            className="toggle-visibility-btn"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? 'Gizle' : 'Göster'}
          >
            <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
          </button>
        </div>
        <p className="setting-hint">
          API key almak için:{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
            platform.openai.com/api-keys
          </a>
        </p>
      </div>

      {/* Model Selection */}
      <div className="setting-group">
        <label>
          <i className="fas fa-brain"></i> Model Seçimi
        </label>
        <div className="model-grid">
          {availableModels.map((model) => (
            <button
              key={model.id}
              className={`model-card ${selectedModel === model.id ? 'selected' : ''}`}
              onClick={() => setSelectedModel(model.id)}
            >
              <div className="model-icon">{model.icon}</div>
              <div className="model-info">
                <h4>{model.name}</h4>
                <p className="model-description">{model.description}</p>
                <p className="model-price">{model.price}</p>
              </div>
              {selectedModel === model.id && <i className="fas fa-check-circle model-check"></i>}
            </button>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>
          <i className="fas fa-info-circle"></i> Önemli Bilgiler
        </h4>
        <ul>
          <li>
            <strong>Tool Calling:</strong> Tüm modeller 17 adet tool'u destekler (file operations,
            terminal, git, vb.)
          </li>
          <li>
            <strong>Night Orders:</strong> Pattern learning sistemi GPT ile mükemmel çalışır
          </li>
          <li>
            <strong>Elysion Chamber:</strong> Kod analizi ve öğrenme sistemi aktif
          </li>
          <li>
            <strong>Maliyet:</strong> Sadece kullandığınız kadar ödeme yaparsınız (pay-as-you-go)
          </li>
        </ul>
      </div>

      {/* Pricing Comparison */}
      <div className="pricing-comparison">
        <h4>
          <i className="fas fa-dollar-sign"></i> Tahmini Maliyet (1000 mesaj)
        </h4>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Ortalama</th>
              <th>Toplam</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>GPT-3.5 Turbo</td>
              <td>~500 tokens</td>
              <td>$0.25 💰</td>
            </tr>
            <tr>
              <td>GPT-4o Mini</td>
              <td>~500 tokens</td>
              <td>$0.08 🔥</td>
            </tr>
            <tr>
              <td>GPT-4o</td>
              <td>~500 tokens</td>
              <td>$2.50 ⚡</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="settings-actions">
        {apiKey && (
          <button onClick={handleClearSettings} className="btn-danger">
            <i className="fas fa-trash"></i>
            Ayarları Sil
          </button>
        )}
        <div className="spacer"></div>
        <button onClick={loadSettings} className="btn-secondary" disabled={isChecking}>
          <i className="fas fa-sync-alt"></i>
          Yenile
        </button>
        <button
          onClick={handleSaveSettings}
          className="btn-primary"
          disabled={!apiKey.trim() || isSaving}
        >
          {isSaving ? 'Kaydediliyor...' : 'Kaydet ve Test Et'}
        </button>
      </div>
    </div>
  )
}
