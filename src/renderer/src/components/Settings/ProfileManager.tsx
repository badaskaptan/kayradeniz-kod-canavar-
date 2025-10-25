import React, { useState, useEffect } from 'react'
import type {
  UserProfile,
  PersonalityType,
  ThemeName,
  TeachingMode,
  AgeGroup,
  EmojiUsage
} from '../../../../types/user-profile'
import { validateAIName } from '../../../../types/user-profile'
import './ProfileManager.css'

interface ProfileManagerProps {
  profile: UserProfile
  onProfileUpdate: (profile: UserProfile) => void
  onClose: () => void
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profile,
  onProfileUpdate,
  onClose
}) => {
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile)
  const [aiNameError, setAiNameError] = useState<string>('')

  // Profile prop değiştiğinde editedProfile'ı güncelle
  useEffect(() => {
    setEditedProfile(profile)
  }, [profile])

  const handleAINameChange = (name: string): void => {
    const validation = validateAIName(name)

    if (!validation.isValid) {
      setAiNameError(validation.reason || '')
    } else {
      setAiNameError('')
    }

    setEditedProfile({
      ...editedProfile,
      ai: { ...editedProfile.ai, name }
    })
  }

  const handleSave = (): void => {
    if (aiNameError) {
      return
    }
    onProfileUpdate(editedProfile)
    // Modal'ı kapatma - Settings içinde zaten açık kalmalı
  }

  const personalities: { type: PersonalityType; label: string; emoji: string }[] = [
    { type: 'friendly', label: 'Arkadaş Canlısı', emoji: '😊' },
    { type: 'professional', label: 'Profesyonel', emoji: '💼' },
    { type: 'mentor', label: 'Öğretmen/Usta', emoji: '🎓' },
    { type: 'cute', label: 'Sevimli', emoji: '🥰' },
    { type: 'humorous', label: 'Espirili', emoji: '😄' },
    { type: 'motivational', label: 'Motive Edici', emoji: '🚀' },
    { type: 'calm', label: 'Sakin', emoji: '🧘' },
    { type: 'technical', label: 'Teknik', emoji: '🤖' }
  ]

  const themes: { name: ThemeName; label: string; preview: string }[] = [
    { name: 'dragon', label: 'Ejderha', preview: '🔥' },
    { name: 'ocean', label: 'Okyanus', preview: '🌊' },
    { name: 'sunset', label: 'Gün Batımı', preview: '🌅' },
    { name: 'forest', label: 'Orman', preview: '🌲' },
    { name: 'midnight', label: 'Gece', preview: '🌙' },
    { name: 'amber', label: 'Kehribar', preview: '🟡' },
    { name: 'cyber', label: 'Siber', preview: '💚' },
    { name: 'lavender', label: 'Lavanta', preview: '💜' },
    { name: 'rose', label: 'Gül', preview: '🌹' },
    { name: 'emerald', label: 'Zümrüt', preview: '💎' }
  ]

  const ageGroups: { age: AgeGroup; label: string; example: string }[] = [
    { age: 'teen', label: 'Genç (13-17)', example: 'kanka, aşko, moruk' },
    { age: 'young-adult', label: 'Yetişkin (18-25)', example: 'dostum, bro' },
    { age: 'adult', label: 'Orta Yaş (26-40)', example: 'isim, dostum' },
    { age: 'senior', label: 'Kıdemli (40+)', example: 'efendim, sayın' }
  ]

  return (
    <div className="profile-manager-overlay">
      <div className="profile-manager-modal">
        <div className="profile-header">
          <h2>🏙️ Liman Ayarları</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="profile-content">
          {/* Kullanıcı Bilgileri */}
          <section className="profile-section">
            <h3>👤 Kullanıcı Bilgileri</h3>

            <div className="form-group">
              <label>Adınız</label>
              <input
                type="text"
                value={editedProfile.user.name}
                onChange={(e) =>
                  setEditedProfile({
                    ...editedProfile,
                    user: { ...editedProfile.user, name: e.target.value }
                  })
                }
                placeholder="Emrah, Ayşe, Mehmet..."
              />
            </div>

            <div className="form-group">
              <label>Lakap (Opsiyonel)</label>
              <input
                type="text"
                value={editedProfile.user.nickname || ''}
                onChange={(e) =>
                  setEditedProfile({
                    ...editedProfile,
                    user: { ...editedProfile.user, nickname: e.target.value }
                  })
                }
                placeholder="kanka, aşko, dostum..."
              />
            </div>

            <div className="form-group">
              <label>Yaş Grubu</label>
              <div className="age-group-grid">
                {ageGroups.map((ag) => (
                  <button
                    key={ag.age}
                    className={`age-btn ${editedProfile.user.ageGroup === ag.age ? 'active' : ''}`}
                    onClick={() =>
                      setEditedProfile({
                        ...editedProfile,
                        user: { ...editedProfile.user, ageGroup: ag.age }
                      })
                    }
                  >
                    <div className="age-label">{ag.label}</div>
                    <div className="age-example">{ag.example}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* AI Kişiliği */}
          <section className="profile-section">
            <h3>🤖 AI Kişiliği</h3>

            <div className="form-group">
              <label>AI Adı</label>
              <input
                type="text"
                value={editedProfile.ai.name}
                onChange={(e) => handleAINameChange(e.target.value)}
                placeholder="LUMA, Dragon, Kaptan..."
                className={aiNameError ? 'error' : ''}
              />
              {aiNameError && <span className="error-message">{aiNameError}</span>}
            </div>

            <div className="form-group">
              <label>Kişilik Tipi</label>
              <div className="personality-grid">
                {personalities.map((p) => (
                  <button
                    key={p.type}
                    className={`personality-btn ${editedProfile.ai.personality === p.type ? 'active' : ''}`}
                    onClick={() =>
                      setEditedProfile({
                        ...editedProfile,
                        ai: { ...editedProfile.ai, personality: p.type }
                      })
                    }
                  >
                    <span className="personality-emoji">{p.emoji}</span>
                    <span className="personality-label">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editedProfile.ai.useMetaphors}
                  onChange={(e) =>
                    setEditedProfile({
                      ...editedProfile,
                      ai: { ...editedProfile.ai, useMetaphors: e.target.checked }
                    })
                  }
                />
                <span>Metafor kullan (Gemi, kaptan, liman gibi benzetmeler)</span>
              </label>
            </div>

            <div className="form-group">
              <label>Emoji Kullanımı</label>
              <div className="emoji-usage-btns">
                {(['none', 'minimal', 'moderate', 'heavy'] as EmojiUsage[]).map((usage) => (
                  <button
                    key={usage}
                    className={`emoji-btn ${editedProfile.ai.emojiUsage === usage ? 'active' : ''}`}
                    onClick={() =>
                      setEditedProfile({
                        ...editedProfile,
                        ai: { ...editedProfile.ai, emojiUsage: usage }
                      })
                    }
                  >
                    {usage === 'none' && 'Yok'}
                    {usage === 'minimal' && 'Az 😊'}
                    {usage === 'moderate' && 'Orta 😊✨'}
                    {usage === 'heavy' && 'Çok 😊✨🚀💡'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Tema Seçimi */}
          <section className="profile-section">
            <h3>🎨 Liman Teması</h3>
            <div className="theme-grid">
              {themes.map((t) => (
                <button
                  key={t.name}
                  className={`theme-btn ${editedProfile.theme.current === t.name ? 'active' : ''}`}
                  data-theme={t.name}
                  onClick={() =>
                    setEditedProfile({
                      ...editedProfile,
                      theme: { ...editedProfile.theme, current: t.name }
                    })
                  }
                >
                  <span className="theme-preview">{t.preview}</span>
                  <span className="theme-label">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Öğretmen Modu */}
          <section className="profile-section">
            <h3>📚 Usta Modu Ayarları</h3>

            <div className="form-group">
              <label>Öğretme Seviyesi</label>
              <div className="teaching-mode-btns">
                {(['off', 'minimal', 'balanced', 'detailed', 'professor'] as TeachingMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      className={`teaching-btn ${editedProfile.teaching.mode === mode ? 'active' : ''}`}
                      onClick={() =>
                        setEditedProfile({
                          ...editedProfile,
                          teaching: { ...editedProfile.teaching, mode }
                        })
                      }
                    >
                      {mode === 'off' && 'Kapalı'}
                      {mode === 'minimal' && 'Minimal'}
                      {mode === 'balanced' && 'Dengeli'}
                      {mode === 'detailed' && 'Detaylı'}
                      {mode === 'professor' && 'Profesör'}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editedProfile.teaching.showAlternatives}
                  onChange={(e) =>
                    setEditedProfile({
                      ...editedProfile,
                      teaching: { ...editedProfile.teaching, showAlternatives: e.target.checked }
                    })
                  }
                />
                <span>Alternatif yaklaşımları göster</span>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editedProfile.teaching.explainWhy}
                  onChange={(e) =>
                    setEditedProfile({
                      ...editedProfile,
                      teaching: { ...editedProfile.teaching, explainWhy: e.target.checked }
                    })
                  }
                />
                <span>&quot;Neden böyle?&quot; sorusunu açıkla</span>
              </label>
            </div>
          </section>
        </div>

        <div className="profile-footer">
          <button className="btn-secondary" onClick={onClose}>
            İptal
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
