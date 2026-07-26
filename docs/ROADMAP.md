# Project Roadmap: BookLLM (RAG-based AI Notebook & Assistant)

This document tracks the overall development progress, planned phases, and status of the project.

## Development Philosophy
- **Incremental Delivery**: Build and verify functional MVPs step-by-step.
- **Readable Code**: Simple, junior-to-mid level implementations without premature abstraction or complex frameworks.
- **Transparent Understanding**: Document architecture and technical decisions clearly.

---

## Phases Overview

### Phase 1: Foundation & Database Setup 🏁 [COMPLETED]
- [x] Set up Node.js & Express server structure.
- [x] Configure environment variables (`dotenv`).
- [x] Integrate PostgreSQL via Neon DB (`pg` pool with SSL).
- [x] Initialize database schema (`notebooks`, `sources`, `chat_sessions`, `messages`).
- [x] Verify database connection and tables.

### Phase 2: Document Ingestion & Source Management 🏁 [COMPLETED]
- [x] Review and verify Multer file upload pipeline for TXT and PDF files.
- [x] Support web URL scraping (`cheerio`) and YouTube captions (`youtube-transcript`).
- [x] Store source metadata in Neon PostgreSQL database.
- [x] Harden file upload endpoints against orphaned temp disk files and illegal extensions.
- [x] Verify file ingestion in dev browser UI (`life.txt` uploaded).

### Phase 3: Vector Indexing with Qdrant & LangChain 🏁 [COMPLETED]
- [x] Implement robust text chunking using simple logic and LangChain utilities (`RecursiveCharacterTextSplitter`).
- [x] Connect to OpenAI (`text-embedding-3-small`) to generate embeddings.
- [x] Store vector points and payloads in Qdrant Cloud.
- [x] Implement programmatic Qdrant payload index creation (`notebook_id`, `source_id`) to prevent filtered query rejection.
- [x] Optimize database checks with server lifecycle in-memory initialization caching.

### Phase 4: Retrieval-Augmented Generation (RAG) Q&A 🏁 [COMPLETED]
- [x] Create vector similarity search in Qdrant strictly filtered by `notebook_id`.
- [x] Construct clear RAG prompts with retrieved contexts.
- [x] Call OpenAI chat models (`gpt-3.5-turbo` / `gpt-4o-mini`) to answer user questions.
- [x] Format and return accurate text snippet citations.
- [x] Verify end-to-end RAG question answering in browser interface without indexing errors.

### Phase 5: Chat History & Session Persistence 🏁 [COMPLETED]
- [x] Automatically create or link chat sessions in PostgreSQL (`chat_sessions`) via Get-or-Create pattern.
- [x] Persist both user queries and AI responses with citations into the `messages` table.
- [x] Add REST endpoint (`GET /api/notebooks/:id/chat`) to retrieve conversation history.
- [x] Enable automatic frontend chat history loading when selecting notebooks.

### Phase 6: Frontend UI Polish with Tailwind CSS & Refinements 🏁 [COMPLETED]
- [x] Enhance frontend using clean HTML, JavaScript, and Tailwind CSS classes.
- [x] Eliminate visual state contamination when switching or creating notebooks with instant DOM resets.
- [x] Implement controls locking (`updateInputState`) to prevent query sending during active document processing or URL scraping.
- [x] Refine AI prompt instructions (`prompts.js`) to intelligently handle cross-domain inquiries without repetitive error phrases.

### Phase 7: Intelligent Source Selection & Pre-Retrieval Routing 🏁 [COMPLETED]
- [x] Add `metadata JSONB` column to PostgreSQL `sources` table in `init-db.js`.
- [x] Implement AI summary extraction (`summary`, `main_topics`, `keywords`, `named_entities`) in `metadata.js` during initial document indexing.
- [x] Create pre-retrieval routing supervisor (`routeQuery`) to evaluate user questions against source metadata summaries in PostgreSQL.
- [x] Support instant short-circuit explanations for out-of-scope queries or unrelated cross-document combinations (`unrelated_combination`), saving vector and LLM token overhead.
- [x] Extend Qdrant repository search (`searchByNotebook`) to restrict vector retrieval strictly to selected document IDs (`match: { any: sourceIds }`).

### Phase 8: Interactive Study Hub & Premium UI Polish 🏁 [COMPLETED]
- [x] Enhance frontend architecture with modern typography (Google Fonts Outfit & Inter), sleek gradients, and micro-animations.
- [x] Build interactive Workspace Navigation Tab Bar to toggle between **💬 Research & Sources** and **🎓 Interactive Study Hub**.
- [x] Harvest PostgreSQL JSONB summaries to render Executive Document Summary cards with topic badges and entity chips.
- [x] Implement Clickable RAG Study Question Generator that seamlessly transitions to Chat and triggers cited AI inquiries.
- [x] Build 3D Interactive Concept & Vocabulary Flashcards with tactile flipping transforms and automated AI explanation quiz triggers.

### Phase 9: Bonus Feature — Personalized Learning Roadmap 🏁 [COMPLETED]
- [x] Enhance URL upload (`sourceController.js`) to parse and expand YouTube Playlist links (`/playlist?list=...`) and comma-separated YouTube URLs into individual source indexing jobs.
- [x] Enrich extracted YouTube transcripts (`indexingService.js`) with timestamped interval markers (`[Timestamp MM:SS | XXs]`) stored directly in Qdrant vector text payloads.
- [x] Build modular AI learning curriculum generator (`generateLearningRoadmap`) using existing Qdrant vector similarity retrieval (`searchByNotebook`) and PostgreSQL JSONB metadata.
- [x] Tailor difficulty progression and steps to the user's existing knowledge, automatically selecting the most suitable video when multiple sources explain the exact same topic and explaining *why*.
- [x] Build interactive **🗺️ AI Learning Roadmap** dashboard with clickable step cards that launch recommended YouTube videos at the exact start timestamp (`&t=XXXs`).

---

## 🏆 Current Status: FULLY FEATURED AI WORKSPACE (Phase 9 Completed)
Our application has evolved into an exceptional, visually stunning AI Research & Interactive Study Suite with full-fledged Bonus Features including Personalized YouTube Learning Roadmaps! Powered entirely by clean vanilla JavaScript, Express, Qdrant vectors, and PostgreSQL JSONB!
