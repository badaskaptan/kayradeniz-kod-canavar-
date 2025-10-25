import type { Agent, Task, TaskResult, AIConfig } from '../types'

/**
 * Router Agent - LUMA Supreme Agent
 *
 * Görevler:
 * 1. Intent Detection - Kullanıcı niyetini analiz et
 * 2. Agent Selection - En uygun agent'ı seç
 * 3. Priority Calculation - İşlem önceliği belirle
 * 4. Task Distribution - Agent'lara görev dağıt
 */

export type IntentType = 'command' | 'idea' | 'reflection' | 'exploration' | 'help'

export interface Intent {
  type: IntentType
  confidence: number // 0-1
  entities: Record<string, string[]>
  actions: string[]
}

export interface AgentSelection {
  agentType: Agent['type']
  reason: string
  priority: number // 0-10
}

export class RouterAgent {
  constructor(aiConfig: AIConfig) {
    // AI config stored for future LLM integration
    console.log('[RouterAgent] Initialized with config:', aiConfig.provider, aiConfig.model)
  }

  updateConfig(aiConfig: AIConfig): void {
    // Update AI configuration for future LLM calls
    console.log('[RouterAgent] Config updated:', aiConfig.provider, aiConfig.model)
  }

  /**
   * Kullanıcı girdisinden intent'i tespit et
   */
  async detectIntent(userInput: string): Promise<Intent> {
    // Intent detection patterns
    const commandPatterns = [
      /^(çalıştır|run|execute|start|başlat)/i,
      /^(oku|read|open|aç)\s+dosya/i,
      /^(yaz|write|save|kaydet)\s+dosya/i,
      /^(sil|delete|remove|kaldır)\s+dosya/i,
      /^(test|kontrol|check)\s+/i,
      // File creation patterns
      /(oluştur|create|yap|yaz|ekle)\s+(dosya|file|proje|klasör|folder)/i,
      /(dosya|file)\s+(oluştur|create|yap|yaz)/i,
      /(kök ağacına|workspace|projede)\s+(yaz|ekle|oluştur)/i,
      // Code generation with file creation intent
      /yap.*?(python|javascript|typescript|html|css|json)/i,
      /(verdiğin|bu)\s+(kodu?|projeyi?)\s+(oluştur|yaz|kaydet)/i
    ]

    const ideaPatterns = [
      /(yap|create|build|kur|ekle|oluştur)\s+(proje|project|app|site|uygulama|kod|code|fonksiyon|function|class|component)/i,
      /(python|javascript|typescript|react|node)\s+(ile|with|için|for)/i,
      /(api|backend|frontend|database|server)/i,
      /(web|mobile|desktop)\s+(app|uygulama)/i
    ]

    const reflectionPatterns = [
      /(hata|error|bug|sorun|problem|düzelt|fix|çöz)/i,
      /(analiz|analyze|incele|kontrol et)/i,
      /(performans|optimization|iyileştir)/i,
      /(refactor|yeniden yaz)/i
    ]

    const explorationPatterns = [
      /^(göster|show|listele|list|bul|find)/i,
      /^(nedir|what|ne|which|hangi)/i,
      /^(nasıl|how|ne şekilde)/i,
      /(dokümantasyon|docs|rehber|guide)/i
    ]

    const helpPatterns = [
      /^(yardım|help|komutlar|commands)/i,
      /^(kullanım|usage|örnek|example)/i,
      /^(özellikleri|features|neler yapabilir)/i
    ]

    // Confidence calculation
    let commandScore = 0
    let ideaScore = 0
    let reflectionScore = 0
    let explorationScore = 0
    let helpScore = 0

    // Check patterns
    commandPatterns.forEach((pattern) => {
      if (pattern.test(userInput)) commandScore += 0.3
    })

    ideaPatterns.forEach((pattern) => {
      if (pattern.test(userInput)) ideaScore += 0.3
    })

    reflectionPatterns.forEach((pattern) => {
      if (pattern.test(userInput)) reflectionScore += 0.3
    })

    explorationPatterns.forEach((pattern) => {
      if (pattern.test(userInput)) explorationScore += 0.3
    })

    helpPatterns.forEach((pattern) => {
      if (pattern.test(userInput)) helpScore += 0.3
    })

    // DEFAULT: Eğer hiçbir pattern match etmezse, generation task olarak işaretle
    // Basit sorular, sohbet, genel istekler -> AI ile cevap üret
    const maxScore = Math.max(commandScore, ideaScore, reflectionScore, explorationScore, helpScore)

    // Eğer hiçbir pattern güçlü değilse, generation'a yönlendir
    if (maxScore < 0.3) {
      ideaScore = 0.5
    }

    // En yüksek score'u bul
    const scores = {
      command: Math.min(commandScore, 1),
      idea: Math.min(ideaScore, 1),
      reflection: Math.min(reflectionScore, 1),
      exploration: Math.min(explorationScore, 1),
      help: Math.min(helpScore, 1)
    }

    const finalMaxScore = Math.max(...Object.values(scores))
    const intentType = (Object.keys(scores).find(
      (key) => scores[key as IntentType] === finalMaxScore
    ) || 'idea') as IntentType // Default to 'idea' for generation

    // Entity extraction (basit)
    const words = userInput.toLowerCase().split(/\s+/)
    const entities: Record<string, string[]> = {
      files: words.filter((w) => w.endsWith('.js') || w.endsWith('.ts') || w.endsWith('.tsx')),
      commands: words.filter((w) => ['npm', 'git', 'node', 'python'].includes(w)),
      technologies: words.filter((w) =>
        ['react', 'node', 'express', 'typescript', 'tailwind'].includes(w)
      )
    }

    // Action extraction
    const actions: string[] = []
    if (/oku|read|open/i.test(userInput)) actions.push('read')
    if (/yaz|write|create/i.test(userInput)) actions.push('write')
    if (/çalıştır|run|execute/i.test(userInput)) actions.push('execute')
    if (/sil|delete|remove/i.test(userInput)) actions.push('delete')
    if (/test|kontrol/i.test(userInput)) actions.push('test')

    console.log(
      '[RouterAgent] Intent detected:',
      intentType,
      'confidence:',
      finalMaxScore.toFixed(2)
    )

    return {
      type: intentType,
      confidence: finalMaxScore,
      entities,
      actions
    }
  }

  /**
   * Intent'e göre en uygun agent'ı seç
   */
  selectAgent(intent: Intent): AgentSelection {
    const selections: Record<IntentType, AgentSelection> = {
      command: {
        agentType: 'executor',
        reason: 'Direct command execution required',
        priority: 8
      },
      idea: {
        agentType: 'generator',
        reason: 'New feature or project generation needed',
        priority: 6
      },
      reflection: {
        agentType: 'analyzer',
        reason: 'Error analysis or problem solving required',
        priority: 9
      },
      exploration: {
        agentType: 'router',
        reason: 'Information gathering and exploration',
        priority: 5
      },
      help: {
        agentType: 'router',
        reason: 'Help and guidance needed',
        priority: 7
      }
    }

    return selections[intent.type]
  }

  /**
   * Task oluştur ve dağıt
   */
  async distributeTask(
    userInput: string,
    conversationId: string
  ): Promise<{ task: Task; agentSelection: AgentSelection }> {
    // Intent tespit et
    const intent = await this.detectIntent(userInput)

    // Agent seç
    const agentSelection = this.selectAgent(intent)

    // Task title oluştur (kısa özet)
    const taskTitle = userInput.length > 50 ? userInput.substring(0, 47) + '...' : userInput

    // Task oluştur
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.mapIntentToTaskType(intent.type),
      title: taskTitle,
      description: userInput,
      status: 'pending',
      priority: agentSelection.priority,
      assignedAgent: agentSelection.agentType,
      createdAt: new Date(),
      metadata: {
        intent: intent.type,
        confidence: intent.confidence,
        entities: intent.entities,
        actions: intent.actions,
        conversationId,
        // Generation task için AI request metadata
        generationRequest:
          intent.type === 'idea'
            ? {
                prompt: userInput,
                language: 'typescript',
                includeComments: true,
                includeTypes: true
              }
            : undefined
      }
    }

    console.log(
      '[RouterAgent] Created task:',
      task.type,
      task.title,
      'confidence:',
      intent.confidence
    )

    return { task, agentSelection }
  }

  /**
   * Intent'i TaskType'a map et
   */
  private mapIntentToTaskType(intent: IntentType): Task['type'] {
    const mapping: Record<IntentType, Task['type']> = {
      command: 'execution',
      idea: 'generation',
      reflection: 'analysis',
      exploration: 'analysis',
      help: 'analysis'
    }

    return mapping[intent]
  }

  /**
   * Task sonucunu işle ve raporla
   */
  async processTaskResult(task: Task, result: TaskResult): Promise<string> {
    if (result.success) {
      return this.formatSuccessResponse(task, result)
    } else {
      return this.formatErrorResponse(task, result)
    }
  }

  /**
   * Başarılı sonuç formatla
   */
  private formatSuccessResponse(task: Task, result: TaskResult): string {
    let response = `✅ **Görev tamamlandı!**\n\n`
    response += `📋 **Görev:** ${task.description}\n`
    response += `🤖 **Agent:** ${task.assignedAgent}\n`
    response += `⏱️ **Süre:** ${result.executionTime}ms\n\n`

    if (result.output) {
      response += `📤 **Sonuç:**\n\`\`\`\n${result.output}\n\`\`\`\n`
    }

    const filesAffected = result.metadata?.filesAffected
    if (Array.isArray(filesAffected)) {
      response += `\n📁 **Etkilenen dosyalar:** ${filesAffected.join(', ')}\n`
    }

    return response
  }

  /**
   * Hata sonucu formatla
   */
  private formatErrorResponse(task: Task, result: TaskResult): string {
    let response = `❌ **Görev başarısız!**\n\n`
    response += `📋 **Görev:** ${task.description}\n`
    response += `🤖 **Agent:** ${task.assignedAgent}\n`
    response += `⏱️ **Süre:** ${result.executionTime}ms\n\n`

    if (result.error) {
      response += `🔥 **Hata:**\n\`\`\`\n${result.error}\n\`\`\`\n\n`
    }

    response += `💡 **Öneri:** Lütfen komutu kontrol edin ve tekrar deneyin.\n`

    return response
  }

  /**
   * Çoklu task orchestration
   */
  async orchestrateTasks(tasks: Task[]): Promise<TaskResult[]> {
    const results: TaskResult[] = []

    // Priority'ye göre sırala
    const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority)

    // Sequential execution (şimdilik)
    for (const task of sortedTasks) {
      // TODO: Her agent için execution implementasyonu
      const result: TaskResult = {
        success: true,
        executionTime: 0,
        output: `Task ${task.id} executed (placeholder)`
      }

      results.push(result)
    }

    return results
  }
}
