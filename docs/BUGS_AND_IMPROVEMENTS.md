# Bugs, Limitations & Planned Improvements

Instead of cluttering conversation chat with non-critical notes, discovered issues and future ideas are maintained in this log.

---

## Current Known Limitations
1. **Synchronous/In-Memory Processing**: Large PDF uploads currently extract text and generate embeddings during the HTTP request cycle or immediately afterwards in-process. Very large documents (hundreds of pages) might delay API response times or hit memory caps.
2. **Single Conversation Thread**: For simplicity in V1 MVP, all chat interactions within a notebook belong to a single default chat session timeline without multi-thread creating support.

---

## Resolved & Past Bugs / Limitations
### 01. Asynchronous Race Condition on Notebook Creation & Rapid Switching [RESOLVED IN POST-PHASE 7]
- **Symptom**: When creating a new notebook (`nb3`) while an existing notebook (`nb2`) was active, the screen briefly or permanently rendered `nb2`'s chat history and sources while the header titled `nb3`.
- **Root Cause**: Calling `state.addNotebook()` emitted a state notification while `currentNotebookId` still pointed to `nb2`, initiating an asynchronous network fetch for `nb2`. Instantly calling `state.setCurrentNotebook(nb3_id)` initiated a second fetch for `nb3`. Because `nb3` was brand new, its empty network fetch resolved faster than `nb2`'s historical fetch. When `nb2`'s delayed network fetch finally resolved, it silently overwrote the screen without checking if the user had moved away!
- **Resolution**: 
  1. Created `state.addAndSelectNotebook()` in `state.js` to batch addition and selection into a single notification event.
  2. Implemented **Stale Fetch Rejection Guarding** (`if (state.currentNotebookId !== notebookId) return;`) after all asynchronous network invocations in `renderMainArea()` and `renderChatHistory()`.

### 02. Visual Contamination & Stale DOM Views on Notebook Switch [RESOLVED IN PHASE 6]
- **Symptom**: Clicking '+ New Notebook' or switching between notebooks briefly left previous chats and file lists visible on screen while asynchronous API network fetches ran in the background.
- **Resolution**: Synchronously cleared source lists and chat messages with loading placeholders immediately upon invoking `renderMainArea()`.

### 03. Premature Query Submissions During Active Document Indexing [RESOLVED IN PHASE 6]
- **Symptom**: Send button and chat inputs remained clickable while documents or URLs were still actively downloading or vector-indexing (`pending`/`processing`), leading to race conditions and missing citations.
- **Resolution**: Introduced centralized UI controls locking (`updateInputState()`) tied into active polling intervals and upload event triggers.

### 04. Rigid Repetitive Fallback Responses for Cross-Domain Queries [RESOLVED IN PHASE 6 & PHASE 7]
- **Symptom**: Asking composite questions spanning unrelated documents triggered rigid error phrases or wasted token overhead searching mismatched sources.
- **Resolution**: Implemented Phase 7 Pre-Retrieval AI Router to intercept unrelated multi-document combinations instantly from PostgreSQL JSONB summaries without invoking embedding or Qdrant search APIs.

### 05. Unsaved Chat Histories [RESOLVED IN PHASE 5]
- **Symptom**: RAG Q&A returned completions to the browser without persisting message turns to PostgreSQL; refreshing the browser erased all conversation history.
- **Resolution**: Implemented automatic Get-or-Create session persistence in `chatController.js`, storing both user queries and assistant citations in the `messages` table, and added automatic frontend conversation re-hydration on notebook selection.

### 06. Qdrant Missing Payload Index (`Index required but not found for "notebook_id"`) [RESOLVED IN PHASE 3]
- **Symptom**: Asking a chat question in the UI threw HTTP 400 from Qdrant Cloud during vector search.
- **Resolution**: Updated `qdrantRepo.js` inside `ensureCollection()` to automatically invoke `client.createPayloadIndex` for both `notebook_id` and `source_id` using schema type `keyword` with in-memory caching.

### 07. Interactive Study Hub & Premium UI Polish [RESOLVED IN PHASE 8]
- **Symptom**: Source metadata summaries stored in PostgreSQL JSONB (`summary`, `main_topics`, `keywords`, `named_entities`) were only utilized for backend AI routing without empowering user-facing study interactions.
- **Resolution**: Implemented a tabbed **Interactive Study Hub** directly in the frontend workspace, providing automated executive summary cards, clickable study questions that bridge to the chat RAG AI, and interactive 3D vocabulary flip cards with instant AI explanation triggers.

---

## Active Bugs
*No active bugs currently open.*

---

## Future Enhancement Ideas
- **File Cleanliness**: Ensure temporary files saved by Multer inside the `uploads/` directory are deleted automatically from disk after extracting raw text to prevent disk bloating over time.
- **Upload Progress Bar**: Enhance front-end polling against `/api/notebooks/:id/sources` with graphical percentage loading bars.

