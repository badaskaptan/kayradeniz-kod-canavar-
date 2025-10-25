import type { Task, TaskResult, TeachingMoment } from '../types'

/**
 * Narrator Agent - Usta Modu (AI Teacher)
 *
 * Görevler:
 * 1. Real-time kod anlatımı (Türkçe)
 * 2. Teaching moments oluştur
 * 3. Step-by-step explanation
 * 4. Best practice önerileri
 * 5. Hata açıklaması ve öğretimi
 */

export interface NarrationMessage {
  id: string
  timestamp: Date
  type: 'before' | 'after' | 'verify' | 'teach' | 'error' | 'tip'
  content: string
  step?: Task
  result?: TaskResult
  teachingMoment?: TeachingMoment
}

export interface ExplanationContext {
  goal: string
  rationale: string
  learningPoints?: string[]
  relatedConcepts?: string[]
  bestPractices?: string[]
}

export class NarratorAgent {
  private narrations: NarrationMessage[] = []
  private teachingMoments: TeachingMoment[] = []

  /**
   * Adım başlamadan önce anlatım yap
   */
  narrateBefore(step: Task): NarrationMessage {
    const explanation = this.extractExplanation(step)

    const content = this.buildBeforeNarration(step, explanation)

    const narration: NarrationMessage = {
      id: `narration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'before',
      content,
      step
    }

    this.narrations.push(narration)
    return narration
  }

  /**
   * Adım tamamlandıktan sonra anlatım yap
   */
  narrateAfter(step: Task, result: TaskResult): NarrationMessage {
    const content = this.buildAfterNarration(step, result)

    const narration: NarrationMessage = {
      id: `narration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'after',
      content,
      step,
      result
    }

    this.narrations.push(narration)

    // Başarılı adımda teaching moment oluştur
    if (result.success) {
      const teachingMoment = this.createTeachingMoment(step)
      if (teachingMoment) {
        this.teachingMoments.push(teachingMoment)
      }
    }

    return narration
  }

  /**
   * Doğrulama sonucu anlatımı
   */
  narrateVerify(verifyResult: { success: boolean; message?: string }): NarrationMessage {
    const content = verifyResult.success
      ? `✅ **Doğrulama başarılı!** ${verifyResult.message || 'Kod temiz ve çalışır durumda.'}`
      : `⚠️ **Doğrulama sorunları tespit edildi:** ${verifyResult.message || 'Lütfen kontrol edin.'}`

    const narration: NarrationMessage = {
      id: `narration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'verify',
      content
    }

    this.narrations.push(narration)
    return narration
  }

  /**
   * Hata açıklaması yap
   */
  explainError(error: string): NarrationMessage {
    const explanation = this.analyzeError(error)

    const content =
      `❌ **Hata Oluştu**\n\n` +
      `**Hata:** ${error}\n\n` +
      `**Sebep:** ${explanation.reason}\n\n` +
      `**Çözüm:** ${explanation.solution}\n\n` +
      `**Öğrenme:** ${explanation.learning}`

    const narration: NarrationMessage = {
      id: `narration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'error',
      content
    }

    this.narrations.push(narration)
    return narration
  }

  /**
   * Best practice önerisi
   */
  suggestBestPractice(topic: string, suggestion: string): NarrationMessage {
    const content =
      `💡 **Best Practice**\n\n` + `**Konu:** ${topic}\n\n` + `**Öneri:** ${suggestion}`

    const narration: NarrationMessage = {
      id: `narration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'tip',
      content
    }

    this.narrations.push(narration)
    return narration
  }

  /**
   * Teaching moment oluştur
   */
  private createTeachingMoment(step: Task): TeachingMoment | null {
    // Metadata'dan konsept çıkar
    const metadata = step.metadata as { operation?: string; command?: string } | undefined
    const operation = metadata?.operation || metadata?.command

    if (!operation) return null

    // Öğretici konseptler
    const concepts = this.extractConcepts(step)

    if (concepts.length === 0) return null

    return {
      id: `teaching-${Date.now()}`,
      timestamp: new Date(),
      concept: concepts[0],
      explanation: this.explainConcept(concepts[0]),
      example: this.getConceptExample(concepts[0]),
      relatedConcepts: concepts.slice(1),
      difficulty: this.assessDifficulty(concepts[0])
    }
  }

  /**
   * Adım açıklamasını çıkar
   */
  private extractExplanation(step: Task): ExplanationContext {
    const metadata = step.metadata as
      | {
          explain?: { goal?: string; rationale?: string }
          operation?: string
          command?: string
        }
      | undefined

    return {
      goal: metadata?.explain?.goal || step.description,
      rationale: metadata?.explain?.rationale || 'Bu adım projenin ilerlemesi için gerekli.',
      learningPoints: [],
      relatedConcepts: [],
      bestPractices: []
    }
  }

  /**
   * "Önce" anlatımı oluştur
   */
  private buildBeforeNarration(step: Task, explanation: ExplanationContext): string {
    let narration = `📝 **Adım ${step.id}**\n\n`
    narration += `**Ne yapıyoruz:** ${explanation.goal}\n\n`

    if (explanation.rationale) {
      narration += `**Neden:** ${explanation.rationale}\n\n`
    }

    return narration
  }

  /**
   * "Sonra" anlatımı oluştur
   */
  private buildAfterNarration(step: Task, result: TaskResult): string {
    if (result.success) {
      return `✅ **Tamamlandı!** ${step.description}\n\n` + `⏱️ Süre: ${result.executionTime}ms`
    } else {
      return (
        `❌ **Başarısız!** ${step.description}\n\n` +
        `**Hata:** ${result.error || 'Bilinmeyen hata'}`
      )
    }
  }

  /**
   * Hata analizi yap
   */
  private analyzeError(error: string): { reason: string; solution: string; learning: string } {
    // Yaygın hata pattern'leri
    if (error.includes('ENOENT') || error.includes('not found')) {
      return {
        reason: 'Dosya veya klasör bulunamadı.',
        solution: 'Dosya yolunu kontrol edin. Dosya gerçekten var mı?',
        learning: 'Her zaman dosya varlığını kontrol edin (fs.exists kullanın).'
      }
    }

    if (error.includes('EACCES') || error.includes('permission denied')) {
      return {
        reason: 'Dosya/klasör erişim izni yok.',
        solution: 'Dosya izinlerini kontrol edin veya yönetici olarak çalıştırın.',
        learning: 'File permissions önemlidir, özellikle production ortamlarında.'
      }
    }

    if (error.includes('EEXIST') || error.includes('already exists')) {
      return {
        reason: 'Dosya veya klasör zaten mevcut.',
        solution: 'Mevcut dosyayı silin veya farklı bir isim kullanın.',
        learning: 'Dosya oluşturmadan önce varlık kontrolü yapın.'
      }
    }

    if (error.includes('npm') || error.includes('package')) {
      return {
        reason: 'NPM package yönetimi hatası.',
        solution: 'npm install komutunu çalıştırın veya package.json kontrol edin.',
        learning: 'Bağımlılıkların doğru yüklendiğinden emin olun.'
      }
    }

    // Genel hata
    return {
      reason: 'Beklenmeyen bir hata oluştu.',
      solution: 'Hata detaylarını inceleyin ve gerekirse stack trace kontrol edin.',
      learning: 'Her zaman try-catch kullanın ve hataları logla.'
    }
  }

  /**
   * Konseptleri çıkar
   */
  private extractConcepts(task: Task): string[] {
    const concepts: string[] = []

    // Task type bazlı konseptler
    if (task.type === 'execution') {
      concepts.push('File I/O Operations')
    }
    if (task.type === 'generation' && task.description.includes('component')) {
      concepts.push('React Components')
    }
    if (task.description.toLowerCase().includes('typescript')) {
      concepts.push('TypeScript')
    }

    return concepts
  }

  /**
   * Konsept açıklaması
   */
  private explainConcept(concept: string): string {
    const explanations: Record<string, string> = {
      'File I/O':
        'Dosya Giriş/Çıkış işlemleri - Bilgisayarın dosya sistemine veri yazma ve okuma işlemleri.',
      'Asynchronous Operations':
        'Asenkron işlemler - Programın diğer işlemleri beklemeden devam edebilmesi.',
      'Package Management': 'Paket yönetimi - Projenin bağımlılıklarını (kütüphanelerini) yönetme.',
      Dependencies: 'Bağımlılıklar - Projenin çalışması için gerekli olan harici kütüphaneler.',
      'React Components':
        'React bileşenleri - Kullanıcı arayüzünün yeniden kullanılabilir parçaları.',
      TypeScript: "TypeScript - JavaScript'e tip güvenliği ekleyen bir programlama dili.",
      'Version Control': 'Versiyon kontrolü - Kod değişikliklerini takip etme ve yönetme.'
    }

    return explanations[concept] || `${concept} - Modern yazılım geliştirmede önemli bir konsept.`
  }

  /**
   * Konsept örneği
   */
  private getConceptExample(concept: string): string {
    const examples: Record<string, string> = {
      'File I/O': `await fs.writeFile('data.json', JSON.stringify(data))`,
      'Asynchronous Operations': `const result = await someAsyncFunction()`,
      'Package Management': `npm install react typescript`,
      'React Components': `function MyComponent() { return <div>Hello</div> }`,
      TypeScript: `interface User { name: string; age: number }`
    }

    return examples[concept] || `// ${concept} örneği`
  }

  /**
   * Zorluk seviyesi değerlendir
   */
  private assessDifficulty(concept: string): 'beginner' | 'intermediate' | 'advanced' {
    const beginner = ['File I/O', 'Package Management', 'Dependencies']
    const advanced = ['Asynchronous Operations', 'TypeScript', 'Version Control']

    if (beginner.includes(concept)) return 'beginner'
    if (advanced.includes(concept)) return 'intermediate'
    return 'intermediate'
  }

  /**
   * Tüm anlatımları getir
   */
  getNarrations(): NarrationMessage[] {
    return this.narrations
  }

  /**
   * Teaching moment'leri getir
   */
  getTeachingMoments(): TeachingMoment[] {
    return this.teachingMoments
  }

  /**
   * Anlatımları temizle
   */
  clearNarrations(): void {
    this.narrations = []
  }

  /**
   * Son N anlatımı getir
   */
  getRecentNarrations(count: number = 10): NarrationMessage[] {
    return this.narrations.slice(-count)
  }
}
