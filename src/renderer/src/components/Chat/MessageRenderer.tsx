import { useEffect, useRef } from 'react'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

interface MessageRendererProps {
  content: string
  role: 'user' | 'assistant'
}

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })
)

marked.setOptions({
  breaks: true,
  gfm: true
})

export function MessageRenderer({ content, role }: MessageRendererProps): React.JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current && role === 'assistant') {
      // Parse markdown
      const html = marked.parse(content) as string
      contentRef.current.innerHTML = html

      // Add copy buttons to code blocks
      const codeBlocks = contentRef.current.querySelectorAll('pre code')
      codeBlocks.forEach((block) => {
        const pre = block.parentElement
        if (pre && !pre.querySelector('.code-block-header')) {
          const wrapper = document.createElement('div')
          wrapper.className = 'code-block-wrapper'

          const header = document.createElement('div')
          header.className = 'code-block-header'

          // Detect language
          const classes = block.className.split(' ')
          const langClass = classes.find((c) => c.startsWith('language-'))
          const lang = langClass ? langClass.replace('language-', '') : 'plaintext'

          const langLabel = document.createElement('span')
          langLabel.className = 'code-language'
          langLabel.textContent = lang

          const copyBtn = document.createElement('button')
          copyBtn.className = 'code-copy-btn'
          copyBtn.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
          copyBtn.title = 'Kodu Kopyala'

          copyBtn.addEventListener('click', async () => {
            const code = block.textContent || ''
            await navigator.clipboard.writeText(code)

            // Show feedback
            copyBtn.innerHTML =
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            copyBtn.classList.add('copied')

            setTimeout(() => {
              copyBtn.innerHTML =
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
              copyBtn.classList.remove('copied')
            }, 2000)
          })

          header.appendChild(langLabel)
          header.appendChild(copyBtn)

          // Wrap pre element
          pre.parentNode?.insertBefore(wrapper, pre)
          wrapper.appendChild(header)
          wrapper.appendChild(pre)
        }
      })

      // Add copy buttons to inline code
      const inlineCodes = contentRef.current.querySelectorAll('p > code, li > code')
      inlineCodes.forEach((code) => {
        if (!code.parentElement?.classList.contains('inline-code-wrapper')) {
          const wrapper = document.createElement('span')
          wrapper.className = 'inline-code-wrapper'

          const copyBtn = document.createElement('button')
          copyBtn.className = 'inline-code-copy'
          copyBtn.innerHTML =
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
          copyBtn.title = 'Kopyala'

          copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await navigator.clipboard.writeText(code.textContent || '')
            copyBtn.innerHTML =
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            setTimeout(() => {
              copyBtn.innerHTML =
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
            }, 1500)
          })

          code.parentNode?.insertBefore(wrapper, code)
          wrapper.appendChild(code)
          wrapper.appendChild(copyBtn)
        }
      })
    } else if (contentRef.current && role === 'user') {
      // User messages are plain text
      contentRef.current.textContent = content
    }
  }, [content, role])

  return <div ref={contentRef} className="message-markdown" />
}
