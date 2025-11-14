// ============================================
// LUMA User Profile & Personality System
// ============================================

/**
 * Kullanıcı Profili - Liman Ayarları
 */
export interface UserProfile {
  id: string
  createdAt: Date
  updatedAt: Date

  // Kullanıcı Bilgileri
  user: {
    name: string // "Emrah", "Ayşe", "Mehmet"
    nickname?: string // "kanka", "aşko", "dostum"
    ageGroup: AgeGroup
    preferredLanguage: 'tr' | 'en'
  }

  // AI Kişiliği
  ai: {
    name: string // "LUMA", "Dragon", "Ayşe", "Kaptan" vs
    personality: PersonalityType
    communicationStyle: CommunicationStyle
    useMetaphors: boolean // Metafor kullanımı
    emojiUsage: EmojiUsage
  }

  // Tema Tercihleri
  theme: {
    current: ThemeName
    customColors?: CustomThemeColors
    backgroundImage?: BackgroundImage
  }

  // Öğretmen Modu Ayarları
  teaching: {
    mode: TeachingMode
    detailLevel: 'basic' | 'intermediate' | 'advanced'
    showAlternatives: boolean
    explainWhy: boolean
  }
}

/**
 * Yaş Grupları - Her yaş grubuna özel hitap tarzı
 */
export type AgeGroup =
  | 'teen' // 13-17: kanka, aşko, moruk gibi hitaplar
  | 'young-adult' // 18-25: dostum, arkadaşım, bro
  | 'adult' // 26-40: isim veya siz
  | 'senior' // 40+: efendim, saygıdeğer

/**
 * Kişilik Tipleri
 */
export type PersonalityType =
  | 'friendly' // Arkadaş canlısı (dostça, samimi)
  | 'professional' // Profesyonel (resmi, iş odaklı)
  | 'mentor' // Öğretmen/Usta (bilge, öğretici)
  | 'cute' // Sevimli (emoji bol, şirin)
  | 'humorous' // Espirili (şakacı, eğlenceli)
  | 'motivational' // Motive edici (enerji dolu, coşkulu)
  | 'calm' // Sakin (huzurlu, rahatlatıcı)
  | 'technical' // Teknik (jargon ağır, detaylı)

/**
 * İletişim Tarzı
 */
export interface CommunicationStyle {
  formality: 'very-casual' | 'casual' | 'neutral' | 'formal' | 'very-formal'
  enthusiasm: 'low' | 'medium' | 'high' | 'very-high'
  verbosity: 'concise' | 'balanced' | 'detailed' | 'very-detailed'
  technicalDepth: 'simple' | 'moderate' | 'technical' | 'expert'
}

/**
 * Emoji Kullanımı
 */
export type EmojiUsage = 'none' | 'minimal' | 'moderate' | 'heavy'

/**
 * Arka Plan Resmi Seçenekleri
 */
export type BackgroundImage = 'none' | 'dragon' | 'columbina'

/**
 * Tema İsimleri
 */
export type ThemeName =
  | 'dragon' // Turuncu Ateş Ejderhası (mevcut)
  | 'ocean' // Okyanus Mavisi
  | 'sunset' // Gün Batımı Pembe/Mor
  | 'forest' // Orman Yeşili
  | 'midnight' // Gece Mavisi
  | 'amber' // Kehribar Sarı/Turuncu
  | 'cyber' // Siber Neon Yeşil
  | 'lavender' // Lavanta Mor
  | 'rose' // Gül Kırmızısı
  | 'emerald' // Zümrüt Yeşili
  | 'custom' // Özel renk

/**
 * Özel Tema Renkleri
 */
export interface CustomThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
}

/**
 * Öğretmen Modu
 */
export type TeachingMode =
  | 'off' // Kapalı (sadece kod, açıklama yok)
  | 'minimal' // Minimal (sadece önemli noktalarda)
  | 'balanced' // Dengeli (orta seviye açıklama)
  | 'detailed' // Detaylı (her şeyi açıkla)
  | 'professor' // Profesör (akademik, çok detaylı)

/**
 * Yaş Grubuna Göre Hitap Şekilleri
 */
export const GREETINGS_BY_AGE: Record<AgeGroup, string[]> = {
  teen: ['kanka', 'moruk', 'aşko', 'reis', 'abi/abla'],
  'young-adult': ['dostum', 'arkadaşım', 'bro', 'kardeşim'],
  adult: ['[isim]', 'dostum', 'arkadaşım'],
  senior: ['efendim', 'saygıdeğer [isim]', 'sayın [isim]']
}

/**
 * Kişiliğe Göre Yanıt Örnekleri
 */
export const PERSONALITY_RESPONSES: Record<PersonalityType, string> = {
  friendly: 'Hey dostum! Şunu yapalım: ...',
  professional: 'Merhaba. İhtiyacınız olan: ...',
  mentor: 'Çok güzel soru! Önce şunu anlayalım: ...',
  cute: 'Heyy! 🌟 Çok güzel bi fikir bu! ✨',
  humorous: 'Haha, bakalım bu kodu da mı bozarız? 😄',
  motivational: 'Harika! Sen yaparsın! 🚀 Hadi başlayalım!',
  calm: 'Sakin ol, adım adım hallederiz... 🧘',
  technical: 'Algoritma: O(n log n) complexity ile...'
}

/**
 * Küfür ve Uygunsuz İçerik Filtresi
 */
export const BLOCKED_WORDS = [
  // Türkçe küfürler (partial matching için)
  'amk',
  'aq',
  'mk',
  'oç',
  's.k'
  // Argo/Küfür kombinasyonları buraya eklenebilir
  // NOT: Tam liste deployment öncesi genişletilmeli
]

/**
 * AI İsim Validasyonu
 */
export function validateAIName(name: string): {
  isValid: boolean
  reason?: string
} {
  const trimmed = name.trim()

  // Boş kontrol
  if (!trimmed) {
    return { isValid: false, reason: 'İsim boş olamaz' }
  }

  // Uzunluk kontrolü
  if (trimmed.length < 2) {
    return { isValid: false, reason: 'İsim en az 2 karakter olmalı' }
  }

  if (trimmed.length > 20) {
    return { isValid: false, reason: 'İsim en fazla 20 karakter olabilir' }
  }

  // Küfür kontrolü
  const lowerName = trimmed.toLowerCase()
  for (const blocked of BLOCKED_WORDS) {
    if (lowerName.includes(blocked)) {
      return { isValid: false, reason: 'Lütfen uygun bir isim seçin' }
    }
  }

  return { isValid: true }
}

/**
 * Varsayılan Profil
 */
export const DEFAULT_PROFILE: UserProfile = {
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
      enthusiasm: 'medium',
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
}
