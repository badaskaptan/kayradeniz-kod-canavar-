import type { Task, TaskResult, Agent } from '../types'

/**
 * ==================== REFLEXION AGENT ====================
 * Kod kalitesi analizi ve otomatik düzeltme önerileri
 *
 * Görevleri:
 * 1. Placeholder detection (TODO, GÜNCELLE, PLACEHOLDER)
 * 2. README quality check
 * 3. Build error detection
 * 4. Logic completeness check
 * 5. Fix suggestions with severity
 */

export interface ReflexionIssue {
  id: string
  type: 'placeholder' | 'readme' | 'build' | 'logic' | 'quality'
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR'
  file: string
  line?: number
  message: string
  suggestion: string
  autoFixable: boolean
  fix?: {
    type: 'UPDATE_FILE' | 'DELETE_FILE' | 'RUN_COMMAND'
    details: Record<string, unknown>
  }
}

export interface ReflexionReport {
  timestamp: Date
  totalIssues: number
  critical: number
  major: number
  minor: number
  issues: ReflexionIssue[]
  overallScore: number // 0-100
  recommendations: string[]
}

export class ReflexionAgent implements Agent {
  id = 'reflexion'
  name = 'Reflexion Agent'
  type = 'analyzer' as const
  description = 'Kod kalitesi analizi ve otomatik düzeltme'
  capabilities = ['code_analysis', 'quality_check', 'auto_fix_suggestion']
  status: 'idle' | 'active' | 'working' | 'waiting' | 'error' = 'idle'
  active = true
  metadata: Record<string, unknown> = {
    maxIssuesPerScan: 100,
    autoFixEnabled: true,
    severityThreshold: 'MINOR'
  }

  private issues: ReflexionIssue[] = []
  private lastReport: ReflexionReport | null = null

  /**
   * Ana task executor
   */
  async executeTask(task: Task): Promise<TaskResult> {
    this.status = 'working'
    const startTime = Date.now()

    try {
      switch (task.type) {
        case 'analysis':
          return await this.analyzeCode(task)

        default:
          throw new Error(`Unsupported task type: ${task.type}`)
      }
    } catch (error) {
      this.status = 'error'
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      }
    } finally {
      this.status = 'idle'
    }
  }

  /**
   * Kod analizi yap
   */
  private async analyzeCode(task: Task): Promise<TaskResult> {
    const targetPath = (task.metadata?.targetPath as string) || '.'

    // Reset issues
    this.issues = []

    // Farklı analiz türleri
    await this.detectPlaceholders(targetPath)
    await this.checkReadmeQuality(targetPath)
    await this.detectLogicIssues(targetPath)
    await this.checkCodeQuality(targetPath)

    // Rapor oluştur
    const report = this.generateReport()
    this.lastReport = report

    // Format output for display
    const output = this.formatReportOutput(report)

    return {
      success: true,
      output,
      data: report,
      executionTime: Date.now() - (task.startedAt?.getTime() || Date.now())
    }
  }

  /**
   * Format report for user-friendly display
   */
  private formatReportOutput(report: ReflexionReport): string {
    const lines: string[] = []

    lines.push('# 📊 **Project Analysis Report**\n')
    lines.push(`**Overall Score:** ${report.overallScore}/100\n`)
    lines.push(`**Total Issues:** ${report.totalIssues}`)
    lines.push(`  - 🔴 Critical: ${report.critical}`)
    lines.push(`  - 🟡 Major: ${report.major}`)
    lines.push(`  - 🟢 Minor: ${report.minor}\n`)

    if (report.issues.length > 0) {
      lines.push('## Issues Found:\n')
      report.issues.slice(0, 10).forEach((issue, index) => {
        const icon = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'MAJOR' ? '🟡' : '🟢'
        lines.push(`${index + 1}. ${icon} **${issue.type}** in \`${issue.file}\``)
        lines.push(`   ${issue.message}`)
        if (issue.suggestion) {
          lines.push(`   💡 Suggestion: ${issue.suggestion}`)
        }
        lines.push('')
      })

      if (report.issues.length > 10) {
        lines.push(`\n... and ${report.issues.length - 10} more issues`)
      }
    }

    if (report.recommendations.length > 0) {
      lines.push('\n## 💡 Recommendations:\n')
      report.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. ${rec}`)
      })
    }

    return lines.join('\n')
  }

  /**
   * Placeholder detection
   */
  private async detectPlaceholders(targetPath: string): Promise<void> {
    const patterns = [
      /\/\/\s*TODO[:\s]*/gi,
      /\/\/\s*FIXME[:\s]*/gi,
      /\/\/\s*HACK[:\s]*/gi,
      /<GÜNCELLE>/gi,
      /<UPDATE>/gi,
      /PLACEHOLDER/gi,
      /\{\/\*\s*TODO\s*\*\/\}/gi
    ]

    // Dosya okuma simülasyonu (Tool Bridge ile yapılacak)
    const files = await this.scanProjectFiles(targetPath)

    for (const file of files) {
      const content = await this.readFile(file)
      const lines = content.split('\n')

      lines.forEach((line, index) => {
        patterns.forEach((pattern) => {
          if (pattern.test(line)) {
            this.issues.push({
              id: `placeholder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'placeholder',
              severity: line.includes('CRITICAL')
                ? 'CRITICAL'
                : line.includes('TODO')
                  ? 'MAJOR'
                  : 'MINOR',
              file,
              line: index + 1,
              message: `Placeholder found: ${line.trim()}`,
              suggestion: 'Complete this implementation or remove the placeholder',
              autoFixable: false
            })
          }
        })
      })
    }
  }

  /**
   * README kalite kontrolü
   */
  private async checkReadmeQuality(targetPath: string): Promise<void> {
    const readmePath = `${targetPath}/README.md`
    const content = await this.readFile(readmePath)

    if (!content || content.length < 100) {
      this.issues.push({
        id: `readme-${Date.now()}`,
        type: 'readme',
        severity: 'MAJOR',
        file: readmePath,
        message: 'README is too short or missing',
        suggestion: 'Add comprehensive project documentation',
        autoFixable: false
      })
      return
    }

    // README bölümlerini kontrol et
    const requiredSections = ['Installation', 'Usage', 'Features']
    const missingSections = requiredSections.filter(
      (section) => !content.toLowerCase().includes(section.toLowerCase())
    )

    if (missingSections.length > 0) {
      this.issues.push({
        id: `readme-sections-${Date.now()}`,
        type: 'readme',
        severity: 'MINOR',
        file: readmePath,
        message: `Missing sections: ${missingSections.join(', ')}`,
        suggestion: 'Add these sections to improve documentation',
        autoFixable: false
      })
    }
  }

  /**
   * Logic completeness check
   */
  private async detectLogicIssues(targetPath: string): Promise<void> {
    const files = await this.scanProjectFiles(targetPath)

    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue

      const content = await this.readFile(file)

      // Empty catch blocks
      if (/catch\s*\([^)]*\)\s*\{\s*\}/g.test(content)) {
        this.issues.push({
          id: `empty-catch-${Date.now()}`,
          type: 'logic',
          severity: 'MAJOR',
          file,
          message: 'Empty catch block detected',
          suggestion: 'Add proper error handling',
          autoFixable: false
        })
      }

      // Console.log in production
      if (/console\.(log|debug|info)/g.test(content)) {
        this.issues.push({
          id: `console-log-${Date.now()}`,
          type: 'quality',
          severity: 'MINOR',
          file,
          message: 'Console.log found in code',
          suggestion: 'Use proper logging library or remove',
          autoFixable: true,
          fix: {
            type: 'UPDATE_FILE',
            details: {
              pattern: 'console.log',
              replacement: '// console.log'
            }
          }
        })
      }

      // Unused variables (basit check)
      const unusedVarPattern = /const\s+(\w+)\s*=/g
      const matches = content.matchAll(unusedVarPattern)
      for (const match of matches) {
        const varName = match[1]
        const usagePattern = new RegExp(`\\b${varName}\\b`, 'g')
        const usages = content.match(usagePattern)

        if (usages && usages.length === 1) {
          // Sadece tanımlandığı yerde geçiyor
          this.issues.push({
            id: `unused-var-${Date.now()}`,
            type: 'quality',
            severity: 'MINOR',
            file,
            message: `Unused variable: ${varName}`,
            suggestion: 'Remove unused variable or use it',
            autoFixable: false
          })
        }
      }
    }
  }

  /**
   * Kod kalitesi kontrolü
   */
  private async checkCodeQuality(targetPath: string): Promise<void> {
    const files = await this.scanProjectFiles(targetPath)

    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue

      const content = await this.readFile(file)
      const lines = content.split('\n')

      // Çok uzun fonksiyonlar
      let currentFunction = ''
      let functionStartLine = 0
      let braceCount = 0

      lines.forEach((line, index) => {
        if (line.includes('function ') || line.includes('=>')) {
          currentFunction = line
          functionStartLine = index
          braceCount = 0
        }

        braceCount += (line.match(/{/g) || []).length
        braceCount -= (line.match(/}/g) || []).length

        if (braceCount === 0 && currentFunction) {
          const functionLength = index - functionStartLine

          if (functionLength > 50) {
            this.issues.push({
              id: `long-function-${Date.now()}`,
              type: 'quality',
              severity: 'MINOR',
              file,
              line: functionStartLine + 1,
              message: `Function is too long (${functionLength} lines)`,
              suggestion: 'Consider breaking into smaller functions',
              autoFixable: false
            })
          }

          currentFunction = ''
        }
      })
    }
  }

  /**
   * Rapor oluştur
   */
  private generateReport(): ReflexionReport {
    const critical = this.issues.filter((i) => i.severity === 'CRITICAL').length
    const major = this.issues.filter((i) => i.severity === 'MAJOR').length
    const minor = this.issues.filter((i) => i.severity === 'MINOR').length

    // Score calculation (100 - penalties)
    const score = Math.max(0, 100 - critical * 20 - major * 5 - minor * 1)

    const recommendations: string[] = []
    if (critical > 0) recommendations.push('🔴 Kritik sorunları hemen düzeltin!')
    if (major > 5) recommendations.push('🟡 Major sorunlar kod kalitesini düşürüyor')
    if (minor > 10) recommendations.push('🟢 Minor sorunları zamanla düzeltin')

    return {
      timestamp: new Date(),
      totalIssues: this.issues.length,
      critical,
      major,
      minor,
      issues: this.issues,
      overallScore: score,
      recommendations
    }
  }

  /**
   * En son raporu getir
   */
  getLastReport(): ReflexionReport | null {
    return this.lastReport
  }

  /**
   * Auto-fixable sorunları düzelt
   */
  async applyAutoFixes(): Promise<{ fixed: number; failed: number }> {
    const fixableIssues = this.issues.filter((i) => i.autoFixable && i.fix)
    let fixed = 0
    let failed = 0

    for (const issue of fixableIssues) {
      try {
        if (issue.fix?.type === 'UPDATE_FILE') {
          // Tool Bridge ile dosya güncellemesi yapılacak
          console.log(`Auto-fixing: ${issue.file}`)
          fixed++
        }
      } catch (error) {
        console.error(`Auto-fix failed for ${issue.id}:`, error)
        failed++
      }
    }

    return { fixed, failed }
  }

  // ==================== MOCK HELPERS (Tool Bridge ile değiştirilecek) ====================

  private async scanProjectFiles(_path: string): Promise<string[]> {
    void _path
    // Tool Bridge: window.api.fs.readdir ile yapılacak
    return ['src/main.ts', 'src/App.tsx', 'src/components/Header.tsx', 'README.md', 'package.json']
  }

  private async readFile(path: string): Promise<string> {
    // Tool Bridge: window.api.fs.readFile ile yapılacak
    if (path.includes('README')) {
      return '# Project\n\nThis is a sample readme.'
    }
    return `
      // Sample code
      const x = 10;
      console.log(x);
      
      function longFunction() {
        // TODO: Implement this
      }
    `
  }
}
