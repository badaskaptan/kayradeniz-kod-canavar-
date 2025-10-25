// Settings Panel - API Key ve Ollama Yönetimi
import React, { useState, useEffect } from 'react'
import { OllamaSettings } from '../renderer/src/components/Settings/OllamaSettings'
import { ProfileManager } from '../renderer/src/components/Settings/ProfileManager'
import type { UserProfile } from '../types/user-profile'
import './ApiKeyManager.css'

interface ApiKeyManagerProps {
  onSave: (apiKey: string) => void
  onCancel: () => void
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onSave, onCancel }) => {
  const [apiKey, setApiKey] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [activeTab, setActiveTab] = useState<'claude' | 'ollama' | 'profile'>('claude')

  // Default profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'default',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      name: 'Kullanıcı',
      ageGroup: 'adult',
      preferredLanguage: 'tr'
    },
    ai: {
      name: 'LUMA',
      personality: 'friendly',
      communicationStyle: {
        formality: 'casual',
        enthusiasm: 'high',
        verbosity: 'balanced',
        technicalDepth: 'moderate'
      },
      useMetaphors: true,
      emojiUsage: 'moderate'
    },
    theme: {
      current: 'dragon'
    },
    teaching: {
      mode: 'balanced',
      detailLevel: 'intermediate',
      showAlternatives: true,
      explainWhy: true
    }
  })

  useEffect(() => {
    // Mevcut API key'i yükle
    window.claudeAPI?.getApiKey().then((key) => {
      if (key) {
        setApiKey(key)
        setIsValid(true)
      }
    })

    // Kayıtlı profili yükle (localStorage + Claude Service)
    const loadProfile = async () => {
      try {
        const savedProfile = localStorage.getItem('userProfile')
        if (savedProfile) {
          const profile = JSON.parse(savedProfile)
          setUserProfile(profile)
          // Temayı uygula
          document.documentElement.setAttribute('data-theme', profile.theme.current)
          // 🎭 Claude Service'e de gönder (IPC)
          await window.claudeAPI?.setUserProfile(profile)
          console.log('✅ Profile loaded and sent to Claude Service')
        }
      } catch (error) {
        console.error('Profil yüklenirken hata:', error)
      }
    }
    
    loadProfile()
  }, [])

  const validateAndSave = async (): Promise<void> => {
    if (!apiKey.trim()) {
      alert('Lütfen API key giriniz')
      return
    }

    if (!apiKey.startsWith('sk-ant-')) {
      alert('Geçersiz API key formatı. Anthropic API keyleri "sk-ant-" ile başlamalıdır.')
      return
    }

    setIsValidating(true)

    try {
      // API key'i test et
      const result = await window.claudeAPI?.validateApiKey(apiKey)

      if (result?.valid) {
        setIsValid(true)
        await window.claudeAPI?.saveApiKey(apiKey)
        setTimeout(() => onSave(apiKey), 500)
      } else {
        setIsValid(false)
        alert('API key doğrulanamadı. Lütfen geçerli bir key giriniz.')
      }
    } catch (error) {
      console.error('API key doğrulama hatası:', error)
      setIsValid(false)
      alert('API key doğrulanırken hata oluştu.')
    } finally {
      setIsValidating(false)
    }
  }

  const clearApiKey = async (): Promise<void> => {
    if (confirm('API key&apos;i silmek istediğinizden emin misiniz?')) {
      await window.claudeAPI?.clearApiKey()
      setApiKey('')
      setIsValid(null)
    }
  }

  return (
    <div className="api-key-overlay">
      <div className="api-key-modal settings-panel">
        {/* Header with Tabs */}
        <div className="settings-header">
          <h2>Ayarlar</h2>
          <button type="button" className="close-btn" onClick={onCancel} aria-label="Kapat">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'claude' ? 'active' : ''}`}
            onClick={() => setActiveTab('claude')}
          >
            <i className="fas fa-key"></i>
            Claude API
          </button>
          <button
            className={`tab-btn ${activeTab === 'ollama' ? 'active' : ''}`}
            onClick={() => setActiveTab('ollama')}
          >
            <i className="fas fa-server"></i>
            Ollama (Local LLM)
          </button>
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-user-circle"></i>
            Profil Ayarları
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {activeTab === 'claude' && (
            <div className="claude-settings">
              {/* API Key Input */}
              <div className="setting-group">
                <label>API Key</label>
                <div className="input-with-icon">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-xxxxxxxxxxxxxxxx"
                    className={`api-key-input ${isValid === false ? 'invalid' : isValid === true ? 'valid' : ''}`}
                    onKeyPress={(e) => e.key === 'Enter' && validateAndSave()}
                  />
                  <button
                    className="toggle-visibility-btn"
                    onClick={() => setShowKey(!showKey)}
                    title={showKey ? 'Gizle' : 'Göster'}
                  >
                    <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>

                {/* Validation Status */}
                {isValid === true && (
                  <div className="validation-message success">
                    <i className="fas fa-check-circle"></i>
                    <span>API key doğrulandı ve kaydedildi</span>
                  </div>
                )}
                {isValid === false && (
                  <div className="validation-message error">
                    <i className="fas fa-exclamation-circle"></i>
                    <span>Geçersiz API key</span>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="info-box">
                <h4>
                  <i className="fas fa-info-circle"></i> API key nasıl alınır?
                </h4>
                <ol>
                  <li>
                    <a
                      href="https://console.anthropic.com/account/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      console.anthropic.com
                    </a>{' '}
                    adresine gidin
                  </li>
                  <li>&quot;Create Key&quot; butonuna tıklayın</li>
                  <li>Key&apos;i kopyalayıp buraya yapıştırın</li>
                </ol>
                <p className="security-note">
                  <i className="fas fa-lock"></i>
                  <strong>Güvenlik:</strong> API key&apos;iniz şifreli olarak bilgisayarınızda
                  saklanır.
                </p>
              </div>

              {/* Actions */}
              <div className="settings-actions">
                {isValid && (
                  <button onClick={clearApiKey} className="btn-danger">
                    <i className="fas fa-trash"></i>
                    Key&apos;i Sil
                  </button>
                )}
                <div className="spacer"></div>
                <button onClick={onCancel} disabled={isValidating} className="btn-secondary">
                  İptal
                </button>
                <button
                  onClick={validateAndSave}
                  disabled={isValidating || !apiKey.trim()}
                  className="btn-primary"
                >
                  {isValidating ? 'Doğrulanıyor...' : isValid ? 'Güncelle' : 'Kaydet ve Doğrula'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ollama' && <OllamaSettings />}

          {activeTab === 'profile' && (
            <div className="profile-settings-wrapper">
              <ProfileManager
                profile={userProfile}
                onProfileUpdate={async (newProfile) => {
                  setUserProfile(newProfile)
                  // Apply theme
                  document.documentElement.setAttribute('data-theme', newProfile.theme.current)
                  // Save to localStorage (for persistence)
                  localStorage.setItem('userProfile', JSON.stringify(newProfile))
                  // 🎭 SEND TO CLAUDE SERVICE via IPC (for AI behavior)
                  await window.claudeAPI?.setUserProfile(newProfile)
                  // Show success message
                  alert('Profil ayarları kaydedildi! ✅\nYapay zeka artık sizi tanıyor.')
                }}
                onClose={() => {
                  // Don't close, just switch back to Claude tab or keep profile open
                  // User can use Settings close button
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
