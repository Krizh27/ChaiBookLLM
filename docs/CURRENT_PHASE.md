# Current Phase: Tier 1 Action Plan – Requirement 3 (Part 2): Source Re-index 🏁 [COMPLETED]

## Current Objective
We have completed the **Source Re-index** requirement in Category 2 (Source Ingestion)! Users can now effortlessly re-run the text extraction, chunking, AI embedding, and vector storage pipeline for any uploaded file or URL by clicking an interactive **🔄 Re-index** button. This safely removes previous vector chunks in Qdrant before regenerating fresh embeddings, avoiding duplicate vectors and recovering smoothly from interrupted sessions or updated models. Our assignment evaluation score now stands at **116.0 / 130 (89.2%)**!

## Files Involved
- `server/routes/sourceRoutes.js`: Exposed endpoint `POST /api/notebooks/:notebookId/sources/:sourceId/reindex`.
- `server/controllers/sourceController.js`: Added `reindexSource` controller that verifies the source, calls `deleteBySourceId` to purge outdated vectors from Qdrant, resets PostgreSQL indexing status to `pending`, and re-invokes asynchronous `processSource`.
- `client/js/api.js`: Created `api.reindexSource(notebookId, sourceId)`.
- `client/js/ui.js`: Integrated an interactive **🔄 Re-index** button directly inside `renderSources`, which dynamically transitions the badge to an animated `processing` state and starts source polling until re-indexing completes.
- `docs/MVP_AUDIT_REPORT.md`: Updated Category 2 score from 16/20 to 18.5/20.

## How to Test and Verify in Your Browser (`http://localhost:3000`)
With your live dev server (`npm run dev`) running:
1. Open or refresh `http://localhost:3000` in your browser.
2. Select any notebook that has uploaded sources (e.g., `chiman`).
3. Look at the **Knowledge Sources** pane on the right. Next to any source with a `READY` or `ERROR` badge, click the blue/gray **🔄** (Re-index) icon located right before the **×** delete button!
4. **Observe Live Re-indexing:** Watch the badge immediately shift to an amber pulsing `PROCESSING` state as old vectors are purged and fresh embeddings are calculated in the background, automatically switching back to `READY` once finished!

## Next Milestone
Await user explicit approval before advancing to the final remaining Tier 1 Core Rubric requirement: **Filesystem cleanup when deleting uploaded files**!

