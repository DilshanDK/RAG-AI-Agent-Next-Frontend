# 💻 RAG AI Agent - Next.js Frontend

Liquid Glassmorphism web application interface for the Autonomous RAG AI Agent.

---

## 🌟 Features

- **💬 Dynamic Multi-Session Chat**: Create new chat threads, switch between sessions, delete threads, and maintain conversation persistence.
- **⚡ AI Model Selector Dropdown**: Select between **Groq** (`llama-3.1-8b-instant`), **Google Gemini** (`gemini-1.5-flash`), and **OpenRouter** (`llama-3.3-70b-instruct:free`). The selector automatically locks once a chat begins to maintain conversation context.
- **🎯 Document Focus Mode ("Study This File")**: Click "Study This File" on any document to scope the agent's vector search and reasoning specifically to that file, or clear focus to search across all uploaded documents.
- **📄 Document Upload & Management**: Upload `.pdf`, `.txt`, and `.md` files with progress feedback and real-time document deletion.
- **🔍 Grounded Citations**: Detailed expandable source cards displaying chunk relevance scores, document titles, and excerpt previews.
- **🎨 Liquid Glassmorphism Aesthetics**: Modern dark mode with frosted glass cards, fluid gradients, and responsive layouts.

---

## 📦 Setup & Running

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- Running NestJS backend instance (default: `http://localhost:3000`)

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file from the provided `.env.example`:
```bash
cp .env.example .env.local
```

Configure backend API URL (if different from default):
```env
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🏗️ Build for Production

```bash
npm run build
npm run start
```

---

## 📜 License
MIT
