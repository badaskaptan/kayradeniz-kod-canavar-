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

  // Mock data for demonstration
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '#4ade80'
      case 'intermediate':
        return '#fbbf24'
      case 'advanced':
        return '#f87171'
      default:
        return '#94a3b8'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
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
      <div className="usta-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="usta-title">
          <GraduationCap size={20} />
          <h3>📚 Usta Modu - Öğretmen Paneli</h3>
        </div>
        <button className="usta-toggle">
          <ChevronRight
            size={20}
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
        </button>
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
              <span
                className="difficulty-badge"
                style={{ backgroundColor: getDifficultyColor(activeLesson.difficulty) }}
              >
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
