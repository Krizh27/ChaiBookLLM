# Engineering & Design Decisions

This document logs significant architectural and engineering choices made throughout the build lifecycle, along with the reasoning behind each decision.

---

## 01. Prefer Vanilla Node.js / Express over All-in-One Frameworks (Next.js/Remix)
- **Date**: July 2026 (Phase 1)
- **Context**: Choosing the overarching framework stack for full-stack RAG web development.
- **Decision**: Use standard Express.js routing serving traditional static front-end assets over server-side frontend frameworks like Next.js.
- **Why**: Keeps server API endpoints decoupled from presentation layers. Easier to understand fundamental concepts of HTTP requests, CORS, headers, and middleware without magical build pipelines.

## 02. Using Raw `pg` Library over Heavy ORMs (Prisma / Sequelize)
- **Date**: July 2026 (Phase 1)
- **Context**: Choosing how to interact with the relational PostgreSQL database hosted on Neon.
- **Decision**: Use the official PostgreSQL Node client (`pg`) with explicit SQL string commands and connection pooling.
- **Why**: 
  - Direct SQL execution demystifies database interactions for learners.
  - Avoids code bloat, complicated schemas, or schema compilation synchronization issues.
  - Easier to debug exact query syntax and parameter substitution.

## 03. Separation of Metadata vs. Vector Data (Neon vs. Qdrant Cloud)
- **Date**: July 2026 (Phase 1)
- **Context**: Choosing storage engines for RAG retrieval and application state.
- **Decision**: Store structured relationship data (notebooks, source names, chat logs, indexing status) in relational Neon Postgres, and semantic embedding vectors in dedicated Qdrant Cloud collections.
- **Why**: 
  - Qdrant offers blazing fast cosine vector searching with built-in metadata payload filtering (`notebook_id`).
  - Relational queries remain best served by ACID-compliant PostgreSQL engines.

## 04. Strict Filtering by `notebook_id` in Vector Searches
- **Date**: July 2026 (Phase 1)
- **Context**: Avoiding cross-talk or information leakage between different notebooks when searching vectors.
- **Decision**: Every point inserted into Qdrant must embed `notebook_id` in its payload; every similarity search query must include a strict `must: { key: 'notebook_id', match: { value: notebookId } }` Qdrant filter parameter.
- **Why**: Ensures RAG answers remain confined strictly to the documents explicitly attached to the selected user notebook.

## 05. Strict Upload Guardrails with Automatic Disk Cleanup
- **Date**: July 2026 (Phase 2)
- **Context**: Preventing disk bloat and unhandled extraction exceptions from invalid attachments.
- **Decision**: Validate file extensions (`.txt`, `.pdf`) and verify parent notebook existence immediately in the source controller. If validation errors occur, synchronously delete (`fs.unlinkSync`) temporary files saved by Multer.

## 06. In-Memory Lifecycle Caching & Explicit Payload Indexing in Qdrant
- **Date**: July 2026 (Phase 3)
- **Context**: Avoiding repeated network latency on every database operation while complying with Qdrant Cloud's payload index filter requirement.
- **Decision**: Implement an in-memory boolean (`collectionInitialized`) inside `ensureCollection()` and programmatically invoke `createPayloadIndex` for `notebook_id` and `source_id` on the very first database interaction of a server run.

## 07. Get-or-Create Session Pattern over Client Session Orchestration
- **Date**: July 2026 (Phase 5)
- **Context**: Deciding how to initialize and link messages to `chat_sessions` when a user interacts with a notebook.
- **Decision**: Execute a "Get-or-Create" SQL strategy inside `chatController.js` on every message query and history fetch, automatically instantiating a default session if none exists.

## 08. Synchronous Optimistic DOM Pre-clearing & Centralized Controls Locking
- **Date**: July 2026 (Phase 6)
- **Context**: Preventing visual contamination during asynchronous network transitions and blocking premature query submissions during active document indexing.
- **Decision**: Synchronously inject loading indicators into message and source containers prior to asynchronous `await fetch()` routines, and manage chat button states via a centralized `updateInputState` polling evaluation.

## 09. Intelligent Pre-Retrieval Triage & Source Routing via PostgreSQL JSONB Summaries
- **Date**: July 2026 (Phase 7)
- **Context**: Resolving RAG architectural inefficiency where cross-domain queries in mixed-topic notebooks triggered unconditional vector searches across every document.
- **Decision**: Extract lightweight structured summaries once during document ingestion using OpenAI JSON completion mode and save them to PostgreSQL `sources.metadata (JSONB)`. Before querying Qdrant, pass the source summaries and user question through a pre-retrieval AI routing supervisor (`routeQuery`).
- **Why**: Allows short-circuiting incompatible cross-document combinations directly from PostgreSQL metadata without invoking embedding models or querying Qdrant Cloud, and restricts vector similarity matches exclusively to router-selected source UUIDs.

## 10. Batched State Notification & Async Stale Fetch Rejection Guarding
- **Date**: July 2026 (Post-Phase 7 Refinements)
- **Context**: Eliminating asynchronous race conditions where creating or rapidly switching between notebooks caused slower historical network responses to overwrite newer UI views.
- **Decision**: 
  1. Use `state.addAndSelectNotebook()` to modify application state silently before emitting a single unified subscriber notification.
  2. Require explicit stale render evaluation (`if (state.currentNotebookId !== notebookId) return;`) immediately following every asynchronous `await` step inside UI view rendering functions.
- **Why**: In modern web application interfaces, network request duration is unpredictable. Stale fetch rejection prevents outdated data from mutating DOM containers when the user has already navigated to a new context.
