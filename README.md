# 🌟 LUMA SUPREME - Learning & Understanding Machine Assistant

**Version**: 2.0 Supreme  
**Architecture**: Dual-Brain AI System (Claude Production + Ollama Learning)  
**Status**: Phase 1 In Development

---

## 🎯 **What is LUMA?**

LUMA is not just another AI coding assistant. It's a **self-learning, self-improving system** that:

- ✅ **Learns from every interaction** - Passive observation of Claude's actions
- ✅ **Improves continuously** - Night Orders protocol for background learning
- ✅ **Teaches you best practices** - Usta Modu (Teacher Mode)
- ✅ **Analyzes deeply** - Elysion Chamber for architecture insights
- ✅ **Works offline** - Ollama-powered local inference
- ✅ **Respects privacy** - All data stored locally

---

## 🏗️ **System Architecture**

```
Claude MCP (Production) ←→ Shared Context Memory ←→ Ollama MCP (Learning)
        ↓                           ↓                         ↓
   Tool Execution          Observations & Patterns      Agent System
   Real-time work          SQLite Database              Background learning
```

**Read full architecture**: [LUMA_SUPREME_MASTER_PLAN.md](./LUMA_SUPREME_MASTER_PLAN.md)

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

# Pull Ollama models
ollama pull llama2

# Start development
npm run dev
```

### **Configuration**

1. **Claude API Key**: Settings → Claude API tab → Enter your API key
2. **Ollama Setup**: Settings → Ollama tab → Install instructions
3. **MCP Selection**: Chat panel → Toggle between Claude/Ollama

---

## 📚 **Documentation**

- 📖 **[Master Plan](./LUMA_SUPREME_MASTER_PLAN.md)** - Complete system architecture & roadmap
- 🧪 **[Tool Test Plan](./CLAUDE_TOOL_TEST_PLAN.md)** - Testing guide for 18 Claude tools

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
│   │   ├── claude-service.ts    # Claude MCP (18 tools)
│   │   ├── activity-observer.ts # Passive learning hook
│   │   └── ipc/                 # IPC handlers
│   ├── renderer/                # React UI
│   │   ├── components/          # UI components
│   │   ├── agents/              # Ollama agent system
│   │   ├── stores/              # Zustand state
│   │   └── services/            # Ollama service
│   └── shared/                  # Shared utilities
│       └── shared-context-memory.ts  # SQLite learning DB
├── LUMA_SUPREME_MASTER_PLAN.md  # 📖 Read this first!
├── CLAUDE_TOOL_TEST_PLAN.md     # Tool testing guide
└── README.md                    # This file
```

---

## 🎨 **Features**

### **✅ Phase 0: Foundation (Complete)**

- Dragon Theme UI (Turquoise + Orange)
- Claude MCP with 18 tools
- Ollama MCP integration
- Dual-brain toggle system
- Settings panel (API keys, models)

### **🔄 Phase 1: Passive Learning (In Progress)**

- Activity Observer (non-blocking hooks)
- Shared Context Memory (SQLite)
- Ollama Agent System
- Pattern recognition

### **🌙 Phase 2-6: Advanced Features (Planned)**

- Night Orders Protocol
- Usta Modu (Teacher Mode)
- Elysion Chamber (Deep analysis)
- Reflexion Engine
- Fine-tuning system

**See [Master Plan](./LUMA_SUPREME_MASTER_PLAN.md) for details.**

---

## 🎓 **Learning System**

LUMA learns passively by:

1. **Observing** Claude's tool executions
2. **Recording** observations to SQLite database
3. **Analyzing** patterns with Ollama agents
4. **Consolidating** knowledge during idle time (Night Orders)
5. **Teaching** best practices (Usta Modu)
6. **Improving** through reflexion

**Key Insight**: Claude never changes, Ollama learns from it!

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
**Last Updated**: October 25, 2025
