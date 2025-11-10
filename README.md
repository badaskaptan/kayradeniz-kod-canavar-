# 🌟 LUMA SUPREME - Learning & Understanding Machine Assistant

**Version**: 2.1 Supreme (Dual Teacher Edition)  
**Architecture**: Triple-Brain AI System (Claude + OpenAI Teachers → Ollama Student)  
**Status**: Phase 0.5 Complete, Phase 1 Starting

---

## 🎯 **What is LUMA?**

LUMA is not just another AI coding assistant. It's a **self-learning, self-improving system** with **dual teacher architecture** that:

- ✅ **Learns from TWO expert AIs** - Observes both Claude AND OpenAI GPT
- ✅ **Combines best practices** - Claude's careful approach + GPT's efficient style
- ✅ **Improves continuously** - Night Orders protocol for background learning
- ✅ **Teaches you best practices** - Usta Modu (Teacher Mode)
- ✅ **Analyzes deeply** - Elysion Chamber for architecture insights
- ✅ **Works offline** - Ollama-powered local inference (after graduation)
- ✅ **Respects privacy** - All data stored locally

---

## 🏗️ **System Architecture**

```
┌─────────────┐
│   CLAUDE    │ ← User sends task
│  (Teacher 1)│
└──────┬──────┘
       │
       ▼
  ┌─────────────────────┐
  │ ACTIVITY OBSERVER   │
  │ +                   │ → Patterns → Ship's Logbook (SQLite)
  │ INTELLIGENCE FLEET  │              ↓
  └─────────────────────┘         NIGHT ORDERS
       ▲                              ↓
       │                         ┌──────────┐
┌──────┴──────┐                  │  OLLAMA  │
│  OPENAI GPT │ ← User sends     │ (Student)│ → Agent System
│  (Teacher 2)│    [OPENAI] task │          │   Background learning
└─────────────┘                  └──────────┘
```

**Read full architecture**: [LUMA_SUPREME_MASTER_PLAN.md](./LUMA_SUPREME_MASTER_PLAN.md)  
**Dual teacher strategy**: [DUAL_TEACHER_SYSTEM.md](./DUAL_TEACHER_SYSTEM.md)  
**OpenAI vs Ollama analysis**: [OPENAI_VS_OLLAMA_ANALYSIS.md](./OPENAI_VS_OLLAMA_ANALYSIS.md)

---

## 🚀 **Quick Start**

### **Prerequisites**

```bash
# Node.js 18+
node --version

# Ollama (for local LLM)
ollama --version

# If Ollama not installed:
# Visit: https://ollama.ai/download
```

### **Ollama Performance Tips**

**For best performance:**

- ✅ **Minimize Ollama Desktop** (don't close!) - runs 20-30% faster in system tray
- ✅ **Recommended models for 8GB RAM:**
  - `llama3.2:3b` - Best balance (tool calling, 5-7 sec responses)
  - `qwen2.5:7b` - Better quality (requires 16GB+ RAM)
- ⚠️ **Avoid heavy models** like `llama3:70b` on limited RAM

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd luma-project

# Install dependencies
npm install

# Pull Ollama models (for local learning)
ollama pull llama3.2:3b

# Start development
npm run dev
```

### **Configuration**

1. **Claude API Key**: Settings → Claude API tab → Enter your Anthropic API key
2. **OpenAI API Key**: Settings → OpenAI tab → Enter your OpenAI API key + Select model
3. **Ollama Setup**: Settings → Ollama tab → Install instructions
4. **AI Selection**: Chat panel → Choose Claude / OpenAI / Ollama

**Recommended Start**: Use OpenAI (GPT-3.5-turbo) for instant production quality while Ollama learns in background!

---

## 📚 **Documentation**

- 📖 **[Master Plan](./LUMA_SUPREME_MASTER_PLAN.md)** - Complete system architecture & roadmap
- 🎓 **[Dual Teacher System](./DUAL_TEACHER_SYSTEM.md)** - How Ollama learns from Claude + GPT
- 💎 **[OpenAI vs Ollama](./OPENAI_VS_OLLAMA_ANALYSIS.md)** - Cost/benefit analysis & strategy
- 🧪 **[Tool Test Plan](./CLAUDE_TOOL_TEST_PLAN.md)** - Testing guide for 17 shared tools

---

## 🛠️ **Development**

### **Available Scripts**

```bash
# Development mode (hot reload)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format

# Build for production
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### **Project Structure**

```
luma-project/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── claude-service.ts    # Claude MCP (17 tools)
│   │   ├── activity-observer.ts # Dual teacher observation (Phase 1)
│   │   ├── intelligence-fleet.ts # Pattern extraction (Phase 1)
│   │   ├── night-orders-command.ts # Learning protocol (Phase 2)
│   │   └── ipc/                 # IPC handlers
│   ├── renderer/                # React UI
│   │   ├── components/          # UI components
│   │   ├── agents/              # Ollama agent system
│   │   ├── stores/              # Zustand state
│   │   └── services/
│   │       ├── ollamaService.ts # Ollama integration
│   │       └── openaiService.ts # OpenAI GPT integration (NEW!)
│   └── shared/                  # Shared utilities
│       └── ships-logbook.ts     # SQLite learning DB (Phase 1)
├── LUMA_SUPREME_MASTER_PLAN.md  # 📖 Complete architecture
├── DUAL_TEACHER_SYSTEM.md       # 🎓 Learning strategy
├── OPENAI_VS_OLLAMA_ANALYSIS.md # 💎 Cost/benefit analysis
├── CLAUDE_TOOL_TEST_PLAN.md     # Tool testing guide
└── README.md                    # This file
```

---

## 🎨 **Features**

### **✅ Phase 0: Foundation (Complete)**

- Dragon Theme UI (Turquoise + Orange)
- Claude MCP with 17 tools
- Ollama MCP integration
- Settings panel (API keys, models)

### **✅ Phase 0.5: OpenAI Integration (Complete - NEW!)**

- OpenAI GPT-3.5/4 integration
- 17 shared tools (same as Claude/Ollama)
- Tool calling with multi-iteration
- Settings UI (API key + model selection)
- Night Orders recording for patterns
- Dual teacher observation ready

### **🔄 Phase 1: Observation Deck (Starting Now)**

- Activity Observer (watches Claude + GPT)
- Ship's Logbook (SQLite database)
- Intelligence Fleet (pattern extraction)
- Teacher signature tagging (CLAUDE vs GPT style)

### **🌙 Phase 2-6: Advanced Features (Planned)**

- Night Orders Command Center UI
- Usta Modu Integration (Teaching system)
- Elysion Chamber (Deep analysis)
- Reflexion Enhancement (Multi-attempt learning)
- Background Consolidation (Fine-tuning)

**See [Master Plan](./LUMA_SUPREME_MASTER_PLAN.md) for details.**

---

## 🎓 **Learning System (Dual Teacher Architecture)**

LUMA learns from **TWO expert teachers** simultaneously:

### **Teacher 1: Claude (Careful & Methodical)**

- Read-first approach (defensive)
- Incremental edits (str_replace_editor)
- Step-by-step execution
- Best for: Critical refactoring, complex changes

### **Teacher 2: OpenAI GPT (Fast & Efficient)**

- Quick analysis (bash wizardry)
- Bulk operations (multi_edit)
- Data-driven optimization
- Best for: Performance tasks, quick iterations

### **Student: Ollama (Learning Both Styles)**

1. **Observing** - Activity Observer records both teachers' tool executions
2. **Recording** - Ship's Logbook stores patterns with teacher tags (CLAUDE/GPT)
3. **Analyzing** - Intelligence Fleet extracts strategies from each style
4. **Consolidating** - Night Orders creates adaptive learning missions
5. **Practicing** - Ollama simulates tasks in background
6. **Graduating** - 6 months → Ollama matches both teachers (95%+ quality)

**Key Insight**: Ollama learns the **best of both worlds** - Claude's safety + GPT's speed!

**Timeline**:

- Month 1-2: 60% quality (apprentice)
- Month 3-4: 80% quality (journeyman)
- Month 5-6: 95% quality (graduation!)
- Month 7+: Switch to Ollama (zero cost forever)

---

## 🔐 **Privacy & Security**

- ✅ API keys stored locally (encrypted)
- ✅ No external data transmission (except AI APIs)
- ✅ Learning database stored locally (SQLite)
- ✅ User can disable learning system
- ✅ User can clear all learned data

---

## 🤝 **Contributing**

Read [LUMA_SUPREME_MASTER_PLAN.md](./LUMA_SUPREME_MASTER_PLAN.md) for architecture details.

---

## 📄 **License**

MIT

---

## 🙏 **Acknowledgments**

- **Anthropic** - Claude API
- **Ollama** - Local LLM infrastructure
- **Electron** - Desktop framework
- **React** - UI framework

---

**Built with 💙 by the LUMA team**  
**Last Updated**: November 3, 2025 (Dual Teacher Edition)
