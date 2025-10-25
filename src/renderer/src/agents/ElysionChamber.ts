import type { Task } from '../types'

/**
 * ==================== ELYSION CHAMBER ====================
 * Güvenlik ve onay sistemi - Kritik işlemlerin geçit noktası
 *
 * İlham: Xenosaga'nın Elysion - Gerçeklik ve rüya arasındaki eşik
 * LUMA'da: Otomasyon ve kullanıcı kontrolü arasındaki denge
 *
 * Görevler:
 * 1. Kritik işlemler için kullanıcı onayı al
 * 2. İşlem geçmişini tut
 * 3. Risk seviyesi değerlendirmesi
 * 4. Auto-approve kuralları
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ApprovalRequest {
  id: string
  timestamp: Date
  task: Task
  riskLevel: RiskLevel
  reason: string
  affectedFiles?: string[]
  estimatedImpact?: string
  autoApprovable: boolean
}

export interface ApprovalResponse {
  requestId: string
  approved: boolean
  userComment?: string
  timestamp: Date
}

export interface ElysionConfig {
  autoApproveLevel: RiskLevel // Bu seviye ve altı otomatik onaylanır
  requireCommentOnReject: boolean
  keepHistory: boolean
  maxHistorySize: number
}

export class ElysionChamber {
  private config: ElysionConfig = {
    autoApproveLevel: 'LOW',
    requireCommentOnReject: true,
    keepHistory: true,
    maxHistorySize: 100
  }

  private pendingRequests: Map<string, ApprovalRequest> = new Map()
  private approvalHistory: ApprovalResponse[] = []
  private autoApproveRules: Map<string, (task: Task) => boolean> = new Map()

  constructor(config?: Partial<ElysionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    this.initializeDefaultRules()
  }

  /**
   * İşlem için onay iste
   */
  async requestApproval(task: Task): Promise<ApprovalResponse> {
    const request = this.createApprovalRequest(task)

    // Auto-approve check
    if (this.canAutoApprove(request)) {
      return this.autoApprove(request)
    }

    // Pending'e ekle
    this.pendingRequests.set(request.id, request)

    // UI'dan kullanıcı yanıtı bekle
    // Bu async bekleme mekanizması Event-driven olarak çalışacak
    const response = await this.waitForUserResponse(request)

    // History'e ekle
    if (this.config.keepHistory) {
      this.addToHistory(response)
    }

    return response
  }

  /**
   * Onay isteği oluştur
   */
  private createApprovalRequest(task: Task): ApprovalRequest {
    const riskLevel = this.assessRisk(task)
    const affectedFiles = this.extractAffectedFiles(task)

    return {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      task,
      riskLevel,
      reason: this.generateReason(task, riskLevel),
      affectedFiles,
      estimatedImpact: this.estimateImpact(task),
      autoApprovable: this.isAutoApprovable(task, riskLevel)
    }
  }

  /**
   * Risk değerlendirmesi
   */
  private assessRisk(task: Task): RiskLevel {
    // File operations
    if (task.type === 'execution') {
      const metadata = task.metadata as { operation?: string; files?: string[] } | undefined

      if (metadata?.operation === 'delete') return 'HIGH'
      if (metadata?.operation === 'update' && metadata.files && metadata.files.length > 5)
        return 'MEDIUM'
      if (metadata?.operation === 'create') return 'LOW'
    }

    // Code generation
    if (task.type === 'generation') {
      const metadata = task.metadata as { overwrite?: boolean } | undefined
      if (metadata?.overwrite) return 'MEDIUM'
      return 'LOW'
    }

    // Analysis (safe)
    if (task.type === 'analysis') return 'LOW'

    return 'MEDIUM' // Default
  }

  /**
   * Etkilenen dosyaları çıkar
   */
  private extractAffectedFiles(task: Task): string[] {
    const metadata = task.metadata as { files?: string[]; file?: string } | undefined
    const files: string[] = []

    if (metadata?.files) files.push(...metadata.files)
    if (metadata?.file) files.push(metadata.file)

    return files
  }

  /**
   * Onay nedeni oluştur
   */
  private generateReason(task: Task, riskLevel: RiskLevel): string {
    const reasons: Record<RiskLevel, string> = {
      LOW: `✅ Düşük riskli işlem: ${task.description}`,
      MEDIUM: `⚠️ Orta riskli işlem: ${task.description}`,
      HIGH: `🔴 Yüksek riskli işlem: ${task.description}`,
      CRITICAL: `🚨 KRİTİK işlem: ${task.description}`
    }

    return reasons[riskLevel]
  }

  /**
   * Etki tahmini
   */
  private estimateImpact(task: Task): string {
    const metadata = task.metadata as { files?: string[]; operation?: string } | undefined

    if (metadata?.operation === 'delete' && metadata.files) {
      return `${metadata.files.length} dosya silinecek`
    }

    if (task.type === 'generation') {
      return 'Yeni kod üretilecek'
    }

    if (task.type === 'execution') {
      return 'Dosya sistemi işlemi yapılacak'
    }

    return 'Kod analizi yapılacak'
  }

  /**
   * Auto-approve kontrolü
   */
  private canAutoApprove(request: ApprovalRequest): boolean {
    if (!request.autoApprovable) return false

    const riskOrder: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
    return riskOrder[request.riskLevel] <= riskOrder[this.config.autoApproveLevel]
  }

  /**
   * Auto-approve kararı ver
   */
  private isAutoApprovable(task: Task, riskLevel: RiskLevel): boolean {
    // Custom rules check
    for (const [, rule] of this.autoApproveRules) {
      if (!rule(task)) return false
    }

    // Risk-based check
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') return false

    return true
  }

  /**
   * Otomatik onayla
   */
  private autoApprove(request: ApprovalRequest): ApprovalResponse {
    const response: ApprovalResponse = {
      requestId: request.id,
      approved: true,
      userComment: 'Auto-approved based on risk level',
      timestamp: new Date()
    }

    if (this.config.keepHistory) {
      this.addToHistory(response)
    }

    return response
  }

  /**
   * Kullanıcı yanıtı bekle (event-driven)
   */
  private async waitForUserResponse(request: ApprovalRequest): Promise<ApprovalResponse> {
    return new Promise((resolve) => {
      // UI event listener kurulacak
      // Şimdilik mock response
      setTimeout(() => {
        resolve({
          requestId: request.id,
          approved: true,
          userComment: 'Simulated approval',
          timestamp: new Date()
        })
      }, 100)
    })
  }

  /**
   * Manuel onay/red
   */
  respond(requestId: string, approved: boolean, comment?: string): ApprovalResponse | null {
    const request = this.pendingRequests.get(requestId)
    if (!request) return null

    const response: ApprovalResponse = {
      requestId,
      approved,
      userComment: comment,
      timestamp: new Date()
    }

    this.pendingRequests.delete(requestId)

    if (this.config.keepHistory) {
      this.addToHistory(response)
    }

    return response
  }

  /**
   * Geçmişe ekle
   */
  private addToHistory(response: ApprovalResponse): void {
    this.approvalHistory.push(response)

    // Max size kontrolü
    if (this.approvalHistory.length > this.config.maxHistorySize) {
      this.approvalHistory.shift()
    }
  }

  /**
   * Default kuralları başlat
   */
  private initializeDefaultRules(): void {
    // Sadece okuma işlemleri her zaman güvenli
    this.autoApproveRules.set('read-only', (task) => {
      const metadata = task.metadata as { operation?: string } | undefined
      return metadata?.operation === 'read' || task.type === 'analysis'
    })

    // Test dosyaları üzerinde işlemler güvenli
    this.autoApproveRules.set('test-files', (task) => {
      const metadata = task.metadata as { files?: string[] } | undefined
      if (!metadata?.files) return true

      return metadata.files.every((f) => f.includes('.test.') || f.includes('.spec.'))
    })
  }

  /**
   * Custom kural ekle
   */
  addRule(name: string, rule: (task: Task) => boolean): void {
    this.autoApproveRules.set(name, rule)
  }

  /**
   * Kural sil
   */
  removeRule(name: string): void {
    this.autoApproveRules.delete(name)
  }

  /**
   * Bekleyen istekler
   */
  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values())
  }

  /**
   * Geçmiş
   */
  getHistory(limit?: number): ApprovalResponse[] {
    if (limit) {
      return this.approvalHistory.slice(-limit)
    }
    return [...this.approvalHistory]
  }

  /**
   * İstatistikler
   */
  getStats(): {
    totalRequests: number
    approved: number
    rejected: number
    autoApproved: number
    pending: number
  } {
    const approved = this.approvalHistory.filter((r) => r.approved).length
    const autoApproved = this.approvalHistory.filter(
      (r) => r.approved && r.userComment?.includes('Auto-approved')
    ).length

    return {
      totalRequests: this.approvalHistory.length + this.pendingRequests.size,
      approved,
      rejected: this.approvalHistory.length - approved,
      autoApproved,
      pending: this.pendingRequests.size
    }
  }

  /**
   * Config güncelle
   */
  updateConfig(config: Partial<ElysionConfig>): void {
    this.config = { ...this.config, ...config }
  }
}
