# Phase 7: Intelligent Source Selection & Pre-Retrieval Routing Layer

## Goal
Eliminate wasteful vector searching across unrelated documents and stop LLMs from spending token bandwidth reasoning on disparate topic mixtures (e.g. physics vs. programming). Implement a lightweight pre-retrieval routing triage switch board using structured document summaries stored in PostgreSQL.

## Features Implemented
- **One-Time Metadata Ingestion**: Modified `indexingService.js` to extract lightweight JSON summary metadata (`summary`, `main_topics`, `keywords`, `named_entities`) via OpenAI's JSON completion mode upon initial document upload and save it into PostgreSQL `sources.metadata`.
- **Pre-Retrieval AI Triage Router**: Added `routeQuery()` in `metadata.js` that evaluates the user's question against PostgreSQL source summaries prior to vector searching.
- **Short-Circuit Protection**: Automatically intercepts illogical multi-document mixtures (`unrelated_combination`) and unrelated questions (`out_of_scope`) directly from the routing evaluation without touching Qdrant or embedding APIs.
- **Selective Vector Searching**: Upgraded Qdrant filtering (`searchByNotebook`) to explicitly match against an array of router-selected document UUIDs (`match: { any: selectedSourceIds }`), restricting retrieval strictly to pertinent files.

## Files Created / Modified
- `scripts/init-db.js`: Added `metadata JSONB DEFAULT NULL` column to `sources` table with zero-downtime migration support.
- `server/ai/metadata.js`: **[NEW]** Core module containing `generateSourceMetadata` and `routeQuery`.
- `server/services/indexingService.js`: Connected metadata summary generation during source processing.
- `server/repositories/qdrantRepo.js`: Added compound source ID array keyword filtering.
- `server/services/ragService.js`: Inserted pre-retrieval triage evaluation before embedding and vector search steps.

## Important Concepts Learned
- **Pre-Retrieval Routing vs. Post-Retrieval Filtering**: Searching an entire vector collection across dozens of mismatched PDFs guarantees noisy top-k chunks because similarity algorithms force the closest vector matches regardless of topic. Routing at the document summary level acts like an experienced human research librarian selecting which library books to open before scanning individual pages.
- **Token Bandwidth & Economics**: Checking 5-10 paragraph summaries from PostgreSQL consumes ~200 tokens. Unconditionally retrieving 5 large text chunks (1,000 words each) and passing them into deep reasoning LLMs consumes ~2,000–3,000 tokens per chat turn. Pre-retrieval triage cuts token waste by over 80% on large multi-document notebooks.

## Completion Status
✅ **COMPLETED & UNDER VERIFICATION**
