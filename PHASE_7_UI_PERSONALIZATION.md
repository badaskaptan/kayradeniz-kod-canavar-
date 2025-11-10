# 🎨 PHASE 7: UI PERSONALIZATION & ACCESSIBILITY

**Priority**: LOW (After all core features complete)  
**Timeline**: Pre-production polish (1-2 weeks)  
**Goal**: Make LUMA appealing and accessible to ALL age groups and abilities

---

## 🎯 **Vision**

Transform LUMA from a technical tool to a **personalized companion** that adapts to:

- ✅ **Age groups** (13-17 anime, 18-30 modern, 30+ professional)
- ✅ **Accessibility needs** (blind, visually impaired, motor disabilities)
- ✅ **Personal preferences** (themes, characters, voices)

---

## 👥 **Target Personas**

### **1. Teenage Developers (13-17)** 🎮

**Personality**: Playful, creative, visual learners

**Theme Options**:

```typescript
const teenThemes = {
  anime: {
    name: 'Anime Studio',
    characters: [
      'Genshin Impact style AI companions',
      'SpongeBob SquarePants assistants',
      'Anime wings/effects on UI elements',
      'Chibi characters for Usta Modu teacher'
    ],
    colors: 'Bright, saturated (pink, cyan, purple)',
    fonts: 'Playful, rounded (Comic Sans alternatives)',
    sounds: 'Anime sound effects (achievement dings, etc.)'
  },

  gaming: {
    name: 'Gaming HUD',
    style: 'Cyberpunk 2077, Valorant UI',
    effects: 'Glowing edges, neon accents',
    animations: 'Fast transitions, particle effects'
  },

  kawaii: {
    name: 'Kawaii Coding',
    mascot: 'Cute AI pet that reacts to code quality',
    stickers: 'Reward stickers for completed tasks',
    emojis: 'Everywhere! 🎉🚀✨'
  }
}
```

**Features**:

- 🎭 **Character Companions**: AI assistant appears as anime character
- 🏆 **Gamification**: XP, levels, achievements
- 🎵 **Sound Effects**: Fun feedback sounds
- 🎨 **Customizable**: Change character, theme, colors

---

### **2. Young Professionals (18-30)** 💼

**Personality**: Efficient, modern, minimalist

**Theme Options**:

```typescript
const youngProfessionalThemes = {
  modern: {
    name: 'Modern Dark',
    style: 'VS Code, Linear, Notion-like',
    colors: 'Muted grays, accent colors',
    typography: 'San Francisco, Inter, Roboto'
  },

  gradients: {
    name: 'Gradient Flow',
    backgrounds: 'Subtle animated gradients',
    glassmorphism: 'Frosted glass effects',
    modern: 'Tailwind CSS vibes'
  },

  minimal: {
    name: 'Pure Focus',
    style: 'Ultra minimal, distraction-free',
    colors: 'Monochrome with single accent',
    animations: 'Subtle, purposeful'
  }
}
```

---

### **3. Senior Developers (30+)** 🎓

**Personality**: Professional, no-nonsense, productivity-focused

**Theme Options**:

```typescript
const seniorThemes = {
  professional: {
    name: 'Professional Dark/Light',
    style: 'Clean, corporate, readable',
    colors: 'Conservative palette',
    density: 'Information-dense UI'
  },

  classic: {
    name: 'Classic IDE',
    style: 'IntelliJ IDEA, Eclipse-like',
    panels: 'Traditional layout',
    fonts: 'Monospace, high contrast'
  },

  executive: {
    name: 'Executive Dashboard',
    style: 'Data-focused, charts, metrics',
    layout: 'Dashboard-style overview',
    reports: 'Progress tracking, analytics'
  }
}
```

---

## 🎨 **Theme System Architecture**

### **Implementation**

```typescript
// src/renderer/src/themes/themeRegistry.ts

interface Theme {
  id: string
  name: string
  targetAge: '13-17' | '18-30' | '30+' | 'all'
  accessibility: 'standard' | 'high-contrast' | 'voice-optimized'

  // Visual
  colors: ColorPalette
  typography: Typography
  spacing: Spacing

  // Interactive
  animations: AnimationConfig
  sounds: SoundConfig
  haptics?: HapticConfig

  // Character/Mascot
  mascot?: {
    type: 'anime' | 'professional' | 'abstract'
    character: string
    expressions: string[]
    animations: string[]
  }

  // SVG Backgrounds
  backgrounds: {
    default: string
    success: string
    error: string
    loading: string
  }
}

// Example: Anime Theme
const genshinTheme: Theme = {
  id: 'genshin-impact',
  name: 'Genshin Impact',
  targetAge: '13-17',
  accessibility: 'standard',

  colors: {
    primary: '#4A90E2', // Paimon blue
    secondary: '#FFB74D', // Gold
    success: '#66BB6A',
    error: '#EF5350',
    background: '#1A1A2E',
    surface: '#16213E'
  },

  mascot: {
    type: 'anime',
    character: 'AI-mon', // Paimon-inspired
    expressions: ['happy', 'thinking', 'excited', 'confused', 'proud'],
    animations: ['idle', 'wave', 'celebrate', 'explain', 'code']
  },

  sounds: {
    success: 'achievement-unlock.mp3',
    error: 'oops.mp3',
    notification: 'ding.mp3',
    typing: 'keyboard-click.mp3'
  }
}
```

---

## 🔊 **Voice Mode (Accessibility Feature)**

### **Why Voice Mode?**

Makes LUMA accessible to:

- 👁️ **Blind users** - Complete voice navigation
- 👓 **Visually impaired** - Reduce screen time
- 🚗 **Multitaskers** - Code while walking/driving
- 💪 **Motor disabilities** - Hands-free coding

### **Architecture**

```typescript
// src/renderer/src/services/voiceService.ts

class VoiceService {
  // Speech-to-Text (User → AI)
  private recognition: SpeechRecognition

  // Text-to-Speech (AI → User)
  private synthesis: SpeechSynthesis

  async startListening() {
    this.recognition.start()
    // User speaks: "Create a new React component called UserProfile"
  }

  async speak(text: string, options: VoiceOptions) {
    const utterance = new SpeechSynthesisUtterance(text)

    // Voice selection
    utterance.voice = this.selectVoice(options.character)

    // Age-appropriate voice
    if (options.targetAge === '13-17') {
      utterance.pitch = 1.2 // Higher, energetic
      utterance.rate = 1.1 // Faster
    } else if (options.targetAge === '30+') {
      utterance.pitch = 0.9 // Lower, professional
      utterance.rate = 0.95 // Measured
    }

    this.synthesis.speak(utterance)
  }

  // Usta Modu voice teaching
  async teachWithVoice(lesson: Lesson) {
    await this.speak(lesson.introduction)

    // Code explanation with voice
    await this.speak('Let me explain this code step by step...')

    for (const step of lesson.steps) {
      await this.speak(step.explanation)
      await this.highlightCode(step.codeRange) // Visual + audio
      await this.pause(2000) // Let user process
    }

    await this.speak("Do you understand? Say 'yes' to continue or 'explain again'.")
  }
}
```

### **Voice Commands**

```typescript
const voiceCommands = {
  // Navigation
  'show settings': () => openSettings(),
  'switch to Claude': () => selectAI('claude'),
  'switch to GPT': () => selectAI('openai'),
  'enable agent mode': () => toggleAgentMode(true),

  // Coding
  'create new file': () => createFile(),
  'refactor this function': () => refactorSelection(),
  'explain this code': () => explainCode(),
  'run tests': () => runTests(),

  // Usta Modu
  'teach me': () => enableUstaModu(),
  'what did I do wrong': () => explainError(),
  'show best practices': () => showBestPractices(),

  // Accessibility
  'read screen': () => readEntireScreen(),
  'describe UI': () => describeCurrentUI(),
  'what can I do here': () => listAvailableActions()
}
```

---

## 🎭 **Character System**

### **Anime Companions (13-17)**

```typescript
interface AnimeCompanion {
  name: string
  personality: string
  voiceType: 'energetic' | 'calm' | 'funny' | 'wise'

  // Visual
  idle: string // SVG/GIF animation
  reactions: {
    codeSuccess: string // "✨ Amazing code!"
    codeError: string // "🤔 Hmm, let's fix this"
    thinking: string // Animated thinking bubble
    celebrating: string // Party animation
  }

  // Voice lines
  greetings: string[]
  encouragement: string[]
  tips: string[]
}

const companions = {
  aimon: {
    name: 'AI-mon',
    personality: 'Helpful, enthusiastic, slightly mischievous',
    voiceType: 'energetic',

    greetings: [
      'Hey there, coding buddy! Ready to create something amazing?',
      'Ooh, what are we building today? 🌟',
      "AI-mon reporting for duty! Let's code!"
    ],

    encouragement: [
      "You're doing great! Keep going! 💪",
      "Wow, that's a smart solution! ✨",
      'I knew you could figure it out! 🎉'
    ],

    reactions: {
      codeSuccess: 'animated-celebration.gif',
      codeError: 'thinking-pose.gif',
      thinking: 'loading-circle.gif',
      celebrating: 'fireworks.gif'
    }
  },

  sensei: {
    name: 'Code Sensei',
    personality: 'Wise, patient, encouraging',
    voiceType: 'calm',

    greetings: [
      'Welcome, young developer. What shall we learn today?',
      'The path to mastery begins with a single line of code.',
      'Ready to grow your skills?'
    ]
  }
}
```

---

## 🖼️ **SVG Background System**

### **Dynamic Backgrounds**

```typescript
// src/renderer/src/backgrounds/backgroundEngine.ts

class BackgroundEngine {
  backgrounds = {
    // Anime themes
    anime: {
      default: 'floating-islands.svg',
      coding: 'code-rain-matrix.svg',
      success: 'starry-sky.svg',
      error: 'stormy-clouds.svg'
    },

    // Professional themes
    professional: {
      default: 'subtle-grid.svg',
      coding: 'circuit-board.svg',
      success: 'green-checkmarks.svg',
      error: 'red-alert.svg'
    },

    // Abstract themes
    abstract: {
      default: 'geometric-shapes.svg',
      coding: 'flowing-particles.svg',
      success: 'blooming-flower.svg',
      error: 'breaking-glass.svg'
    }
  }

  // Animated SVG backgrounds
  async animateBackground(state: AppState) {
    if (state.coding) {
      return this.backgrounds[theme].coding // Animated code rain
    }

    if (state.success) {
      return this.backgrounds[theme].success // Celebration animation
    }

    return this.backgrounds[theme].default // Calm, ambient
  }
}
```

### **Example SVG Backgrounds**

**For Teens (Anime)**:

- Floating anime-style islands
- Genshin Impact landscape panoramas
- SpongeBob underwater Bikini Bottom
- Anime character silhouettes
- Particle effects (sparkles, stars)

**For Professionals**:

- Subtle geometric patterns
- Minimalist gradients
- Abstract data visualizations
- Circuit board designs
- Code-inspired fractals

---

## ♿ **Accessibility Features**

### **1. Screen Reader Optimization**

```typescript
class AccessibilityService {
  // Comprehensive screen descriptions
  describeScreen() {
    return `
      You are in the Code Editor.
      Current file: ${this.currentFile}
      Line ${this.cursorLine}, Column ${this.cursorColumn}
      ${this.codeContext}
      
      Available actions:
      - Say "edit" to modify code
      - Say "run" to execute
      - Say "explain" for AI help
    `
  }

  // Real-time code reading
  readCodeLine(line: number) {
    const code = this.getLine(line)
    const explanation = this.explainCodeLine(code)

    return `${code}. This means: ${explanation}`
  }
}
```

### **2. High Contrast Modes**

```typescript
const accessibilityThemes = {
  highContrast: {
    background: '#000000',
    text: '#FFFFFF',
    accent: '#FFFF00', // Yellow for maximum visibility
    border: '#FFFFFF',
    contrast: 21 // WCAG AAA compliance
  },

  largeText: {
    baseFontSize: '20px', // 125% larger
    monospaceFontSize: '18px',
    lineHeight: 1.8
  },

  reducedMotion: {
    animations: 'none',
    transitions: 'instant',
    respectSystemPreference: true
  }
}
```

### **3. Keyboard Navigation**

```typescript
const keyboardShortcuts = {
  // Everything accessible via keyboard
  'Ctrl+Shift+V': 'Enable voice mode',
  'Ctrl+Shift+A': 'Read screen aloud',
  'Ctrl+Shift+E': 'Explain current code',
  'Alt+T': 'Cycle themes',
  'Alt+C': 'Cycle companions',
  'Alt+B': 'Change background'
}
```

---

## 🎯 **Implementation Plan**

### **Phase 7.1: Theme System** (3 days)

```typescript
// Day 1: Core theme engine
- ThemeRegistry (register/load themes)
- ThemeProvider (React context)
- CSS variable injection
- Theme switcher UI

// Day 2: Pre-built themes
- 3 anime themes (Genshin, SpongeBob, Wings)
- 3 professional themes (Modern, Classic, Executive)
- 2 minimal themes (Light, Dark)

// Day 3: Customization UI
- Color picker
- Font selector
- Spacing adjuster
- Preview panel
```

### **Phase 7.2: Character System** (2 days)

```typescript
// Day 1: Character engine
- Character registry
- Animation system
- Reaction triggers
- SVG/GIF loader

// Day 2: Companions
- 3 anime companions (AI-mon, Cyber-pet, Code-chan)
- 2 professional assistants (Sensei, Mentor)
- Integration with Usta Modu
```

### **Phase 7.3: Voice Mode** (4 days)

```typescript
// Day 1-2: Speech recognition
- Web Speech API integration
- Command parsing
- Continuous listening mode
- Wake word detection

// Day 3-4: Text-to-Speech
- Voice synthesis
- Age-appropriate voices
- Usta Modu voice teaching
- Code reading with context
```

### **Phase 7.4: SVG Backgrounds** (2 days)

```typescript
// Day 1: Background engine
- SVG loader/renderer
- Animation system
- State-based switching

// Day 2: Create backgrounds
- 10+ unique SVG backgrounds
- Animated variations
- Theme integration
```

### **Phase 7.5: Accessibility** (3 days)

```typescript
// Day 1: Screen reader
- Comprehensive descriptions
- Code context reading
- Navigation announcements

// Day 2: High contrast
- WCAG AAA compliance
- Large text mode
- Reduced motion

// Day 3: Keyboard navigation
- Every feature accessible
- Shortcut customization
- Focus indicators
```

---

## 📊 **Success Metrics**

### **Personalization**

- ✅ 8+ unique themes available
- ✅ 5+ character companions
- ✅ 100% customizable colors
- ✅ User can save preferences

### **Accessibility**

- ✅ WCAG AAA compliance
- ✅ 100% keyboard navigable
- ✅ Screen reader tested
- ✅ Voice mode functional

### **Appeal**

- ✅ Positive feedback from 13-17 age group
- ✅ Professional appearance for seniors
- ✅ Blind user successfully codes
- ✅ Fun + productive balance

---

## 🎨 **Visual Mockups (To Create)**

### **Anime Theme Examples**

```
┌─────────────────────────────────────┐
│  🎮 LUMA - Genshin Impact Theme    │
│                                     │
│  [AI-mon Avatar]  "Ready to code!" │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   // Code here...           │   │
│  │   const hero = 'Aether'     │   │
│  │                             │   │
│  │   [Floating islands BG]     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ⭐ XP: 1,250 | Level 15 | 🏆 25   │
└─────────────────────────────────────┘
```

### **Professional Theme**

```
┌─────────────────────────────────────┐
│  LUMA Development Environment       │
│  ─────────────────────────────────  │
│                                     │
│  ├─ src/                            │
│  │  ├─ components/                  │
│  │  └─ services/                    │
│                                     │
│  [Clean grid background]            │
│                                     │
│  Metrics: 127 tasks | 94% quality   │
└─────────────────────────────────────┘
```

---

## � **Context Menu - "Explain with Usta Modu"** 🆕

### **Feature Request**

User-requested feature: Right-click on selected code → Get detailed Usta Modu explanation

**User Story**:

> "I'm reading code in the editor. I highlight a complex function, right-click, and select 'Explain with Usta Modu'. The Usta Modu panel opens with a complete breakdown of what that code does, why it's written that way, and alternative approaches."

### **Implementation**

```typescript
// Monaco Editor context menu integration

editor.addAction({
  id: 'usta-modu-explain-code',
  label: '📚 Explain with Usta Modu',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Shift | monaco.KeyCode.KEY_E],
  contextMenuGroupId: '1_modification',
  contextMenuOrder: 1.5,

  precondition: 'editorHasSelection',

  run: async (editor) => {
    const selection = editor.getSelection()
    const model = editor.getModel()
    const selectedCode = model.getValueInRange(selection)

    const context = {
      code: selectedCode,
      fileName: model.uri.path,
      language: model.getLanguageId(),
      startLine: selection.startLineNumber,
      endLine: selection.endLineNumber,

      // Surrounding context for better explanation
      beforeCode: model.getValueInRange({
        startLineNumber: Math.max(1, selection.startLineNumber - 5),
        startColumn: 1,
        endLineNumber: selection.startLineNumber - 1,
        endColumn: 999
      }),
      afterCode: model.getValueInRange({
        startLineNumber: selection.endLineNumber + 1,
        startColumn: 1,
        endLineNumber: Math.min(model.getLineCount(), selection.endLineNumber + 5),
        endColumn: 999
      })
    }

    // Open Usta Modu panel with explanation
    await ustaModuService.explainCode(context)
  }
})
```

### **Usta Modu Explanation UI**

```tsx
<UstaModuExplanationPanel>
  {/* Code Display */}
  <CodePreview language={context.language} code={context.code} />

  {/* Quick Summary */}
  <Section title="📝 What is this?">
    <p>{explanation.summary}</p>
  </Section>

  {/* Line-by-Line Breakdown */}
  <Section title="🔍 Line by Line" collapsible>
    {explanation.lines.map((line, i) => (
      <LineExplanation key={i} line={line.code} explanation={line.meaning} />
    ))}
  </Section>

  {/* Purpose & Context */}
  <Section title="🎯 Why does this exist?">
    <p>{explanation.purpose}</p>
  </Section>

  {/* Technical Details */}
  <Section title="⚙️ How it works">
    <p>{explanation.mechanics}</p>
    {explanation.patterns.length > 0 && <PatternList patterns={explanation.patterns} />}
  </Section>

  {/* Alternative Approaches */}
  <Section title="🔀 Other ways to do this">
    {explanation.alternatives.map((alt) => (
      <Alternative
        key={alt.id}
        title={alt.name}
        description={alt.description}
        code={alt.codeExample}
        pros={alt.pros}
        cons={alt.cons}
      />
    ))}
  </Section>

  {/* Best Practices */}
  <Section title="✅ What's done well">
    <CheckList items={explanation.strengths} />
  </Section>

  {/* Improvements */}
  <Section title="💡 Could be improved">
    <SuggestionList items={explanation.improvements} />
  </Section>

  {/* Related Concepts */}
  <Section title="🔗 Learn more">
    <ConceptLinks concepts={explanation.relatedTopics} />
  </Section>

  {/* Difficulty Badge */}
  <DifficultyBadge level={explanation.difficulty} />
</UstaModuExplanationPanel>
```

### **Backend Service**

```typescript
// src/renderer/src/services/ustaModuExplanationService.ts

class UstaModuExplanationService {
  async explainCode(context: CodeContext): Promise<CodeExplanation> {
    // 🎯 CRITICAL: Context-Aware Analysis (NOT Generic Explanations!)

    // Extract full file context for real usage analysis
    const fileContent = await fileSystem.readFile(context.fileName)
    const lines = fileContent.split('\n')

    // Find all references to variables/functions in selected code
    const codeTokens = this.extractIdentifiers(context.code)
    const references = this.findReferences(fileContent, codeTokens, context.startLine)

    // Build actual usage flow
    const usageFlow = this.buildUsageFlow(fileContent, context.startLine, references)

    // Use Ollama (Intelligence Fleet model) for CONTEXT-AWARE analysis
    const prompt = `
      You are Usta Modu, a patient and thorough coding teacher.
      
      🎯 CRITICAL INSTRUCTIONS:
      - DO NOT give generic explanations
      - MUST scan the file context to see HOW this code is used
      - MUST find all places where these variables/functions are referenced
      - MUST show the execution flow with actual line numbers
      - MUST detect context-specific problems (closures, stale state, etc.)
      - MUST give SPECIFIC improvements for THIS usage, not general advice
      
      FILE: ${context.fileName}
      LANGUAGE: ${context.language}
      SELECTED LINES: ${context.startLine}-${context.endLine}

      SELECTED CODE:
      \`\`\`${context.language}
      ${context.code}
      \`\`\`

      CONTEXT BEFORE (lines ${context.startLine - 5}-${context.startLine - 1}):
      \`\`\`${context.language}
      ${context.beforeCode}
      \`\`\`

      CONTEXT AFTER (lines ${context.endLine + 1}-${context.endLine + 5}):
      \`\`\`${context.language}
      ${context.afterCode}
      \`\`\`

      USAGE ANALYSIS:
      ${usageFlow.map((ref) => `Line ${ref.line}: ${ref.context}`).join('\n')}

      EXAMPLE OF GOOD CONTEXT-AWARE ANALYSIS:
      ❌ BAD (Generic): "Bu fonksiyon isOpen state'ini toggle ediyor. Boolean değerler true/false arasında geçiş yapar."
      ✅ GOOD (Context-Aware): "Bu handleClick line 734'te çağrılıyor ve isOpen state'ini toggle ediyor. Ancak line 820'de başka bir handleSidebarToggle da var ve ikisi de aynı state'i değiştiriyor. Line 734: drawer açılıyor → Line 820: sidebar toggle → Line 734: drawer tekrar açılıyor. Bu conflict yaratıyor çünkü ikisi de closure'da eski isOpen değerini görüyor. FIX: setIsOpen(prev => !prev) kullan veya iki ayrı state yap (isDrawerOpen, isSidebarOpen)."

      KEY DIFFERENCES (Context-Aware vs Generic):
      1. Context Scanning: ✅ Scans file, finds line 820 conflict | ❌ Only sees selected code
      2. Usage Tracking: ✅ Shows execution flow (734→820→734) | ❌ No flow analysis
      3. Flow Explanation: ✅ "drawer açılıyor → sidebar toggle → drawer tekrar" | ❌ Just "toggles state"
      4. Problem Detection: ✅ Finds closure stale state bug | ❌ Doesn't detect issues
      5. Specific Advice: ✅ "Use setIsOpen(prev => !prev)" or split state | ❌ Generic "use useState properly"

      Provide CONTEXT-AWARE analysis:
      1. Summary: What this code does IN THIS FILE (reference actual line numbers)
      2. Usage Flow: Show execution path with line numbers (e.g., "Line 734 → Line 820 → Line 950")
      3. Context-Specific Problems: Issues that exist BECAUSE of how it's used here
      4. Specific Improvements: Fixes for THIS code, not general advice
      5. Line-by-line breakdown with references to OTHER lines where these are used
      6. Purpose in THIS codebase (not generic purpose)
      7. How it interacts with OTHER code in this file
      8. Patterns used (with examples from THIS file)
      9. 2-3 alternative approaches that FIT THIS CONTEXT
      10. Related code sections (actual line numbers)

      Format as JSON:
      {
        "summary": "Context-aware summary with line references",
        "usageFlow": ["Line 734: ...", "Line 820: ...", "Line 950: ..."],
        "contextProblems": ["Closure stale state (line 734 + 820)", "..."],
        "specificImprovements": ["setIsOpen(prev => !prev) in both handlers", "..."],
        "lines": [{"code": "...", "meaning": "...", "usedIn": ["line 734", "line 820"]}],
        "purpose": "Purpose in THIS codebase with examples",
        "mechanics": "How it works WITH other code (reference lines)",
        "patterns": ["Pattern with example from lines X-Y"],
        "alternatives": [
          {
            "name": "...",
            "description": "Why this fits THIS context",
            "codeExample": "...",
            "pros": ["Specific to this usage"],
            "cons": ["Considering this codebase"]
          }
        ],
        "strengths": ["What works well IN THIS CODE"],
        "improvements": ["Specific fixes for issues found"],
        "relatedCodeSections": ["Lines 734-750: where used", "Lines 820-835: conflict"],
        "difficulty": "intermediate"
      }
    `

    const response = await ollamaService.chat({
      model: intelligenceFleetModel, // User's selected model
      prompt,
      temperature: 0.3, // Precise explanations
      maxTokens: 2000
    })

    return JSON.parse(response)
  }

  // Extract variable/function identifiers
  private extractIdentifiers(code: string): string[] {
    const regex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g
    const matches = code.match(regex) || []
    return [...new Set(matches)] // Unique tokens
  }

  // Find all references in file
  private findReferences(fileContent: string, tokens: string[], excludeLine: number): Reference[] {
    const lines = fileContent.split('\n')
    const references: Reference[] = []

    lines.forEach((line, idx) => {
      if (idx + 1 === excludeLine) return // Skip selected line
      tokens.forEach((token) => {
        if (line.includes(token)) {
          references.push({
            line: idx + 1,
            token,
            context: line.trim()
          })
        }
      })
    })

    return references
  }

  // Build execution flow
  private buildUsageFlow(
    fileContent: string,
    startLine: number,
    references: Reference[]
  ): UsageFlow[] {
    // Sort references by line number to show execution order
    return references
      .sort((a, b) => a.line - b.line)
      .map((ref) => ({
        line: ref.line,
        context: ref.context,
        relation: ref.line < startLine ? 'before' : 'after'
      }))
  }

  // Quick explanation (no AI, fallback)
  basicExplanation(context: CodeContext): CodeExplanation {
    return {
      summary: `This is ${context.language} code (${context.endLine - context.startLine + 1} lines)`,
      usageFlow: [],
      contextProblems: [],
      specificImprovements: ['Configure Ollama model for context-aware analysis'],
      lines: [],
      purpose: 'Code analysis requires Ollama model configuration',
      mechanics: 'Enable Intelligence Fleet in Settings to get detailed explanations',
      patterns: [],
      alternatives: [],
      strengths: [],
      improvements: ['Configure Ollama model for AI-powered explanations'],
      relatedCodeSections: [],
      difficulty: 'unknown'
    }
  }
}
```

### **Integration Points**

1. **Monaco Editor**: Context menu action
2. **Usta Modu Panel**: UI display component
3. **Ollama Service**: AI explanation generation
4. **Intelligence Fleet**: Uses configured model
5. **Keyboard Shortcut**: `Ctrl+Shift+E` for quick access

### **Success Criteria**

- [ ] Right-click context menu shows "Explain with Usta Modu"
- [ ] Keyboard shortcut works (`Ctrl+Shift+E`)
- [ ] Selected code properly extracted with context
- [ ] Usta Modu panel opens smoothly
- [ ] Explanation generated by Ollama (if available)
- [ ] Fallback to basic mode if no model configured
- [ ] Line-by-line breakdown clear and helpful
- [ ] Alternative approaches shown with examples
- [ ] UI responsive and well-formatted
- [ ] Copy code examples button works

---

## �💡 **Future Enhancements**

### **AR/VR Mode**

- Code in 3D space
- Virtual companion appears in real room
- Gesture controls

### **Haptic Feedback**

- Controller vibration on success/error
- Rhythm-based coding feedback

### **Multi-language Voice**

- Turkish voice mode
- English, Spanish, Japanese, etc.
- Accent selection

### **Code Explanation History**

- Save previous explanations
- Build personal knowledge base
- Search through past learnings

### **Interactive Code Playground**

- Modify code in explanation
- See results in real-time
- Experiment with alternatives

---

## 🏁 **Conclusion**

**Phase 7 Vision**: LUMA becomes not just a tool, but a **personalized coding companion** that:

✅ Appeals to ALL ages (13 to 60+)  
✅ Accessible to ALL abilities (blind, deaf, motor disabilities)  
✅ Fun AND professional  
✅ Customizable to personal taste  
✅ Voice-enabled for hands-free coding

**Timeline**: 2 weeks before production launch  
**Priority**: Last polish before release  
**Impact**: Dramatically increases user adoption and satisfaction! 🚀

---

**Status**: 📝 Documented (Implementation after Phase 1-6)  
**Estimated Time**: 14 days  
**Estimated Cost**: $0 (all open-source libraries)  
**Expected Outcome**: 🌟 Industry-leading personalization & accessibility
