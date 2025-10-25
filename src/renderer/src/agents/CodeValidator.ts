/**
 * Code Validator & File Writer
 * Generation Discipline System - Layer 4
 *
 * Responsibilities:
 * 1. Parse AI-generated code blocks
 * 2. Validate syntax and structure
 * 3. Extract file paths and content
 * 4. Write files using Tool Bridge
 * 5. Handle multi-file generations
 */

import type { ToolBridgeAPI } from '../../../shared/toolBridge'

export interface CodeBlock {
  language: string
  filepath?: string
  content: string
  startLine: number
  endLine: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  blocks: CodeBlock[]
}

export interface WriteResult {
  success: boolean
  filesWritten: string[]
  errors: Array<{ file: string; error: string }>
  warnings: string[]
}

export interface ValidateAndWriteResult {
  valid: boolean
  success: boolean
  blocks: CodeBlock[]
  filesWritten: string[]
  errors: Array<{ file: string; error: string }>
  warnings: string[]
}

export class CodeValidator {
  private ide: ToolBridgeAPI

  constructor(ide: ToolBridgeAPI) {
    this.ide = ide
  }

  /**
   * Parse markdown response and extract code blocks
   */
  parseCodeBlocks(markdown: string): CodeBlock[] {
    const blocks: CodeBlock[] = []
    const lines = markdown.split('\n')

    let inCodeBlock = false
    let currentBlock: Partial<CodeBlock> | null = null
    let lineNumber = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      lineNumber = i + 1

      // Start of code block: ```language filepath
      const startMatch = line.match(/^```(\w+)(?:\s+(.+))?/)
      if (startMatch && !inCodeBlock) {
        inCodeBlock = true
        currentBlock = {
          language: startMatch[1],
          filepath: startMatch[2]?.trim(),
          content: '',
          startLine: lineNumber
        }
        continue
      }

      // End of code block: ```
      if (line.trim() === '```' && inCodeBlock && currentBlock) {
        currentBlock.endLine = lineNumber
        blocks.push(currentBlock as CodeBlock)
        inCodeBlock = false
        currentBlock = null
        continue
      }

      // Inside code block - accumulate content
      if (inCodeBlock && currentBlock) {
        currentBlock.content += (currentBlock.content ? '\n' : '') + line
      }
    }

    return blocks
  }

  /**
   * Validate extracted code blocks
   */
  validate(markdown: string): ValidationResult {
    const blocks = this.parseCodeBlocks(markdown)
    const errors: string[] = []
    const warnings: string[] = []

    // Check if we have any code blocks
    if (blocks.length === 0) {
      warnings.push('No code blocks found in response')
    }

    // Validate each block
    for (const block of blocks) {
      // Check for empty content
      if (!block.content.trim()) {
        errors.push(`Empty code block at line ${block.startLine}`)
        continue
      }

      // Check for filepath (required for file writing)
      if (!block.filepath) {
        warnings.push(
          `Code block at line ${block.startLine} has no filepath - cannot write to disk`
        )
      }

      // Basic syntax validation
      const syntaxIssues = this.validateSyntax(block)
      if (syntaxIssues.length > 0) {
        warnings.push(
          `Potential syntax issues in ${block.filepath || 'unnamed file'}: ${syntaxIssues.join(', ')}`
        )
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      blocks: blocks.filter((b) => b.filepath) // Only return blocks with filepaths
    }
  }

  /**
   * Basic syntax validation (placeholder implementations)
   */
  private validateSyntax(block: CodeBlock): string[] {
    const issues: string[] = []

    // Check for common placeholders that shouldn't be in production code
    const placeholders = ['TODO:', 'FIXME:', 'XXX:', 'PLACEHOLDER', 'your-']
    for (const placeholder of placeholders) {
      if (block.content.includes(placeholder)) {
        issues.push(`Contains placeholder: ${placeholder}`)
      }
    }

    // Check for unclosed brackets/braces
    const openBraces = (block.content.match(/\{/g) || []).length
    const closeBraces = (block.content.match(/\}/g) || []).length
    if (openBraces !== closeBraces) {
      issues.push(`Mismatched braces: ${openBraces} open, ${closeBraces} close`)
    }

    const openBrackets = (block.content.match(/\[/g) || []).length
    const closeBrackets = (block.content.match(/\]/g) || []).length
    if (openBrackets !== closeBrackets) {
      issues.push(`Mismatched brackets: ${openBrackets} open, ${closeBrackets} close`)
    }

    const openParens = (block.content.match(/\(/g) || []).length
    const closeParens = (block.content.match(/\)/g) || []).length
    if (openParens !== closeParens) {
      issues.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`)
    }

    return issues
  }

  /**
   * Write validated code blocks to filesystem
   */
  async writeFiles(blocks: CodeBlock[], workspaceRoot: string): Promise<WriteResult> {
    const filesWritten: string[] = []
    const errors: Array<{ file: string; error: string }> = []
    const warnings: string[] = []

    for (const block of blocks) {
      if (!block.filepath) {
        warnings.push(`Skipping block without filepath at line ${block.startLine}`)
        continue
      }

      try {
        // Resolve full path
        const fullPath = this.resolveFilePath(block.filepath, workspaceRoot)

        // Create directory if needed
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'))
        await this.ensureDirectory(dirPath)

        // Write file
        const writeResult = await this.ide.fs.writeFile(fullPath, block.content)

        if (!writeResult.success) {
          errors.push({
            file: block.filepath,
            error: writeResult.error || 'Unknown write error'
          })
        } else {
          filesWritten.push(block.filepath)
        }
      } catch (error) {
        errors.push({
          file: block.filepath,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return {
      success: errors.length === 0,
      filesWritten,
      errors,
      warnings
    }
  }

  /**
   * Resolve relative file path to absolute
   */
  private resolveFilePath(filepath: string, workspaceRoot: string): string {
    // Remove leading ./
    const cleaned = filepath.replace(/^\.\//, '')

    // If already absolute, return as-is
    if (cleaned.startsWith('/') || /^[A-Za-z]:/.test(cleaned)) {
      return cleaned
    }

    // Join with workspace root
    return `${workspaceRoot}/${cleaned}`.replace(/\\/g, '/')
  }

  /**
   * Ensure directory exists (create if needed)
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    const existsResult = await this.ide.fs.exists(dirPath)

    if (!existsResult.success || !existsResult.data) {
      // Directory doesn't exist - create it
      const createResult = await this.ide.fs.createDirectory(dirPath)

      if (!createResult.success) {
        throw new Error(`Failed to create directory ${dirPath}: ${createResult.error}`)
      }
    }
  }

  /**
   * Validate and write in one step (convenience method)
   */
  async validateAndWrite(markdown: string, workspaceRoot: string): Promise<ValidateAndWriteResult> {
    // Step 1: Validate
    const validation = this.validate(markdown)

    if (!validation.valid) {
      return {
        valid: false,
        success: false,
        blocks: validation.blocks,
        filesWritten: [],
        errors: validation.errors.map((e) => ({ file: 'validation', error: e })),
        warnings: validation.warnings
      }
    }

    // Step 2: Write files
    const writeResult = await this.writeFiles(validation.blocks, workspaceRoot)

    return {
      valid: validation.valid,
      success: writeResult.success,
      blocks: validation.blocks,
      filesWritten: writeResult.filesWritten,
      errors: writeResult.errors,
      warnings: [...validation.warnings, ...writeResult.warnings]
    }
  }
}
