// Rewritten File Parser - Claude'un <rewritten_file> tag'lerini parse eder

export interface RewrittenFile {
  filePath: string
  content: string
}

export class RewrittenFileParser {
  /**
   * Parse <rewritten_file> tags from Claude's response
   * @param response Claude's text response
   * @returns Array of parsed file operations
   */
  static parseRewrittenFiles(response: string): RewrittenFile[] {
    const files: RewrittenFile[] = []

    // Regex to match <rewritten_file> blocks
    const fileRegex =
      /<rewritten_file>\s*<file_path>(.*?)<\/file_path>(?:\s*<rewritten_content>([\s\S]*?)<\/rewritten_content>)?\s*<\/rewritten_file>/gi

    let match
    while ((match = fileRegex.exec(response)) !== null) {
      const filePath = match[1].trim()
      const content = match[2]?.trim() || ''

      if (filePath) {
        files.push({
          filePath,
          content
        })
      }
    }

    console.log(`\n📄 Parsed ${files.length} rewritten file(s) from Claude's response`)
    files.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file.filePath} (${file.content.length} chars)`)
    })

    return files
  }

  /**
   * Remove <rewritten_file> tags from response for clean display
   * @param response Claude's text response
   * @returns Cleaned response
   */
  static cleanResponse(response: string): string {
    // Remove entire <rewritten_file> blocks
    let cleaned = response.replace(
      /<rewritten_file>\s*<file_path>.*?<\/file_path>(?:\s*<rewritten_content>[\s\S]*?<\/rewritten_content>)?\s*<\/rewritten_file>/gi,
      ''
    )

    // Remove any standalone tags
    cleaned = cleaned.replace(/<\/?rewritten_file>/gi, '')
    cleaned = cleaned.replace(/<\/?file_path>/gi, '')
    cleaned = cleaned.replace(/<\/?rewritten_content>/gi, '')

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()

    return cleaned
  }

  /**
   * Format file operations as a readable summary
   * @param files Parsed file operations
   * @returns Formatted summary
   */
  static formatSummary(files: RewrittenFile[]): string {
    if (files.length === 0) return ''

    const summary = ['\n📝 **Claude dosya işlemleri önerdi:**\n']

    files.forEach((file, i) => {
      const hasContent = file.content.length > 0
      const icon = hasContent ? '✏️' : '📄'
      const action = hasContent ? 'Yazılacak/güncellenecek' : 'Okunacak'

      summary.push(`${i + 1}. ${icon} \`${file.filePath}\` - ${action}`)

      if (hasContent) {
        const preview = file.content.substring(0, 100)
        const truncated = file.content.length > 100 ? '...' : ''
        summary.push(`   \`\`\`\n   ${preview}${truncated}\n   \`\`\``)
      }
    })

    summary.push('\n💡 Bu dosya işlemlerini otomatik uygulamak ister misiniz?')

    return summary.join('\n')
  }
}
