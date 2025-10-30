import { useState, useEffect } from 'react'
import {
  BookOpen,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  GraduationCap
} from 'lucide-react'
import './UstaModuPanel.css'

interface TeachingMoment {
  id: string
  timestamp: Date
  concept: string
  explanation: string
  why: string
  how: string
  alternatives: string[]
  bestPractices: string[]
  pitfalls: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  confidence: number
}

export function UstaModuPanel(): React.JSX.Element {
  const [teachingMoments, setTeachingMoments] = useState<TeachingMoment[]>([])
  const [activeLesson, setActiveLesson] = useState<TeachingMoment | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLiveMode, setIsLiveMode] = useState(true) // Real-time tracking

  const toggleLiveMode = (): void => {
    setIsLiveMode(!isLiveMode)
  }

  // Listen to Claude's tool usage events
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.ipcRenderer) {
      return
    }

    const ipc = window.electron.ipcRenderer

    // Listen for Claude tool usage
    const handleToolUsed = (
      _event: unknown,
      data: { tool: string; args: unknown; result: unknown }
    ): void => {
      if (!isLiveMode) return

      console.log('[UstaModu] 🎓 Claude used tool:', data.tool)

      // Generate teaching moment from tool usage
      const lesson = generateTeachingMoment(data.tool)

      setTeachingMoments((prev) => [lesson, ...prev].slice(0, 10)) // Keep last 10
      setActiveLesson(lesson)
    }

    // Listen for streaming chunks to track progress
    const handleStreamingChunk = (_event: unknown, data: { chunk: string }): void => {
      if (!isLiveMode) return

      // Update active lesson with real-time context
      console.log('[UstaModu] 📝 Claude thinking:', data.chunk.substring(0, 50))
    }

    ipc.on('claude:toolUsed', handleToolUsed)
    ipc.on('claude:streamingChunk', handleStreamingChunk)

    return () => {
      ipc.removeAllListeners('claude:toolUsed')
      ipc.removeAllListeners('claude:streamingChunk')
    }
  }, [isLiveMode])

  // Generate teaching moment from Claude's action
  const generateTeachingMoment = (tool: string): TeachingMoment => {
    // Map tool names to educational content
    const toolLessons: Record<string, Partial<TeachingMoment>> = {
      read_file: {
        concept: 'Dosya Okuma İşlemi',
        explanation: 'Claude bir dosyayı okuyarak içeriğini analiz ediyor.',
        why: 'Kod yazmadan önce mevcut durumu anlamak kritik. Dosya içeriğini görmeden değişiklik yapmak hatalara yol açar.',
        how: 'Node.js fs modülü ile dosya sistemi erişimi yapılıyor. Asenkron okuma ile performans korunuyor.',
        alternatives: [
          'Tüm projeyi tarama yerine sadece ilgili dosyayı oku',
          'Git diff ile sadece değişen kısımları incele',
          'AST (Abstract Syntax Tree) parser kullan'
        ],
        bestPractices: [
          '✅ Dosya boyutunu kontrol et (çok büyükse parça parça oku)',
          '✅ Encoding belirt (utf-8, ascii, etc.)',
          '✅ Error handling yap (dosya yoksa ne olacak?)',
          '✅ Path traversal saldırılarına karşı validate et'
        ],
        pitfalls: [
          '❌ Binary dosyaları text olarak okumaya çalışma',
          "❌ Büyük dosyaları memory'ye yükleme (stream kullan)",
          '❌ Absolute path yerine relative path kullan',
          '❌ Dosya kilidi (lock) kontrolü yapmadan yaz'
        ]
      },
      write_file: {
        concept: 'Dosyaya Yazma İşlemi',
        explanation: 'Claude yeni kod/içerik oluşturuyor veya mevcut dosyayı güncelliyor.',
        why: 'Manuel kod yazmak yerine otomatik değişiklik yaparak hız kazanıyorsun.',
        how: 'fs.writeFile ile atomic write yapılıyor. Önce geçici dosyaya yaz, sonra rename et.',
        alternatives: [
          'Patch/diff oluştur, sonra uygula',
          'Version control (git) ile geri alınabilir yap',
          'Backup oluştur, sonra değiştir'
        ],
        bestPractices: [
          '✅ Değişiklik yapmadan önce backup al',
          '✅ Atomic write kullan (corruption önler)',
          '✅ Dosya izinlerini koru (chmod)',
          '✅ Syntax validation yap (yazılan kod geçerli mi?)'
        ],
        pitfalls: [
          '❌ Dosyanın tamamını silip yeniden yazma (race condition)',
          '❌ Encoding mismatch (UTF-8 vs Latin1)',
          '❌ Line ending farklılıkları (CRLF vs LF)',
          '❌ Disk dolu hatası kontrol etmeme'
        ]
      },
      run_terminal_command: {
        concept: 'Terminal Komutu Çalıştırma',
        explanation: 'Claude terminal komutları çalıştırarak build, test, git işlemleri yapıyor.',
        why: 'Manuel terminal kullanımı yerine otomatik workflow. Hata mesajlarını okuyup düzeltme yapabiliyor.',
        how: 'child_process.spawn ile shell komutları çalıştırılıyor. stdout/stderr ayrı yakalanıyor.',
        alternatives: [
          'Docker container içinde izole et',
          'Make/npm scripts ile standartlaştır',
          'CI/CD pipeline kullan (GitHub Actions)'
        ],
        bestPractices: [
          '✅ Command injection saldırılarına dikkat et',
          '✅ Timeout ayarla (sonsuz döngü önle)',
          '✅ Working directory doğru ayarla',
          '✅ Environment variables güvenli yönet'
        ],
        pitfalls: [
          "❌ User input'u direkt komuta ekleme (güvenlik riski)",
          "❌ Şifre/API key'i command line'da gösterme",
          '❌ rm -rf gibi tehlikeli komutları kontrol etmeme',
          '❌ Exit code kontrol etmeme (hata gizlenir)'
        ]
      },
      str_replace_editor: {
        concept: 'String Değiştirme (Find & Replace)',
        explanation: 'Claude dosya içinde belirli bir kod parçasını buluyor ve değiştiriyor.',
        why: 'Küçük değişiklikler için tüm dosyayı yeniden yazmak verimsiz. Sadece gerekli kısmı değiştir.',
        how: 'Regex veya exact string match ile hedef bulunuyor, sonra replace ediliyor.',
        alternatives: [
          'AST-based refactoring (code structure anlayarak)',
          'Git patch apply (diff formatında)',
          'Language Server Protocol (LSP) rename'
        ],
        bestPractices: [
          '✅ Değiştirmeden önce match sayısını kontrol et',
          '✅ Case-sensitive/insensitive seçimini doğru yap',
          '✅ Regex özel karakterlerini escape et',
          '✅ Multi-line replacement dikkatli kullan'
        ],
        pitfalls: [
          '❌ Birden fazla yerde yanlış eşleşme (greedy regex)',
          '❌ Whitespace farklılıklarını göz ardı etme',
          '❌ String literal vs code ayrımı yapmama',
          '❌ Replace sonrası syntax bozulması kontrolsüz bırakma'
        ]
      }
    }

    const lessonTemplate = toolLessons[tool] || {
      concept: `${tool} İşlemi`,
      explanation: `Claude "${tool}" aracını kullanıyor.`,
      why: 'Bu işlem projedeki değişiklik için gerekli.',
      how: 'Tool Bridge üzerinden IPC ile çalışıyor.',
      alternatives: [],
      bestPractices: [],
      pitfalls: []
    }

    return {
      id: `lesson-${Date.now()}`,
      timestamp: new Date(),
      concept: lessonTemplate.concept || '',
      explanation: lessonTemplate.explanation || '',
      why: lessonTemplate.why || '',
      how: lessonTemplate.how || '',
      alternatives: lessonTemplate.alternatives || [],
      bestPractices: lessonTemplate.bestPractices || [],
      pitfalls: lessonTemplate.pitfalls || [],
      difficulty: 'intermediate',
      confidence: 0.85
    }
  }

  // Mock data for demonstration (will be replaced by real events)
  useEffect(() => {
    const mockLesson: TeachingMoment = {
      id: 'lesson-1',
      timestamp: new Date(),
      concept: 'React Component Lifecycle',
      explanation: 'React bileşenleri, oluşturulma, güncelleme ve yok edilme aşamalarından geçer.',
      why: 'Bu lifecycle yöntemleri, bileşenin farklı aşamalarında özel işlemler yapmanı sağlar.',
      how: "useEffect hook'u ile lifecycle olaylarını yönetebilirsin. Dependency array ile hangi değişikliklerde tetikleneceğini kontrol edersin.",
      alternatives: [
        'Class components ile lifecycle methods (componentDidMount, etc.)',
        'Custom hooks ile lifecycle mantığını paylaşma',
        "React 18'in yeni concurrent features"
      ],
      bestPractices: [
        "useEffect'te cleanup function kullan (memory leak önler)",
        "Dependency array'i doğru tanımla",
        "Gereksiz re-render'ları önle",
        "Side effect'leri useEffect içinde tut"
      ],
      pitfalls: [
        "❌ Dependency array'i unutmak (infinite loop)",
        '❌ Cleanup function yazmamak (memory leak)',
        '❌ useEffect içinde async/await direkt kullanmak',
        '❌ State güncellemelerini yanlış yerde yapmak'
      ],
      difficulty: 'intermediate',
      confidence: 0.92
    }

    setTeachingMoments([mockLesson])
    setActiveLesson(mockLesson)
  }, [])

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner':
        return 'Başlangıç'
      case 'intermediate':
        return 'Orta'
      case 'advanced':
        return 'İleri'
      default:
        return 'Bilinmiyor'
    }
  }

  return (
    <div className="usta-modu-panel">
      <div className="usta-header">
        <div className="usta-title" onClick={() => setIsExpanded(!isExpanded)}>
          <GraduationCap size={20} />
          <h3>📚 Usta Modu - Öğretmen Paneli</h3>
        </div>
        <div className="usta-controls">
          <button
            className="live-mode-toggle"
            onClick={toggleLiveMode}
            title={isLiveMode ? 'Canlı Takip Açık' : 'Canlı Takip Kapalı'}
          >
            <span className={`live-indicator ${isLiveMode ? 'active' : ''}`}>
              {isLiveMode ? '🟢' : '⚫'}
            </span>
            <span className="live-text">{isLiveMode ? 'Canlı' : 'Kapalı'}</span>
          </button>
          <button
            className="usta-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Aç/Kapat"
          >
            <ChevronRight size={20} className={isExpanded ? 'rotated' : ''} />
          </button>
        </div>
      </div>

      {isExpanded && activeLesson && (
        <div className="usta-content">
          {/* Lesson Header */}
          <div className="lesson-header">
            <div className="lesson-title">
              <BookOpen size={18} />
              <h4>{activeLesson.concept}</h4>
            </div>
            <div className="lesson-meta">
              <span className={`difficulty-badge difficulty-${activeLesson.difficulty}`}>
                {getDifficultyLabel(activeLesson.difficulty)}
              </span>
              <span className="confidence-badge">
                Güven: {Math.round(activeLesson.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Main Explanation */}
          <div className="lesson-section">
            <div className="section-header">
              <BookOpen size={16} />
              <h5>📖 Ne Olduğu</h5>
            </div>
            <p className="section-content">{activeLesson.explanation}</p>
          </div>

          {/* Why (Neden) */}
          <div className="lesson-section">
            <div className="section-header">
              <Lightbulb size={16} />
              <h5>💡 Neden Böyle Yapılır?</h5>
            </div>
            <p className="section-content">{activeLesson.why}</p>
          </div>

          {/* How (Nasıl) */}
          <div className="lesson-section">
            <div className="section-header">
              <CheckCircle size={16} />
              <h5>⚙️ Nasıl Çalışır?</h5>
            </div>
            <p className="section-content">{activeLesson.how}</p>
          </div>

          {/* Alternatives */}
          {activeLesson.alternatives.length > 0 && (
            <div className="lesson-section">
              <div className="section-header">
                <ChevronRight size={16} />
                <h5>🔀 Alternatif Yöntemler</h5>
              </div>
              <ul className="alternatives-list">
                {activeLesson.alternatives.map((alt, index) => (
                  <li key={index}>{alt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Best Practices */}
          {activeLesson.bestPractices.length > 0 && (
            <div className="lesson-section best-practices">
              <div className="section-header">
                <CheckCircle size={16} />
                <h5>✅ En İyi Uygulamalar</h5>
              </div>
              <ul className="practices-list">
                {activeLesson.bestPractices.map((practice, index) => (
                  <li key={index}>{practice}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Pitfalls */}
          {activeLesson.pitfalls.length > 0 && (
            <div className="lesson-section pitfalls">
              <div className="section-header">
                <AlertTriangle size={16} />
                <h5>⚠️ Kaçınılması Gerekenler</h5>
              </div>
              <ul className="pitfalls-list">
                {activeLesson.pitfalls.map((pitfall, index) => (
                  <li key={index}>{pitfall}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation */}
          {teachingMoments.length > 1 && (
            <div className="lesson-navigation">
              <button className="nav-button">← Önceki Ders</button>
              <span className="lesson-count">1 / {teachingMoments.length}</span>
              <button className="nav-button">Sonraki Ders →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
