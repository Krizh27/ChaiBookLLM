# Current Phase: MVP Refinement Sprint – Feature 1: Source Viewer 🏁 [COMPLETED]

## Current Objective
Implement **Feature 1 (Source Viewer)** as part of our V1 MVP Refinement Sprint. Clicking any citation chip (`Ref [N]`) now immediately launches an interactive multi-format source inspector capable of viewing full PDFs, auto-scrolling & highlighting text/subtitle files, embedding timestamped YouTube lectures, and previewing web pages with text-fragment deep links.

## Files Involved
- `server.js`: Added Express static serving for the `/uploads` directory.
- `server/services/ragService.js`: Enriched returned citation objects by merging Qdrant search results with PostgreSQL source properties (`source_type`, `url_or_path`, `chunk_index`).
- `client/index.html`: Upgraded the citation modal layout into an expansive, dynamic multi-format inspection suite.
- `client/js/ui.js`: Created `openSourceViewer(citation)` to route inspection viewports dynamically for PDF, Text, Subtitles, YouTube, and Website sources.
- `docs/PHASE_09_FEATURE_1.md`: Architectural documentation and test instructions for Feature 1.

## How to Test and Verify in Your Browser (`http://localhost:3000`)
Your application server (`npm run dev`) is live! Verify Feature 1 with these testing steps:

### Step 1: Ask a Question with Citations
1. Open or refresh `http://localhost:3000` and select a notebook with existing uploaded sources.
2. Ask a research question in the chat bar and wait for the AI assistant to respond with citation reference chips (e.g. `Ref [1]`, `Ref [2]`).

### Step 2: Test Multi-Format Source Inspection
Click on any citation chip to test the Source Viewer:
- **For TXT / SRT / VTT Files**: Notice how the full document loads into the modal viewer, automatically scrolls down to the exact retrieved chunk, and wraps the cited passage in an animated yellow highlight tag (`<mark>`)!
- **For PDF Files**: The full built-in PDF document reader loads directly inside the viewer iframe, allowing immediate document search and verification.
- **For YouTube Videos**: An embedded video player launches directly at the estimated second timestamp (`chunk_index * 60s`), letting you listen to the exact lecture segment!
- **For Web URLs**: Displays a live web preview accompanied by a high-visibility citation snippet box and an **↗ Open in New Tab** button featuring automatic Text Fragment deep-linking!

## Next Milestone
Await user confirmation before initiating **Feature 2 — Better Citation UX**!

