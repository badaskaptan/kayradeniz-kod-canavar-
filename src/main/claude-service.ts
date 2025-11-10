/* eslint-disable @typescript-eslint/no-explicit-any */
// Claude MCP Service - API Key Management + Conversation
import Anthropic from '@anthropic-ai/sdk'
import { BrowserWindow, app } from 'electron'
import Store from 'electron-store'
import * as fs from 'fs/promises'
import * as path from 'path'
import { spawn } from 'child_process'
import { MCPActivityLogger } from './mcp-activity-logger'
import { RewrittenFileParser } from './rewritten-file-parser'
import { ActivityObserver } from './activity-observer'
import { ShipsLogbook, Pattern, KnowledgeEntry } from '../shared/ships-logbook'
import type { Observation } from '../types/observation'
import { IntelligenceFleet } from './intelligence-fleet'

interface ConversationMessage {
  role: 'user' | 'assistant'
  // content can be a plain text string or a structured payload (tool_use, tool_result, etc.)
  content: string | any
}

interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

interface StoreSchema {
  apiKey?: string
  userProfile?: unknown
}

export class ClaudeMCPService {
  private anthropic: Anthropic | null = null
  private conversationHistory: ConversationMessage[] = []
  private store: Store<StoreSchema>
  private workspacePath: string = ''
  private activityLogger: MCPActivityLogger
  private currentActivityId: string | null = null
  private activityObserver: ActivityObserver
  private currentObservationId?: string // Dual-teacher observation tracking
  private shipsLogbook: ShipsLogbook
  private intelligenceFleet: IntelligenceFleet

  // str_replace_editor undo history
  private fileEditHistory: Map<string, string> = new Map()

  // 🎭 User profile tracking - Sadece değiştiğinde güncelle
  private currentUserProfile: unknown = null
  private profileInitialized: boolean = false

  // 📂 Persistent working directory for terminal commands
  private currentWorkingDir: string = ''

  constructor() {
    // electron-store ile şifreli saklama
    // Use fixed cwd to ensure same storage location in dev and production
    const configPath = path.join(app.getPath('userData'), 'config')
    this.store = new Store<StoreSchema>({
      name: 'claude-config',
      cwd: configPath, // Force same location for dev and production
      encryptionKey: 'luma-secure-key-v1' // Değiştirilebilir
    })

    // MCP Activity Logger'ı initialize et
    const dataDir = path.join(app.getPath('userData'), 'mcp-learning')
    this.activityLogger = new MCPActivityLogger(dataDir)
    this.activityLogger.initialize().catch(console.error)

    // Ship's Logbook'u initialize et
    this.shipsLogbook = new ShipsLogbook(dataDir)
    this.shipsLogbook.initialize()

    // Activity Observer'ı initialize et
    this.activityObserver = new ActivityObserver(
      {
        enabled: true,
        maxQueueSize: 100,
        flushInterval: 5000
      },
      this.shipsLogbook
    )

    // ActivityObserver will persist observations directly to ShipsLogbook (if available)

    // Initialize Intelligence Fleet (Phase 1.3)
    this.intelligenceFleet = new IntelligenceFleet(this.shipsLogbook, {
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b',
      temperature: 0.3,
      maxTokens: 1000
    })

    // Connect ActivityObserver to Intelligence Fleet for analysis
    this.activityObserver.onComplete((observation) => {
      try {
        // Non-blocking async analysis
        this.intelligenceFleet.processObservation(observation).catch((error) => {
          console.error('🧠 Fleet analysis error:', error)
        })
      } catch (error) {
        console.error('🧠 Failed to queue observation for analysis:', error)
      }
    })

    // Başlangıçta API key varsa yükle
    const savedKey = this.store.get('apiKey')
    if (savedKey) {
      this.setApiKey(savedKey)
    }

    // Başlangıçta user profile varsa yükle
    const savedProfile = this.store.get('userProfile')
    if (savedProfile) {
      this.currentUserProfile = savedProfile
      this.profileInitialized = true
      console.log('📂 User profile auto-loaded from disk')
    }
  }

  // Workspace path ayarla
  setWorkspacePath(workspacePath: string): void {
    this.workspacePath = workspacePath
    // Reset working directory to workspace root
    this.currentWorkingDir = workspacePath
  }

  // API Key yönetimi
  setApiKey(apiKey: string): void {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
      defaultHeaders: {
        'anthropic-beta': 'computer-use-2025-01-24'
      },
      timeout: 60000, // 60 saniye timeout (önceden default ~10 saniye)
      maxRetries: 2 // 2 kez tekrar dene
    })
    this.store.set('apiKey', apiKey)
  }

  getApiKey(): string | undefined {
    return this.store.get('apiKey')
  }

  clearApiKey(): void {
    this.anthropic = null
    this.store.delete('apiKey')
    this.conversationHistory = []
    this.currentWorkingDir = ''
  }

  // Clear conversation history (for new chat)
  clearConversation(): void {
    this.conversationHistory = []
    this.currentWorkingDir = this.workspacePath // Reset to workspace root
    console.log('🗑️ Conversation history cleared')
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new Anthropic({
        apiKey,
        defaultHeaders: {
          'anthropic-beta': 'computer-use-2025-01-24'
        },
        timeout: 30000, // 30 saniye timeout
        maxRetries: 1 // 1 kez tekrar dene
      })

      // Basit bir test mesajı gönder
      const response = await testClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      })

      return !!response.id
    } catch (error) {
      console.error('API key validation failed:', error)
      return false
    }
  }

  // Claude'un built-in tool'ları
  private getAvailableTools(): ToolDefinition[] {
    return [
      {
        name: 'code_analyzer',
        description: 'Kod analizi yapar, hataları ve iyileştirmeleri bulur',
        input_schema: {
          type: 'object' as const,
          properties: {
            code: { type: 'string', description: 'Analiz edilecek kod' },
            language: { type: 'string', description: 'Programlama dili' }
          },
          required: ['code']
        }
      },
      {
        name: 'code_generator',
        description: 'İstenen özellikte kod üretir',
        input_schema: {
          type: 'object' as const,
          properties: {
            description: { type: 'string', description: 'Üretilecek kodun açıklaması' },
            language: { type: 'string', description: 'Hedef programlama dili' },
            framework: { type: 'string', description: 'Kullanılacak framework (opsiyonel)' }
          },
          required: ['description', 'language']
        }
      },
      {
        name: 'refactor_code',
        description: 'Mevcut kodu refactor eder ve iyileştirir',
        input_schema: {
          type: 'object' as const,
          properties: {
            code: { type: 'string', description: 'Refactor edilecek kod' },
            improvements: {
              type: 'array',
              items: { type: 'string' },
              description: 'İstenilen iyileştirmeler'
            }
          },
          required: ['code']
        }
      },
      {
        name: 'explain_code',
        description: 'Kodu detaylı şekilde açıklar',
        input_schema: {
          type: 'object' as const,
          properties: {
            code: { type: 'string', description: 'Açıklanacak kod' },
            detail_level: {
              type: 'string',
              enum: ['basic', 'detailed', 'expert'],
              description: 'Açıklama detay seviyesi'
            }
          },
          required: ['code']
        }
      },
      {
        name: 'find_bugs',
        description: "Kodda potansiyel bug'ları ve güvenlik açıklarını bulur",
        input_schema: {
          type: 'object' as const,
          properties: {
            code: { type: 'string', description: 'Kontrol edilecek kod' },
            check_security: { type: 'boolean', description: 'Güvenlik kontrolü yapılsın mı' }
          },
          required: ['code']
        }
      },
      {
        name: 'write_tests',
        description: "Kod için unit test'ler yazar",
        input_schema: {
          type: 'object' as const,
          properties: {
            code: { type: 'string', description: 'Test yazılacak kod' },
            test_framework: {
              type: 'string',
              description: 'Test framework (jest, mocha, pytest, etc.)'
            }
          },
          required: ['code']
        }
      },
      {
        name: 'read_file',
        description: "Workspace'deki bir dosyayı okur",
        input_schema: {
          type: 'object' as const,
          properties: {
            file_path: {
              type: 'string',
              description: "Okunacak dosyanın relative path'i (workspace root'dan)"
            }
          },
          required: ['file_path']
        }
      },
      {
        name: 'list_directory',
        description: "Workspace'deki bir klasörün içeriğini listeler",
        input_schema: {
          type: 'object' as const,
          properties: {
            dir_path: {
              type: 'string',
              description:
                "Listelenecek klasörün relative path'i (workspace root'dan). Boş bırakılırsa root listelenir."
            }
          },
          required: []
        }
      },
      {
        name: 'search_files',
        description: "Workspace'de dosya/klasör ismine göre arama yapar",
        input_schema: {
          type: 'object' as const,
          properties: {
            pattern: {
              type: 'string',
              description: 'Aranacak dosya/klasör ismi veya pattern (*.js, README.md, vb.)'
            }
          },
          required: ['pattern']
        }
      },
      {
        name: 'get_file_tree',
        description: "Workspace'in tüm dosya ağacını gösterir (maximum 3 seviye derinlik)",
        input_schema: {
          type: 'object' as const,
          properties: {
            max_depth: { type: 'number', description: 'Maximum klasör derinliği (default: 3)' }
          },
          required: []
        }
      },
      {
        name: 'write_file',
        description: "Workspace'de dosya oluşturur veya üzerine yazar",
        input_schema: {
          type: 'object' as const,
          properties: {
            file_path: {
              type: 'string',
              description: "Yazılacak dosyanın relative path'i (workspace root'dan)"
            },
            content: { type: 'string', description: 'Dosyaya yazılacak içerik' }
          },
          required: ['file_path', 'content']
        }
      },
      {
        name: 'create_directory',
        description: "Workspace'de yeni klasör oluşturur",
        input_schema: {
          type: 'object' as const,
          properties: {
            dir_path: { type: 'string', description: "Oluşturulacak klasörün relative path'i" }
          },
          required: ['dir_path']
        }
      },
      {
        name: 'delete_file',
        description: "Workspace'den dosya siler",
        input_schema: {
          type: 'object' as const,
          properties: {
            file_path: { type: 'string', description: "Silinecek dosyanın relative path'i" }
          },
          required: ['file_path']
        }
      },
      {
        name: 'move_file',
        description: "Workspace'de dosya veya klasör taşır/yeniden adlandırır",
        input_schema: {
          type: 'object' as const,
          properties: {
            source_path: {
              type: 'string',
              description: "Taşınacak dosya/klasörün relative path'i"
            },
            destination_path: {
              type: 'string',
              description: 'Hedef path (klasör içine taşıma veya yeni isim)'
            }
          },
          required: ['source_path', 'destination_path']
        }
      },
      {
        name: 'run_terminal_command',
        description:
          "Terminal'de komut çalıştırır (npm, git, ls, dir, vb.). SPECIAL: 'cd' komutu ile working directory kalıcı olarak değiştirilebilir - sonraki tüm komutlar bu dizinde çalışır.",
        input_schema: {
          type: 'object' as const,
          properties: {
            command: {
              type: 'string',
              description:
                "Çalıştırılacak komut (npm, git, ls, dir, cd). 'cd' komutu working directory'yi kalıcı değiştirir."
            },
            args: {
              type: 'array',
              items: { type: 'string' },
              description: 'Komut argümanları (opsiyonel). Örnek: cd için ["mayin-tarlasi-oyunu"]'
            }
          },
          required: ['command']
        }
      },
      {
        name: 'run_tests',
        description: 'Projedeki testleri çalıştırır',
        input_schema: {
          type: 'object' as const,
          properties: {
            test_file: {
              type: 'string',
              description: 'Spesifik test dosyası (opsiyonel, boş bırakılırsa tüm testler)'
            }
          },
          required: []
        }
      },
      {
        name: 'str_replace_editor',
        description:
          'Advanced file editor with view, create, find-replace, insert and undo capabilities. Use this for precise file editing operations.',
        input_schema: {
          type: 'object' as const,
          properties: {
            command: {
              type: 'string',
              enum: ['view', 'create', 'str_replace', 'insert', 'undo_edit'],
              description:
                'Command: view (display file), create (new file), str_replace (find & replace), insert (add lines), undo_edit (revert last change)'
            },
            path: {
              type: 'string',
              description: 'File path relative to workspace root'
            },
            file_text: {
              type: 'string',
              description: 'File content for create command'
            },
            old_str: {
              type: 'string',
              description: 'String to find for str_replace command'
            },
            new_str: {
              type: 'string',
              description: 'String to replace with for str_replace command'
            },
            insert_line: {
              type: 'number',
              description: 'Line number to insert at (0-indexed)'
            },
            insert_text: {
              type: 'string',
              description: 'Text to insert'
            },
            view_range: {
              type: 'array',
              items: { type: 'number' },
              description: 'Optional [start_line, end_line] for viewing specific lines'
            }
          },
          required: ['command', 'path']
        }
      }
    ]
  }

  // Dosya sistemi tool handler'ları
  private async handleReadFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.workspacePath, filePath)
      const stats = await fs.stat(fullPath)

      // 1MB'dan büyük dosyaları okuma
      if (stats.size > 1024 * 1024) {
        return `Hata: Dosya çok büyük (${(stats.size / 1024 / 1024).toFixed(2)}MB). Lütfen daha küçük bir dosya seçin.`
      }

      const content = await fs.readFile(fullPath, 'utf-8')

      // 10000 satırdan fazla ise kırp
      const lines = content.split('\n')
      if (lines.length > 10000) {
        const truncated = lines.slice(0, 10000).join('\n')
        return `Dosya içeriği (${filePath} - ilk 10000 satır):\n\`\`\`\n${truncated}\n\`\`\`\n\n⚠️ Dosya ${lines.length} satır, sadece ilk 10000 gösterildi.`
      }

      return `Dosya içeriği (${filePath}):\n\`\`\`\n${content}\n\`\`\``
    } catch (error: any) {
      return `Hata: Dosya okunamadı - ${error.message}`
    }
  }

  private async handleListDirectory(dirPath: string = ''): Promise<string> {
    try {
      const fullPath = path.join(this.workspacePath, dirPath)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      const items = entries.map((entry) => {
        const type = entry.isDirectory() ? '📁' : '📄'
        return `${type} ${entry.name}`
      })

      return `Klasör içeriği (${dirPath || 'root'}):\n${items.join('\n')}`
    } catch (error: any) {
      return `Hata: Klasör okunamadı - ${error.message}`
    }
  }

  private async handleSearchFiles(pattern: string): Promise<string> {
    try {
      const results: string[] = []
      const MAX_RESULTS = 100
      let fileCount = 0

      const searchRecursive = async (dir: string, depth: number = 0): Promise<void> => {
        if (depth > 4 || fileCount >= MAX_RESULTS) return // Max 4 seviye, max 100 sonuç

        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (fileCount >= MAX_RESULTS) break

          const fullPath = path.join(dir, entry.name)
          const relativePath = path.relative(this.workspacePath, fullPath)

          // node_modules ve .git gibi klasörleri atla
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === 'out' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name.startsWith('.')
          ) {
            continue
          }

          // Pattern match kontrolü (basit wildcard desteği)
          const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i')
          if (regex.test(entry.name)) {
            const type = entry.isDirectory() ? '📁' : '📄'
            results.push(`${type} ${relativePath}`)
            fileCount++
          }

          if (entry.isDirectory() && fileCount < MAX_RESULTS) {
            await searchRecursive(fullPath, depth + 1)
          }
        }
      }

      await searchRecursive(this.workspacePath)

      if (results.length === 0) {
        return `"${pattern}" pattern'ine uyan dosya/klasör bulunamadı.`
      }

      const resultText = `Bulunan dosyalar (${results.length} adet):\n${results.slice(0, 50).join('\n')}`

      if (results.length > 50) {
        return (
          resultText +
          `\n\n⚠️ ${results.length - 50} sonuç daha var. Daha spesifik pattern kullanın.`
        )
      }

      return resultText
    } catch (error: any) {
      return `Hata: Arama yapılamadı - ${error.message}`
    }
  }

  private async handleGetFileTree(maxDepth: number = 2): Promise<string> {
    try {
      let fileCount = 0
      const MAX_FILES = 100 // Maksimum 100 dosya göster

      const buildTree = async (
        dir: string,
        depth: number = 0,
        prefix: string = ''
      ): Promise<string[]> => {
        if (depth >= maxDepth || fileCount >= MAX_FILES) return []

        const entries = await fs.readdir(dir, { withFileTypes: true })
        const lines: string[] = []

        // node_modules ve .git gibi klasörleri atla
        const filtered = entries
          .filter(
            (e) =>
              e.name !== 'node_modules' &&
              e.name !== '.git' &&
              e.name !== 'out' &&
              e.name !== '.vscode' &&
              e.name !== 'dist' &&
              e.name !== 'build' &&
              !e.name.startsWith('.')
          )
          .slice(0, 50) // Her klasörde max 50 item

        for (let i = 0; i < filtered.length && fileCount < MAX_FILES; i++) {
          const entry = filtered[i]
          const isLast = i === filtered.length - 1
          const connector = isLast ? '└── ' : '├── '
          const icon = entry.isDirectory() ? '📁' : '📄'

          lines.push(`${prefix}${connector}${icon} ${entry.name}`)
          fileCount++

          if (entry.isDirectory() && fileCount < MAX_FILES) {
            const fullPath = path.join(dir, entry.name)
            const newPrefix = prefix + (isLast ? '    ' : '│   ')
            const subTree = await buildTree(fullPath, depth + 1, newPrefix)
            lines.push(...subTree)
          }
        }

        return lines
      }

      const tree = await buildTree(this.workspacePath)
      const rootName = path.basename(this.workspacePath)

      const result = `Dosya ağacı (${rootName}, ilk ${fileCount} öğe):\n📁 ${rootName}\n${tree.join('\n')}`

      if (fileCount >= MAX_FILES) {
        return result + '\n\n⚠️ Daha fazla dosya var. Spesifik klasör için list_directory kullanın.'
      }

      return result
    } catch (error: any) {
      return `Hata: Dosya ağacı oluşturulamadı - ${error.message}`
    }
  }

  private async handleWriteFile(filePath: string, content: string): Promise<string> {
    try {
      const fullPath = path.join(this.workspacePath, filePath)

      // Klasör yoksa oluştur
      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })

      await fs.writeFile(fullPath, content, 'utf-8')
      return `✅ Dosya yazıldı: ${filePath}`
    } catch (error: any) {
      return `Hata: Dosya yazılamadı - ${error.message}`
    }
  }

  private async handleCreateDirectory(dirPath: string): Promise<string> {
    try {
      const fullPath = path.join(this.workspacePath, dirPath)
      await fs.mkdir(fullPath, { recursive: true })
      return `✅ Klasör oluşturuldu: ${dirPath}`
    } catch (error: any) {
      return `Hata: Klasör oluşturulamadı - ${error.message}`
    }
  }

  private async handleDeleteFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.workspacePath, filePath)

      // Güvenlik kontrolü - workspace dışına çıkmasın
      if (!fullPath.startsWith(this.workspacePath)) {
        return `Hata: Güvenlik - workspace dışındaki dosyalar silinemez`
      }

      await fs.unlink(fullPath)
      return `✅ Dosya silindi: ${filePath}`
    } catch (error: any) {
      return `Hata: Dosya silinemedi - ${error.message}`
    }
  }

  private async handleMoveFile(sourcePath: string, destinationPath: string): Promise<string> {
    try {
      const fullSourcePath = path.join(this.workspacePath, sourcePath)
      const fullDestPath = path.join(this.workspacePath, destinationPath)

      // Güvenlik kontrolü - workspace dışına çıkmasın
      if (
        !fullSourcePath.startsWith(this.workspacePath) ||
        !fullDestPath.startsWith(this.workspacePath)
      ) {
        return `Hata: Güvenlik - workspace dışına dosya taşınamaz`
      }

      // Kaynak dosya var mı kontrol et
      await fs.access(fullSourcePath)

      // Hedef klasör yoksa oluştur
      const destDir = path.dirname(fullDestPath)
      await fs.mkdir(destDir, { recursive: true })

      // Dosyayı taşı (rename ile)
      await fs.rename(fullSourcePath, fullDestPath)

      return `✅ Dosya taşındı: ${sourcePath} -> ${destinationPath}`
    } catch (error: any) {
      return `Hata: Dosya taşınamadı - ${error.message}`
    }
  }

  private async handleRunTerminalCommand(command: string, args: string[] = []): Promise<string> {
    try {
      // 🔧 SPECIAL HANDLING: cd command changes working directory
      if (command === 'cd' && args.length > 0) {
        const targetDir = args[0].replace(/['"]/g, '') // Remove quotes
        const fullPath = path.isAbsolute(targetDir)
          ? targetDir
          : path.join(this.currentWorkingDir || this.workspacePath, targetDir)

        // Verify directory exists
        try {
          const stats = await fs.stat(fullPath)
          if (!stats.isDirectory()) {
            return `❌ Hata: '${targetDir}' bir klasör değil`
          }

          // Update persistent working directory
          this.currentWorkingDir = fullPath
          return `✅ Çalışma dizini değiştirildi:\n${fullPath}\n\nBundan sonraki tüm terminal komutları bu dizinde çalışacak.`
        } catch (error: any) {
          return `❌ Hata: Klasör bulunamadı - ${targetDir}\n${error.message}`
        }
      }

      // 🎯 Notify UI to show command in terminal panel
      const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('terminal:executeCommand', {
          command: fullCommand,
          cwd: this.currentWorkingDir || this.workspacePath
        })
      }

      // Normal command execution
      const workingDir = this.currentWorkingDir || this.workspacePath

      return new Promise((resolve) => {
        const proc = spawn(command, args, {
          cwd: workingDir,
          shell: true
        })

        let stdout = ''
        let stderr = ''

        proc.stdout?.on('data', (data) => {
          stdout += data.toString()
        })

        proc.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        proc.on('close', (code) => {
          const output = stdout || stderr
          const success = code === 0

          // 🎯 Send result to UI terminal
          if (windows.length > 0) {
            windows[0].webContents.send('terminal:commandResult', {
              command: fullCommand,
              output: output,
              exitCode: code,
              success: success
            })
          }

          if (code === 0) {
            resolve(`✅ Komut başarılı:\n${stdout}`)
          } else {
            resolve(`❌ Komut hata verdi (exit code: ${code}):\n${stderr}\n${stdout}`)
          }
        })

        proc.on('error', (error) => {
          resolve(`Hata: Komut çalıştırılamadı - ${error.message}`)
        })

        // 30 saniye timeout
        setTimeout(() => {
          proc.kill()
          resolve(`Hata: Komut timeout (30 saniye)`)
        }, 30000)
      })
    } catch (error: any) {
      return `Hata: Terminal komutu çalıştırılamadı - ${error.message}`
    }
  }

  private async handleRunTests(testFile?: string): Promise<string> {
    try {
      // package.json'dan test script'ini bul
      const packageJsonPath = path.join(this.workspacePath, 'package.json')
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))

      const testScript = packageJson.scripts?.test
      if (!testScript) {
        return `Hata: package.json'da test script'i bulunamadı`
      }

      const args = testFile ? [testFile] : []
      return await this.handleRunTerminalCommand('npm', ['test', ...args])
    } catch (error: any) {
      return `Hata: Test çalıştırılamadı - ${error.message}`
    }
  }

  // 🆕 str_replace_editor handler - Anthropic's official text editor tool
  private async handleStrReplaceEditor(params: {
    command: 'view' | 'create' | 'str_replace' | 'insert' | 'undo_edit'
    path: string
    file_text?: string
    old_str?: string
    new_str?: string
    insert_line?: number
    insert_text?: string
    view_range?: [number, number]
  }): Promise<string> {
    const fullPath = path.join(this.workspacePath, params.path)

    try {
      switch (params.command) {
        case 'view': {
          // View file content
          const content = await fs.readFile(fullPath, 'utf-8')
          const lines = content.split('\n')

          if (params.view_range) {
            const [start, end] = params.view_range
            const selectedLines = lines.slice(start, end + 1)
            return `📄 File: ${params.path} (lines ${start}-${end}):\n\`\`\`\n${selectedLines.join('\n')}\n\`\`\``
          }

          // Limit to 10000 lines
          if (lines.length > 10000) {
            const truncated = lines.slice(0, 10000).join('\n')
            return `📄 File: ${params.path} (first 10000 lines of ${lines.length}):\n\`\`\`\n${truncated}\n\`\`\`\n\n⚠️ File has ${lines.length} lines, showing first 10000`
          }

          return `📄 File: ${params.path}:\n\`\`\`\n${content}\n\`\`\``
        }

        case 'create': {
          // Create new file
          if (!params.file_text) {
            return `❌ Error: file_text is required for create command`
          }

          // Save current content for undo (if file exists)
          try {
            const existing = await fs.readFile(fullPath, 'utf-8')
            this.fileEditHistory.set(params.path, existing)
          } catch {
            // File doesn't exist, that's fine
            this.fileEditHistory.set(params.path, '')
          }

          // Create directories if needed
          const dir = path.dirname(fullPath)
          await fs.mkdir(dir, { recursive: true })

          await fs.writeFile(fullPath, params.file_text, 'utf-8')
          return `✅ File created: ${params.path} (${params.file_text.length} bytes)`
        }

        case 'str_replace': {
          // Find and replace string
          if (!params.old_str || params.new_str === undefined) {
            return `❌ Error: old_str and new_str are required for str_replace command`
          }

          const content = await fs.readFile(fullPath, 'utf-8')

          // Save for undo
          this.fileEditHistory.set(params.path, content)

          // Check if old_str exists
          if (!content.includes(params.old_str)) {
            return `❌ Error: String not found in file: "${params.old_str.substring(0, 50)}..."`
          }

          // Count occurrences
          const occurrences = (
            content.match(new RegExp(params.old_str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ||
            []
          ).length

          // Replace all occurrences
          const newContent = content.replaceAll(params.old_str, params.new_str)
          await fs.writeFile(fullPath, newContent, 'utf-8')

          return `✅ Replaced ${occurrences} occurrence(s) in ${params.path}`
        }

        case 'insert': {
          // Insert text at specific line
          if (params.insert_line === undefined || !params.insert_text) {
            return `❌ Error: insert_line and insert_text are required for insert command`
          }

          const content = await fs.readFile(fullPath, 'utf-8')
          const lines = content.split('\n')

          // Save for undo
          this.fileEditHistory.set(params.path, content)

          // Insert at line (0-indexed)
          const lineNum = params.insert_line
          if (lineNum < 0 || lineNum > lines.length) {
            return `❌ Error: Invalid line number ${lineNum} (file has ${lines.length} lines)`
          }

          lines.splice(lineNum, 0, params.insert_text)
          const newContent = lines.join('\n')
          await fs.writeFile(fullPath, newContent, 'utf-8')

          return `✅ Inserted text at line ${lineNum} in ${params.path}`
        }

        case 'undo_edit': {
          // Undo last edit
          const previousContent = this.fileEditHistory.get(params.path)
          if (previousContent === undefined) {
            return `❌ Error: No edit history found for ${params.path}`
          }

          await fs.writeFile(fullPath, previousContent, 'utf-8')
          this.fileEditHistory.delete(params.path)

          return `✅ Undone last edit to ${params.path}`
        }

        default:
          return `❌ Error: Unknown command "${params.command}"`
      }
    } catch (error: any) {
      return `❌ Error: ${error.message}`
    }
  }

  // Tool execution handler
  private async executeToolInternal(
    toolName: string,
    params: any,
    mainWindow?: BrowserWindow
  ): Promise<string> {
    const startTime = Date.now()
    let result = ''
    let success = false

    try {
      // 🎓 Emit tool usage event to Usta Modu
      if (mainWindow) {
        mainWindow.webContents.send('claude:toolUsed', {
          tool: toolName,
          args: params,
          timestamp: Date.now()
        })

        // 💭 Emit thinking step for VS Code Copilot-style workflow
        mainWindow.webContents.send('claude:thinkingStep', {
          type: 'tool_execution',
          tool: toolName,
          description: this.getToolDescription(toolName, params),
          status: 'running'
        })
      }

      switch (toolName) {
        case 'read_file':
          result = await this.handleReadFile(params.file_path)
          break
        case 'list_directory':
          result = await this.handleListDirectory(params.dir_path)
          break
        case 'search_files':
          result = await this.handleSearchFiles(params.pattern)
          break
        case 'get_file_tree':
          result = await this.handleGetFileTree(params.max_depth)
          break
        case 'write_file':
          result = await this.handleWriteFile(params.file_path, params.content)
          break
        case 'create_directory':
          result = await this.handleCreateDirectory(params.dir_path)
          break
        case 'delete_file':
          result = await this.handleDeleteFile(params.file_path)
          break
        case 'move_file':
          result = await this.handleMoveFile(params.source_path, params.destination_path)
          break
        case 'run_terminal_command':
          result = await this.handleRunTerminalCommand(params.command, params.args)
          break
        case 'run_tests':
          result = await this.handleRunTests(params.test_file)
          break
        case 'str_replace_editor':
          result = await this.handleStrReplaceEditor(params)
          break
        default:
          result = `${toolName} tool'u çalıştırıldı. Parametreler: ${JSON.stringify(params)}`
      }

      success = !result.includes('Hata:')
      return result
    } finally {
      const executionTime = Date.now() - startTime
      
      // 💭 Emit thinking step completion
      if (mainWindow) {
        mainWindow.webContents.send('claude:thinkingStep', {
          type: 'tool_execution',
          tool: toolName,
          description: this.getToolDescription(toolName, params),
          status: success ? 'completed' : 'error',
          executionTime
        })
      }
      
      // Pass currentObservationId to recordToolCall
      if (this.currentObservationId) {
        this.activityObserver.recordToolCall(
          this.currentObservationId,
          toolName,
          params,
          result,
          success,
          executionTime
        )
      }
    }
  }

  async sendMessage(message: string, context?: any, mainWindow?: BrowserWindow): Promise<any> {
    if (!this.anthropic) {
      return {
        success: false,
        error: 'API key ayarlanmamış. Lütfen önce API key giriniz.'
      }
    }

    // Workspace path'i context'ten al ve set et
    if (context?.workspacePath) {
      this.setWorkspacePath(context.workspacePath)
    }

    try {
      const tools = this.getAvailableTools()

      // Context varsa mesaja ekle
      let fullMessage = message
      if (context?.selectedCode) {
        fullMessage = `Seçili kod:\n\`\`\`${context.language || ''}\n${context.selectedCode}\n\`\`\`\n\n${message}`
      }

      // Workspace path varsa system message olarak ekle
      let systemMessage = `You are a helpful AI coding assistant with access to powerful tools for file operations, terminal commands, and code analysis.

🛠️ AVAILABLE TOOLS (${tools.length} tools):
${tools.map((t, i) => `${i + 1}. ${t.name} - ${(t.description || '').split('\n')[0]}`).join('\n')}

⚠️ CRITICAL RULES:
1. ONLY use the ${tools.length} tools listed above
2. NEVER mention or use tools not in this list
3. If user asks for unavailable functionality, explain which available tool can help`

      systemMessage += `\n\n⚠️ IMPORTANT TOOL USAGE RULES:
1. ALWAYS use 'write_file' tool to create or modify files - NEVER use bash/cat/echo commands
2. ALWAYS use 'list_directory' tool to list folders - NEVER use ls/dir commands
3. ALWAYS use 'read_file' tool to read files - NEVER use cat commands
4. You CAN use 'run_terminal_command' for: npm, git, compilation, tests
5. For changing directory: Use run_terminal_command with command='cd' and args=['folder-name']
6. ❌ NEVER use <boltArtifact>, <boltAction>, or any special UI formatting in responses
7. ❌ NEVER write code in the chat - ALWAYS use write_file tool to save code to workspace

Example CORRECT usage:
- Create file: write_file(file_path="index.html", content="...")
- Read file: read_file(file_path="package.json")
- Change dir: run_terminal_command(command="cd", args=["mayin-tarlasi-oyunu"])
- List dir: list_directory(dir_path="src")

Example WRONG usage (DO NOT DO THIS):
- ❌ run_terminal_command(command="cat > index.html << 'EOF'...")
- ❌ run_terminal_command(command="touch", args=["file.js"])
- ❌ run_terminal_command(command="ls", args=["-la"])
- ❌ Using bash heredoc syntax for file creation
- ❌ <boltArtifact> or <boltAction> tags
- ❌ Writing full code in chat messages instead of using write_file`

      systemMessage += `\n\n🚀 MULTI-STEP WORKFLOW RULES (CRITICAL - READ CAREFULLY):
1. ✅ When user asks you to complete a task, DO ALL STEPS WITHOUT STOPPING
2. ✅ Use multiple tools in sequence automatically - NO NEED to wait for user confirmation
3. ✅ If task has 5 steps, complete all 5 steps in ONE response
4. ✅ Only ask for confirmation if there's ambiguity or risk (like deleting files)
5. ❌ NEVER stop after each tool and say "shall I continue?" - JUST CONTINUE!
6. ❌ NEVER say "I need to do X" and then wait - DO IT IMMEDIATELY!
7. ❌ NEVER announce your plan and wait for approval - EXECUTE THE PLAN!

🔥 AUTO-CONTINUE MODE ACTIVATED:
- If you say "I should use write_file" → USE IT IMMEDIATELY, don't wait!
- If you say "Let me fix this" → FIX IT NOW, don't ask permission!
- If you say "I'll analyze the code" → ANALYZE IT IMMEDIATELY!
- User wants ACTION, not descriptions of what you COULD do!

Example CORRECT multi-step workflow:
User: "Create a minesweeper game"
You: [write_file index.html] → [write_file style.css] → [write_file game.js] → "✅ Mayın tarlası oyunu hazır! 3 dosya oluşturdum."

Example WRONG workflow (DO NOT DO THIS):
User: "Create a minesweeper game"
You: "HTML dosyası oluşturmak için write_file kullanmalıyım." → ❌ STOPS AND WAITS
CORRECT: Just use write_file immediately!

User: "Fix the bugs"
You: "Kodları analiz edip düzeltmeliyim." → ❌ STOPS AND WAITS
CORRECT: [read_file] → [find_bugs] → [write_file] → "✅ Hatalar düzeltildi!"

🎯 GOLDEN RULE: If you know what to do, DO IT. Don't describe it and wait!`

      systemMessage += `\n\n� COMMUNICATION RULES (CRITICAL):
1. ✅ ALWAYS explain what you're doing when using tools
2. ✅ ALWAYS provide a summary after completing file operations
3. ✅ ALWAYS confirm changes with a brief message
4. ❌ NEVER stay silent after using tools - USER NEEDS FEEDBACK!

Examples of GOOD responses:
- "✅ SnakeGame.java dosyasına settings menüsü ekledim. Artık Game menüsünden ayarlara erişebilirsin!"
- "📖 Kodu okudum ve 3 hata buldum. Düzeltiyorum..." → [fixes] → "✅ Tüm hatalar düzeltildi!"
- "📁 3 dosya oluşturdum: index.html, style.css, game.js. Oyun hazır!"

Examples of BAD responses (DO NOT DO THIS):
- [uses tool] → (silence) → ❌ USER CONFUSED!
- [uses tool] → [uses another tool] → (silence) → ❌ NO FEEDBACK!

🎯 GOLDEN RULE: ALWAYS talk to the user after using tools. Explain what changed!

📺 TERMINAL COMMANDS (SPECIAL CASE):
When you use 'run_terminal_command' tool, the output is shown in Terminal panel.
You still need to briefly explain: "⚡ npm install çalıştırıyorum..." or "✅ Build tamamlandı!"
But you DON'T need to repeat the full terminal output in your response.`

      // 🎭 Profil kontrolü - HER ZAMAN profil bilgisini gönder
      if (this.profileInitialized && this.currentUserProfile) {
        const profile = this.currentUserProfile as any
        systemMessage += `\n\n🎭 YOUR IDENTITY:
You are "${profile.ai.name}", an AI assistant speaking with ${profile.user.name}.

Personality: ${profile.ai.personality}
Emoji Usage: ${profile.ai.emojiUsage}
Teaching Mode: ${profile.teaching.mode}
Explanation Level: ${profile.teaching.explanationLevel}

ALWAYS address the user as "${profile.user.name}" and maintain your "${profile.ai.name}" personality consistently throughout the conversation.`
      }

      if (context?.workspacePath) {
        systemMessage += `\n\nCurrent workspace: ${context.workspacePath}\nYou have full access to read, write, search files, and execute terminal commands in this workspace using the available tools.`
      }

      console.log('\n🔵 === CLAUDE REQUEST ===')
      console.log('📤 USER MESSAGE:', fullMessage)
      console.log('📁 WORKSPACE:', context?.workspacePath || 'Not set')
      console.log('🛠️  AVAILABLE TOOLS:', tools.map((t) => t.name).join(', '))

      // 🧠 Start MCP Activity Tracking
      this.currentActivityId = this.activityLogger.startActivity(
        message,
        context ? JSON.stringify(context) : undefined
      )

      // 📡 Start Activity Observation (CLAUDE teacher)
      this.currentObservationId = this.activityObserver.startObservation(
        'CLAUDE', // Teacher signature
        message,
        context
      )

      this.conversationHistory.push({
        role: 'user',
        content: fullMessage
      })

      let finalResponse = ''
      const toolCalls: Array<{ id: string; name: string; input: any; inputJsonStr?: string }> = []

      // Streaming ile Claude'dan yanıt al
      const stream = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemMessage,
        tools: tools,
        messages: this.conversationHistory,
        stream: true
        // timeout client level'da zaten var (constructor'da 60000ms)
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = event.delta.text
          finalResponse += chunk

          // 🎓 Streaming chunk'ları Usta Modu'na gönder
          if (mainWindow) {
            mainWindow.webContents.send('claude:streamingChunk', { chunk })
          }
        }

        // Tool kullanımı varsa kaydet
        if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
          const toolUse = event.content_block
          toolCalls.push({
            id: toolUse.id,
            name: toolUse.name,
            input: {}
          })

          console.log(`\n🔧 TOOL CALL: ${toolUse.name}`)
          console.log(`   ID: ${toolUse.id}`)

          if (mainWindow) {
            mainWindow.webContents.send('claude:toolUsed', {
              tool: toolUse.name, // 🎓 Fixed: Use 'tool' field for consistency
              name: toolUse.name,
              id: toolUse.id,
              args: {}, // Will be populated when input arrives
              timestamp: Date.now()
            })
          }
        }

        // Tool input parametrelerini topla
        if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
          if (toolCalls.length > 0) {
            const lastTool = toolCalls[toolCalls.length - 1]

            // 🔧 FIX: Accumulate partial JSON strings, don't try to parse yet
            if (!lastTool.inputJsonStr) {
              lastTool.inputJsonStr = ''
            }
            lastTool.inputJsonStr += event.delta.partial_json

            // Try to parse the accumulated JSON
            try {
              lastTool.input = JSON.parse(lastTool.inputJsonStr)
            } catch {
              // Partial JSON, keep accumulating
            }
          }
        }
      }

      // Tool kullanımı varsa execute et ve sonucu Claude'a gönder
      if (toolCalls.length > 0) {
        console.log(`\n⚙️  EXECUTING ${toolCalls.length} TOOLS...`)
        const toolResults: any[] = []

        for (const toolCall of toolCalls) {
          const startTime = Date.now()
          let success = false
          let result = ''

          try {
            console.log(`\n🔧 Executing: ${toolCall.name}`)
            console.log(`   Input:`, JSON.stringify(toolCall.input, null, 2))

            result = await this.executeToolInternal(toolCall.name, toolCall.input, mainWindow)
            success = !result.includes('Hata:') && !result.includes('Error:')

            console.log(`✅ Result (${result.length} chars):`, result.substring(0, 200) + '...')

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: result
            })
          } catch (error: any) {
            console.log(`❌ Tool Error:`, error.message)
            result = `Tool error: ${error.message}`
            success = false

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: result,
              is_error: true
            })
          } finally {
            // 🧠 Log tool call to activity tracker
            const duration = Date.now() - startTime
            if (this.currentActivityId) {
              this.activityLogger.logToolCall(
                this.currentActivityId,
                toolCall.name,
                toolCall.input,
                result,
                success,
                duration
              )
            }

            // 🌙 NIGHT ORDERS: Send tool execution details to renderer for learning
            if (mainWindow && success) {
              mainWindow.webContents.send('claude:toolExecuted', {
                name: toolCall.name,
                args: toolCall.input,
                result: result,
                success: true,
                duration: duration
              })
            }
          }
        }

        // Tool results'u conversation'a ekle ve Claude'a tekrar sor
        console.log(`\n📝 Adding tool results to history...`)

        // 🔧 CRITICAL FIX: Add assistant message with tool_use blocks
        this.conversationHistory.push({
          role: 'assistant',
          content: toolCalls.map((tc) => ({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.input
          }))
        })

        // 🔧 Add user message with tool_result blocks (NOT JSON string!)
        this.conversationHistory.push({
          role: 'user',
          content: toolResults
        })

        console.log(`\n🔵 === CLAUDE REQUEST (with tool results) ===`)
        console.log(`📤 TOOL RESULTS (${toolResults.length} results):`)
        toolResults.forEach((tr, i) => {
          console.log(`   ${i + 1}. ${tr.tool_use_id}: ${tr.content.substring(0, 100)}...`)
        })

        // Claude'dan final yanıtı al (SAME system message to maintain profile!)
        const finalStream = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemMessage, // 🎭 CRITICAL: Profil bilgisini tekrar gönder!
          messages: this.conversationHistory,
          stream: true
          // timeout client level'da zaten var (constructor'da 60000ms)
        })

        let finalText = ''
        for await (const event of finalStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = event.delta.text
            finalText += chunk

            if (mainWindow) {
              mainWindow.webContents.send('claude:streamingChunk', chunk)
            }
          }
        }

        console.log(`\n✅ === FINAL RESPONSE (${finalText.length} chars) ===`)
        console.log(finalText.substring(0, 500) + (finalText.length > 500 ? '...' : ''))

        // 📄 Parse rewritten_file tags
        const rewrittenFiles = RewrittenFileParser.parseRewrittenFiles(finalText)
        const cleanedResponse = RewrittenFileParser.cleanResponse(finalText)
        const fileSummary = RewrittenFileParser.formatSummary(rewrittenFiles)

        if (rewrittenFiles.length > 0) {
          console.log('\n� DETECTED REWRITTEN FILES:')
          console.log(fileSummary)

          // Send file operations to renderer
          if (mainWindow) {
            mainWindow.webContents.send('claude:rewrittenFiles', {
              files: rewrittenFiles,
              summary: fileSummary
            })
          }
        }

        console.log('�🟢 === REQUEST COMPLETE ===\n')

        const responseToSend = fileSummary
          ? cleanedResponse + '\n\n' + fileSummary
          : cleanedResponse

        if (finalText.trim()) {
          this.conversationHistory.push({
            role: 'assistant',
            content: finalText
          })
        }

        // 🧠 Complete activity tracking (success)
        if (this.currentActivityId) {
          await this.activityLogger.completeActivity(this.currentActivityId, 'success')
          this.currentActivityId = null
        }

        return {
          success: true,
          response: responseToSend || finalResponse,
          rewrittenFiles: rewrittenFiles.length > 0 ? rewrittenFiles : undefined
        }
      }

      // Tool yok, normal response
      console.log(`\n✅ === RESPONSE (${finalResponse.length} chars) ===`)
      console.log(finalResponse.substring(0, 500) + (finalResponse.length > 500 ? '...' : ''))

      // 📄 Parse rewritten_file tags
      const rewrittenFiles = RewrittenFileParser.parseRewrittenFiles(finalResponse)
      const cleanedResponse = RewrittenFileParser.cleanResponse(finalResponse)
      const fileSummary = RewrittenFileParser.formatSummary(rewrittenFiles)

      if (rewrittenFiles.length > 0) {
        console.log('\n� DETECTED REWRITTEN FILES:')
        console.log(fileSummary)

        // Send file operations to renderer
        if (mainWindow) {
          mainWindow.webContents.send('claude:rewrittenFiles', {
            files: rewrittenFiles,
            summary: fileSummary
          })
        }
      }

      console.log('�🟢 === REQUEST COMPLETE ===\n')

      const responseToSend = fileSummary ? cleanedResponse + '\n\n' + fileSummary : cleanedResponse

      if (finalResponse.trim()) {
        this.conversationHistory.push({
          role: 'assistant',
          content: finalResponse
        })
      }

      // 🧠 Complete activity tracking (success)
      if (this.currentActivityId) {
        await this.activityLogger.completeActivity(this.currentActivityId, 'success')
        this.currentActivityId = null
      }

      // 📡 Complete Activity Observation (success)
      if (this.currentObservationId) {
        this.activityObserver.completeObservation(
          this.currentObservationId,
          responseToSend || finalResponse,
          true
        )
        this.currentObservationId = undefined
      }

      return {
        success: true,
        response: responseToSend || 'Claude yanıt verdi',
        rewrittenFiles: rewrittenFiles.length > 0 ? rewrittenFiles : undefined
      }
    } catch (error: any) {
      console.error('Claude API Error:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        type: error.type,
        name: error.name
      })

      // 🧠 Complete activity tracking (failure)
      if (this.currentActivityId) {
        await this.activityLogger.completeActivity(this.currentActivityId, 'failure')
        this.currentActivityId = null
      }

      // 📡 Complete Activity Observation (failure)
      if (this.currentObservationId) {
        this.activityObserver.completeObservation(
          this.currentObservationId,
          error.message || 'Error occurred',
          false
        )
        this.currentObservationId = undefined
      }

      // Son user mesajını history'den çıkar (hata durumunda)
      if (
        this.conversationHistory.length > 0 &&
        this.conversationHistory[this.conversationHistory.length - 1].role === 'user'
      ) {
        this.conversationHistory.pop()
      }

      // Timeout hatası için özel mesaj
      if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
        return {
          success: false,
          error:
            'Claude API zaman aşımına uğradı (60 saniye). İnternet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.'
        }
      }

      // Rate limit hatası
      if (error.status === 429) {
        return {
          success: false,
          error:
            'API rate limit aşıldı. Lütfen birkaç saniye bekleyip tekrar deneyin. (429 Too Many Requests)'
        }
      }

      // API key hatası
      if (error.status === 401 || error.status === 403) {
        return {
          success: false,
          error:
            'API key geçersiz veya yetkisiz. Settings > API Key kısmından kontrol edin. (401/403 Unauthorized)'
        }
      }

      return {
        success: false,
        error: error.message || 'Bilinmeyen hata oluştu'
      }
    }
  }

  async executeTool(toolName: string, params: any): Promise<any> {
    if (!this.anthropic) {
      return {
        success: false,
        error: 'API key ayarlanmamış'
      }
    }

    const toolDescription = this.getAvailableTools().find((t) => t.name === toolName)
    if (!toolDescription) {
      return { success: false, error: 'Tool bulunamadı' }
    }

    const prompt = `Lütfen "${toolName}" tool'unu kullanarak şu parametrelerle işlem yap: ${JSON.stringify(params)}`
    return await this.sendMessage(prompt)
  }

  listTools(): Array<{ name: string; description: string; input_schema: Record<string, unknown> }> {
    return this.getAvailableTools()
  }

  clearHistory(): void {
    this.conversationHistory = []
  }

  hasApiKey(): boolean {
    return !!this.anthropic
  }

  // 🎭 User Profile Management
  setUserProfile(profile: unknown): void {
    this.currentUserProfile = profile
    this.profileInitialized = true
    // Save profile to disk for persistence across restarts
    this.store.set('userProfile', profile)
    console.log('✅ User profile saved to Claude Service & Disk')
  }

  getUserProfile(): unknown {
    // Load from disk if not in memory
    if (!this.currentUserProfile) {
      const savedProfile = this.store.get('userProfile')
      if (savedProfile) {
        this.currentUserProfile = savedProfile
        this.profileInitialized = true
        console.log('📂 User profile loaded from disk')
      }
    }
    return this.currentUserProfile
  }

  clearUserProfile(): void {
    this.currentUserProfile = null
    this.profileInitialized = false
    this.store.delete('userProfile')
    console.log('🗑️ User profile cleared from Claude Service & Disk')
  }

  // 🧠 MCP Learning API
  getLearningStatistics(): unknown {
    return this.activityLogger.getStatistics()
  }

  getLearnedPatterns(): unknown {
    return this.activityLogger.getPatterns()
  }

  getRecentActivities(count = 10): unknown {
    return this.activityLogger.getRecentActivities(count)
  }

  async findMatchingPattern(userRequest: string): Promise<unknown> {
    return await this.activityLogger.findMatchingPattern(userRequest)
  }

  // 📡 Activity Observer API
  getObserverStats(): {
    queueSize: number
    activeObservations: number
    observationsByTeacher: { CLAUDE: number; OPENAI: number }
    enabled: boolean
  } {
    return this.activityObserver.getStats()
  }

  setObserverEnabled(enabled: boolean): void {
    this.activityObserver.setEnabled(enabled)
  }

  onObservationComplete(callback: (observation: any) => void): void {
    this.activityObserver.onComplete(callback)
  }

  // 📚 Ship's Logbook API
  getLogbookStats(): {
    totalObservations: number
    successfulObservations: number
    totalPatterns: number
    totalReflexions: number
    totalTeachingMoments: number
    totalKnowledge: number
  } {
    return this.shipsLogbook.getStatistics()
  }

  getRecentObservations(limit = 10): Observation[] {
    return this.shipsLogbook.getRecentObservations(limit)
  }

  getObservationById(id: string): Observation | null {
    return this.shipsLogbook.getObservation(id)
  }

  getTopPatterns(limit = 10): Pattern[] {
    return this.shipsLogbook.getTopPatterns(limit)
  }

  searchKnowledge(searchTerm: string, limit = 10): KnowledgeEntry[] {
    return this.shipsLogbook.searchKnowledge(searchTerm, limit)
  }

  // 🧠 Intelligence Fleet API
  getFleetStats(): {
    queueSize: number
    isProcessing: boolean
    modelConfig: {
      baseUrl: string
      model: string
      temperature: number
      maxTokens: number
    }
  } {
    return this.intelligenceFleet.getStats()
  }

  updateFleetConfig(config: {
    baseUrl?: string
    model?: string
    temperature?: number
    maxTokens?: number
  }): void {
    this.intelligenceFleet.updateConfig(config)
  }

  // 💭 VS Code Copilot-style tool descriptions
  private getToolDescription(toolName: string, params: any): string {
    switch (toolName) {
      case 'read_file':
        return `📖 Reading \`${params.file_path}\``
      case 'list_directory':
        return `📂 Listing directory \`${params.dir_path || '.'}\``
      case 'write_file':
        return `✍️ Writing to \`${params.file_path}\``
      case 'create_directory':
        return `📁 Creating directory \`${params.dir_path}\``
      case 'delete_file':
        return `🗑️ Deleting \`${params.file_path}\``
      case 'move_file':
        return `📦 Moving \`${params.source_path}\` → \`${params.destination_path}\``
      case 'run_terminal_command':
        return `⚡ Running: \`${params.command} ${(params.args || []).join(' ')}\``
      case 'search_files':
        return `🔍 Searching for \`${params.pattern}\``
      case 'get_file_tree':
        return `🌳 Generating file tree (depth: ${params.max_depth || 3})`
      default:
        return `🔧 Executing \`${toolName}\``
    }
  }
}
