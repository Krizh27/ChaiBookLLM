# ⚡ ChaiBookLLM — Advanced AI Research Assistant & Interactive Study Intelligence Suite

> **Built for the GenAI with JS 2026 Assignment**  
> An engineered, production-grade conversational Retrieval-Augmented Generation (RAG) platform and educational study suite built with **Vanilla JavaScript ES Modules**, **Node.js/Express**, **Neon Serverless PostgreSQL**, **Qdrant Vector Database**, and **OpenAI**.

---

## 🌟 Executive Summary & Key Highlights

ChaiBookLLM transforms static documents and multimedia into an interactive research workspace and interactive educational hub. Designed with strict engineering simplicity and zero frontend framework bloat, the system delivers high-accuracy grounded AI answers with verifiable citations across **5 diverse media file types**.

### 🚀 Key Capabilities:
1. **Multi-Format Ingestion & Subtitle Support:** Easily attach and index **PDF documents** (via `pdf-parse`), **Plain Text** (`.txt`), **Website URLs** (via `cheerio` DOM scraping & cleaning), **YouTube Video Lectures** (via `youtube-transcript`), and **Audio/Video Subtitles & Transcripts** (`.srt` and `.vtt`).
2. **Pre-Retrieval AI Routing Triage:** An architectural innovation! Before querying the vector database, an AI Triage Router inspects lightweight source metadata stored in PostgreSQL JSONB. It automatically isolates relevant document subsets and intercepts incompatible cross-domain questions without wasting vector search computation!
3. **Multi-Format Source Viewer:** Don't just trust AI answers—verify them! Clicking any numerical citation (`Ref [1]`) opens an immersive multi-format inspection suite:
   - **PDF:** Opens the native browser PDF reader directly inside the modal and highlights search terms.
   - **Text & Subtitles (.txt, .srt, .vtt):** Loads the full document, wraps the cited passage in an animated yellow highlight tag (`<mark>`), and smoothly scrolls directly down to the reference.
   - **YouTube Lectures:** Launches an auto-playing embedded YouTube video player directly at the calculated lecture timestamp!
   - **Webpage URLs:** Displays a live web preview alongside a highlighted reference box and provides a modern browser **Text-Fragment Deep Link** (`#:~:text=...`) to open external web pages with native highlighting.
4. **Interactive Study Hub:** Automatically converts document metadata into an educational workbench containing:
   - **Executive Source Summaries:** High-level AI overviews, topic tags, and prominent named entities.
   - **Clickable RAG Study Questions:** Curated deep-dive research prompts that bridge directly into the AI conversational chat when clicked.
   - **3D Concept Flashcards:** Interactive vocabulary and terminology flashcards with tactile 3D CSS flip animations and a built-in *⚡ Ask AI to Explain* trigger!
5. **Zero Framework Bloat:** Clean Separation of Concerns utilizing modern HTML5, Vanilla CSS3 with glassmorphic styling, and ES6 JavaScript Modules adhering to a unified state Observer Pattern.

---

## 🏛️ System Architecture & Technology Stack

```
+-------------------------------------------------------------------------+
|                    FRONTEND CLIENT (Vanilla JS + CSS3)                   |
|   index.html  <-->  app.js (Controller)  <-->  state.js (Observer)      |
|   ui.js (DOM, Study Hub, 3D Flashcards & Multi-Format Source Viewer)    |
+-------------------------------------------------------------------------+
                     ^                                 |
           REST API  |                                 | JSON Payloads
                     |                                 v
+-------------------------------------------------------------------------+
|                  NODE.JS / EXPRESS BACKEND SERVICE LAYER                |
|  Routes -> Controllers -> Services (RAG, Indexing) -> Repositories      |
+-------------------------------------------------------------------------+
      |                           |                             |
      v                           v                             v
+------------------+     +-------------------+     +----------------------+
| OPENAI AI ENGINE |     | NEON POSTGRESQL   |     | QDRANT VECTOR DB     |
| Embeddings 3-Sm  |     | Notebooks, Sources|     | 1536-Dimensional     |
| GPT-3.5-Turbo    |     | JSONB Metadata,   |     | Semantic Points &    |
| AI Routing Triage|     | Chat Persistence  |     | Payload Keyword Idx  |
+------------------+     +-------------------+     +----------------------+
```

### Stack Breakdown:
- **Core Logic & Routing:** Node.js, Express.js 5.x, CORS, Dotenv.
- **Relational & Metadata DB:** Neon Serverless PostgreSQL (using `pg` driver with SSL encryption and JSONB schema support).
- **Vector Search Database:** Qdrant Cloud Vector DB (`@qdrant/js-client-rest`) running cosine similarity over 1536-dimensional vectors with keyword indexing on `notebook_id` and `source_id`.
- **LLM & Embedding Engine:** OpenAI API (`text-embedding-3-small` for semantic vectors, `gpt-3.5-turbo` for conversation completions and pre-retrieval routing).
- **Ingestion Tools:** Multer (file storage), `pdf-parse`, Cheerio, and `youtube-transcript`.

---

## 🔄 Core Retrieval & Ingestion Flows (Mermaid Diagrams)

### 1. Multi-Format Source Ingestion Lifecycle
```mermaid
graph TD
    A[User Uploads File/URL/Video] --> B(Express sourceController)
    B --> C{Detect Source Type}
    C -->|PDF| D[Extract Text via pdf-parse]
    C -->|TXT / SRT / VTT| E[Clean Timestamps & HTML Tags via cleanSubtitleText]
    C -->|Website URL| F[Scrape & Clean HTML via Cheerio]
    C -->|YouTube URL| G[Fetch Captions via youtube-transcript]
    
    D --> H[Generate Lightweight AI Summary Metadata]
    E --> H
    F --> H
    G --> H
    
    H --> I[(Store JSONB Metadata in PostgreSQL)]
    H --> J[LangChain RecursiveCharacterTextSplitter]
    J --> K[Generate OpenAI Embeddings text-embedding-3-small]
    K --> L[(Upsert 1536d Points to Qdrant Cloud)]
    L --> M[Update Source Status to READY]
```

### 2. Pre-Retrieval AI Routing & Grounded RAG Query Pipeline
```mermaid
graph TD
    Q[User Asks Research Question] --> R[Query PostgreSQL for Active Source JSONB Summaries]
    R --> S[AI Router Triage Assessment]
    
    S -->|Incompatible / Out of Scope| T[Intercept & Return Polite Clarification Guidance]
    S -->|Valid Query| U[Select Relevant Source IDs & Embed Question]
    
    U --> V[Qdrant Vector Similarity Search with Source ID Filtering]
    V --> W[Assemble Grounded Numerical Citation Prompt]
    W --> X[OpenAI gpt-3.5-turbo Completion]
    X --> Y[Join Vector Results with Postgres Paths for Source Viewer]
    Y --> Z[Return Enriched Answer & Interactable Citation Chips]
```

---

## 🛠️ Step-by-Step Setup & Installation Guide

### Prerequisites
- **Node.js**: Version 18.0.0 or higher.
- **PostgreSQL Database**: A running instance or serverless database from [Neon](https://neon.tech/).
- **Qdrant Vector Database**: A running local Qdrant Docker instance or a free cloud cluster from [Qdrant Cloud](https://cloud.qdrant.io/).
- **OpenAI API Key**: An active key with access to `gpt-3.5-turbo` and `text-embedding-3-small`.

### 1. Clone & Install Dependencies
```bash
git clone <your-repository-url>
cd bookllm
npm install
```

### 2. Configure Environment Variables
Copy the provided environment template to create your `.env` configuration file:
```bash
cp .env.example .env
```
Open `.env` and fill in your connection credentials:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
OPENAI_API_KEY=sk-proj-YOUR-OPENAI-KEY
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
```

### 3. Initialize Database Tables & Indexes
Run the provided automated script to construct all PostgreSQL relational tables (`notebooks`, `sources`, `messages`, `chat_sessions`) and add JSONB metadata columns:
```bash
npm run init-db
```

### 4. Start the Application Server
For local live-reloading development (using Nodemon):
```bash
npm run dev
```
For production execution:
```bash
npm start
```

### 5. Access in Browser
Open your web browser and navigate to:
**`http://localhost:3000`**

---

## 📂 Project Structure & Separation of Concerns

```
bookllm/
│
├── client/                     # Frontend Static Client (Zero Framework Bloat)
│   ├── index.html              # Main workspace structure, tabs, modals & Study Hub layout
│   ├── css/
│   │   └── styles.css          # Vanilla CSS3, micro-animations, glassmorphic themes & 3D rules
│   └── js/
│       ├── app.js              # Application bootstrapper and core routing coordinator
│       ├── state.js            # Unified central State Manager with Event Observer Pattern
│       ├── api.js              # REST client wrapper for communicating with Express backend
│       └── ui.js               # Comprehensive UI renderers, tab toggling & Source Viewer logic
│
├── server/                     # Backend API Service Layer
│   ├── controllers/            # HTTP Request/Response controllers
│   │   ├── notebookController.js
│   │   ├── sourceController.js
│   │   └── chatController.js
│   ├── routes/                 # Express RESTful routes
│   │   ├── notebookRoutes.js
│   │   ├── sourceRoutes.js
│   │   └── chatRoutes.js
│   ├── services/               # Core business orchestration
│   │   ├── indexingService.js    # Multi-format ingestion, parsing, chunking & Qdrant storage
│   │   └── ragService.js         # Pre-retrieval routing, semantic search & prompt completion
│   ├── repositories/           # Database abstraction layers
│   │   └── qdrantRepo.js         # Qdrant schema validation, payload indexing & point querying
│   └── ai/                     # Modular Artificial Intelligence helpers
│       ├── chunking.js         # LangChain RecursiveCharacterTextSplitter wrappers
│       ├── embeddings.js       # OpenAI embedding point constructors
│       ├── metadata.js         # JSONB summarizer and intelligent AI Routing Triage
│       └── prompts.js          # Strict numerical square-bracket citation grounding prompts
│
├── scripts/
│   └── init-db.js              # Database table migration and schema initialization script
│
├── docs/                       # Living project documentation & engineering audit trackers
│   ├── ARCHITECTURE.md
│   ├── BUGS_AND_IMPROVEMENTS.md
│   ├── CURRENT_PHASE.md
│   ├── DECISIONS.md
│   ├── MVP_AUDIT_REPORT.md     # Official assignment engineering audit & tier roadmap
│   ├── ROADMAP.md
│   └── PHASE_*.md              # Historical milestone execution logs
│
├── uploads/                    # Local storage disk directory for uploaded source inspection
├── db.js                       # PostgreSQL pooled client configuration
├── server.js                   # Main application Express entry point and static middleware
├── package.json                # Project dependencies and script definitions
└── README.md                   # Core project setup and architecture overview
```

---

## 🎯 Verification & Demonstration Highlights for Evaluators

1. **Test Multi-Format Ingestion**: Create a notebook and upload a PDF, paste a Wikipedia URL, attach a `.vtt`/`.srt` lecture subtitle transcript, or input a YouTube link. Observe real-time background status progression from `pending` ➔ `processing` ➔ `ready`.
2. **Test Grounded RAG with Interactive Source Viewer**: Ask a research question in the chat. When the AI responds with numerical square-bracket citations (`Ref [1]`), **click the chip**! Notice how the Source Viewer automatically loads the full text/subtitle file, smoothly scrolls to the exact paragraph, and pulses in yellow highlight—or auto-plays an embedded YouTube video directly at the lecture timestamp!
3. **Test Pre-Retrieval Domain Triage**: Upload two unrelated documents (e.g., a Physics article and a Javascript syllabus). Ask a composite question combining both domains ("What did Newton think of React hooks?"). Watch the AI router instantly reject the query with polite domain isolation guidance without wasting database vector search queries!
4. **Test 3D Interactive Study Hub**: Toggle to the **🎓 Interactive Study Hub** tab in the workspace navigation bar. Explore automated Executive Summaries, tap a clickable research question to launch a chat analysis, and flip an interactive **3D Concept Flashcard** to quiz the AI!

---
*Developed with practical engineering rigor, production readiness, and architectural elegance for the GenAI with JS 2026 ChaiBookLLM assignment.*
