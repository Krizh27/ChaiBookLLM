# Architecture & Technical System Design

This document details the software architecture of **BookLLM**, emphasizing simplicity, separation of concerns, and beginner-friendly clarity.

## System Overview

```
[ Frontend: HTML / CSS / Tailwind / JS ]
          │ (REST HTTP API)
          ▼
[ Express.js Backend Server (Node.js) ]
          │
  ┌───────┼───────────────────┬────────────────────────────┐
  ▼                           ▼                            ▼
[ Neon PostgreSQL ]    [ OpenAI API ]            [ Qdrant Vector Cloud ]
(Relational Data &    (LLM Embeddings &         (High-Dimensional Semantic
 Metadata Storage)     Chat Completions)          Text Chunk Vectors)
```

---

## Folder & Component Structure

- `client/`: Contains vanilla static frontend UI files (`index.html`, vanilla JS, CSS, and Tailwind styling). Served directly by Express.
- `server/`: Application logic split by responsibility:
  - `routes/`: Express router definitions mapping HTTP verbs and URLs to specific controller functions.
  - `controllers/`: Request handlers that extract params, call business services, and format JSON responses.
  - `services/`: Core business logic (e.g., orchestrating file extraction, RAG pipelines, AI prompt builds).
  - `ai/`: Specialized modules for text chunking, OpenAI embeddings, and prompt generators.
  - `repositories/`: Direct database wrappers for external DB interactions (e.g., Qdrant client functions).
- `scripts/`: Standalone command-line utilities (e.g., DB initialization).
- `uploads/`: Temporary file storage for incoming user document attachments processed via Multer.
- `docs/`: Markdown-based living engineering documentation and technical milestones.

---

## Core Data Flows

### 1. Document Upload & Ingestion Flow
1. **Client** POSTs file or URL to `/api/notebooks/:id/sources`.
2. **Controller (`sourceController.js`)** intercepts request and logs initial `source` row in **Neon PostgreSQL** with status=`pending`.
3. **Service (`indexingService.js`)** extracts raw text (via `pdf-parse`, `cheerio`, or `youtube-transcript`).
4. **AI Module (`chunking.js` / `embeddings.js`)** splits text into chunks and calls **OpenAI Embeddings API** (`text-embedding-3-small`).
5. **Vector Repo (`qdrantRepo.js`)** pushes vector array alongside metadata payloads (`notebook_id`, `source_id`, snippet text) to **Qdrant Cloud**.
6. Status in PostgreSQL is updated to `ready`.

### 2. RAG Chat Question & Answer Flow
1. **Client** POSTs user prompt to `/api/notebooks/:id/chat`.
2. **Service (`ragService.js`)** converts query into a vector representation via **OpenAI Embeddings**.
3. **Vector Repo** executes a cosine similarity search against **Qdrant**, explicitly filtering by the target `notebook_id`.
4. **Prompt Generator (`prompts.js`)** builds a clean instruction context containing retrieved matching text snippets.
5. **OpenAI Chat Model (`gpt-3.5-turbo`)** generates a truthful answer based solely on the provided snippets.
6. Server returns AI completion along with citation references to the frontend UI.
