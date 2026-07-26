# Project Overview
- **What ChaiBookLM is**: ChaiBookLM is a full-stack, state-of-the-art AI research assistant and study intelligence platform designed to synthesize knowledge across disparate source formats. Inspired by NotebookLM, it transforms raw documents, web pages, and video transcripts into interactive study hubs, citation-backed RAG chat experiences, and personalized learning curricula.
- **Objective of the project**: To demonstrate advanced Generative AI implementation using modern JavaScript, establishing a robust Retrieval-Augmented Generation (RAG) pipeline that completely eliminates hallucinations through rigorous citation formatting, hybrid semantic-metadata routing, and secure multi-tenant user isolation.

---

# Tech Stack

| Component | Technology / Framework | Primary Responsibility |
| :--- | :--- | :--- |
| **Frontend** | Vanilla HTML5, Modern CSS3, Tailwind CSS (CDN), ES6 Modules | Responsive UI, 3D flip animations, SSE streaming reader, glassmorphism design system |
| **Backend** | Node.js (ESM), Express.js v5 | REST API endpoints, streaming Server-Sent Events (SSE), file upload processing |
| **Database** | PostgreSQL (Neon Serverless SQL & JSONB) | Relational notebook/source persistence, user tenant ownership, pre-curated study metadata |
| **Vector DB** | Qdrant Cloud Vector Database | High-dimensional embedding storage and semantic similarity chunk retrieval |
| **AI / LLM** | OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`) | Embeddings generation, context-aware answering, JSON structured study curation |
| **Authentication** | Clerk Auth (`@clerk/express`, `@clerk/clerk-js`) | Multi-tenant authentication, token verification, and route protection |
| **Libraries** | LangChain, Cheerio, PDF-Parse, Multer, YouTube-Transcript | Text splitting (`RecursiveCharacterTextSplitter`), web scraping, document ingestion |

---

# Features Implemented

## 1. Notebook Management
- **Multi-Tenant Isolation**: Secure workspace separation where notebooks are strictly scoped to authenticated Clerk user IDs (`req.auth.userId`).
- **CRUD Operations**: Complete lifecycle management allowing users to create, dynamically rename, and delete study workspaces.
- **Responsive Workspace Switcher**: Real-time switching between active notebooks with zero page reloads and instant state hydration.
- **Legacy Public Access**: Seamless compatibility layer allowing unassigned test notebooks (`user_id IS NULL`) to remain accessible during peer evaluations.

## 2. Source Ingestion
- **Supported Source Types**: 
  - 📄 **PDF Documents**: Direct binary text extraction via `pdf-parse`.
  - 📝 **Plain Text (.txt) & Subtitles (.srt / .vtt)**: Raw text and lecture transcript processing.
  - 🌐 **Web URLs**: Clean text scraping and DOM parsing via `cheerio`.
  - 📺 **YouTube Lectures**: Automatic caption extraction via `youtube-transcript`.
- **Upload Pipeline**: Asynchronous file ingestion using Express and `multer` with immediate processing feedback.
- **Chunking Strategy**: Configured with `@langchain/textsplitters` (`RecursiveCharacterTextSplitter`) to generate semantic context windows with configurable overlap to preserve syntactic boundaries.
- **Embeddings & Qdrant Indexing**: Batch vector transformation via OpenAI Embeddings mapped directly into Qdrant collections with persistent metadata payloads.
- **Source Management**: Endpoints supporting source deletion (cascading across relational DB and vector embeddings) and manual re-indexing.

## 3. RAG Pipeline
- **Retrieval Flow**: Two-stage hybrid query execution combining semantic Qdrant cosine similarity search with relational source constraint checks.
- **Metadata Handling**: Every vector fragment retains exhaustive provenance metadata (document IDs, titles, types, timestamps, and line references).
- **Intelligent Routing**: Queries utilize pre-indexed PostgreSQL `JSONB` document taxonomy to bypass irrelevant sources, optimizing retrieval speeds.
- **Grounded Responses**: Retrieved contextual snippets are strictly quarantined within dedicated system prompts, ensuring zero factual extrapolation.

## 4. AI Responses
- **Prompt Engineering**: Engineered system guardrails mandating that answers rely exclusively on retrieved context windows.
- **Hallucination Prevention**: Explicit failure-mode instructions forcing the LLM to decline unverified assertions rather than projecting statistical assumptions.
- **Real-Time Streaming**: Integrated **Server-Sent Events (SSE)** architecture delivering token-by-token answer synthesis with zero perceptible latency.
- **Citation Generation**: Inline numerical citation generation linked dynamically to extracted document chunk metadata.

## 5. Citations & Source Attribution
- **Source Viewer Modal**: An interactive inspection modal displaying exact matched context snippets cleanly formatted without leaving the chat interface.
- **PDF & Document Reference Tracking**: Clear display of chunk references and document origin titles.
- **YouTube Timestamps & Website Previews**: External navigation triggers embedded inside citations (`↗ Open in New Tab`) directing users to original URL domains and lecture timestamps.

## 6. Architecture
- **High-Level Folder Structure**:
  ```text
  ├── client/                  # Static ES6 Vanilla JS Frontend & CSS Tokens
  │   ├── index.html           # Single-Page App Layout & Modal Suites
  │   ├── css/styles.css       # Custom Glassmorphism Token Overrides & 3D Transforms
  │   └── js/                  # Modular ES6 Logic (app.js, api.js, ui.js, state.js)
  ├── server/                  # Backend Application Architecture
  │   ├── controllers/         # Endpoint Handlers (notebooks, sources, chat)
  │   ├── routes/              # Express Router Definitions & Middleware Hooks
  │   ├── services/            # Business Logic (indexingService, ragService, db)
  │   └── ai/                  # OpenAI Clients, Embeddings & LangChain Chunkers
  ├── scripts/                 # Automated DB Migration & Init Utilities
  └── server.js                # Primary Express Entry Point
  ```
- **Separation of Concerns**: Strict decouplements between UI presentation, HTTP routing, vector indexing workflows, and LLM communication layers.
- **Why Vanilla JS + Express**: Chosen to achieve absolute runtime efficiency, elimination of heavy frontend bundle compilation overhead, crystal-clear SSE stream consumption via standard browser `TextDecoder`, and maximum code readability for GenAI architectural evaluation.

## 7. UI / UX
- **Research Workspace**: A dual-pane command center integrating dynamic knowledge upload triggers alongside streaming RAG chat interfaces.
- **Interactive Study Hub**: Automated generation of interactive learning tools tailored to source materials without manual prompting.
- **Loading States & Feedback**: Non-blocking toast notification systems, custom modal dialogs replacing native browser prompts, and active pulsing sync indicators.
- **Responsive Interface**: Dark-mode themed dashboard utilizing Google Fonts (*Outfit* and *Inter*) with subtle micro-animations and glassmorphic overlays.

---

# Bonus Features

### 🌟 1. Intelligent Source Routing & AI Summary Curation
Upon source upload, an offline synthesis pipeline analyzes document chunks to generate executive summaries and thematic keywords stored in PostgreSQL `JSONB` columns. This enables zero-latency loading of workspace intelligence and guides conversational routing.

### 🌟 2. Interactive Study Hub with 3D Flip Flashcards
- **Executive Summaries Grid**: Immediate synthesis cards summarizing uploaded literature and lectures.
- **Clickable RAG Study Questions**: Auto-generated deep-dive investigative prompts. Clicking any question smoothly relocates the user to the chat workspace and triggers an instant streaming inquiry against the AI engine.
- **3D Concept & Entity Flashcards**: Interactive CSS-powered 3D perspective flip cards allowing users to quiz themselves on key vocabulary, named entities, and structural paradigms extracted from their documents. Includes a live **Shuffle Deck** utility.

### 🌟 3. Personalized Video Learning Roadmap
- **RAG Video Curriculum Generator**: Converts uploaded YouTube video transcripts and web sources into an intelligent, chronological study curriculum customized to the user’s self-reported prior knowledge level.
- **Interactive Timestamped Timeline**: Displays sequentially ordered lesson cards with precise context summaries and jump-links to master complex topics incrementally.

---

# Challenges & Engineering Decisions

- **Why PostgreSQL (Neon) + Qdrant**: Relational databases excel at ACID compliance, multi-tenant Clerk user hierarchies, and complex JSONB querying (essential for rendering instant study hubs). Qdrant was introduced specifically for high-throughput, horizontally scalable vector semantic search. Handling both ensures neither system is forced into antipattern usage.
- **Why Metadata Routing**: Searching an unindexed vector ocean increases context confusion as user repositories grow. Introducing relational table filtering prior to embedding synthesis lowers compute costs and restricts search boundaries to designated notebooks.
- **Important Design Decisions & Trade-Offs**:
  - *Trade-off (Frameworks vs. Speed)*: Opted against heavyweight SPA frameworks (like React/Next.js) in favor of ES6 modules to ensure absolute control over native Web Streams API for real-time SSE answer rendering without component lifecycle hydration lag.
  - *Design Decision (Asynchronous Indexing)*: Heavy file processing (chunking, OpenAI embedding requests, vector ingestion) occurs asynchronously behind clean status barriers, keeping the Express event loop highly responsive.

---

# Future Improvements
- **Multi-Modal Image & Chart Ingestion**: Integrating Optical Character Recognition (OCR) and vision-language models (`gpt-4o`) to extract and embed technical diagrams from PDFs.
- **Export & Integration APIs**: Supporting direct export of study flashcard decks into standard formatting architectures (Anki `.apkg` and Quizlet).
- **Collaborative Workspace Sharing**: Expanding Clerk role claims to enable read-only or co-editing sharing links for academic study groups.
- **Automated Web-Scraping Refresh Schedules**: Implementing cron-driven background synchronizations to update Qdrant embeddings automatically when external documentation URLs change.

---

# Submission Links
- **GitHub Repository**: [https://github.com/Krizh27/ChaiBookLLM](https://github.com/Krizh27/ChaiBookLLM.git)
- **Live Deployment**: *(Insert Live Deployment URL here upon publishing to Railway / Render)*
- **Demo Video**: *(Insert YouTube / Loom Walkthrough Demo Video Link here)*
