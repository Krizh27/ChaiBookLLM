# MVP Refinement – Feature 1: Source Viewer

## 1. Goal & Rationale
While citations (e.g., `Ref [1]`) were previously displayed in chat messages, users could only view a raw snippet inside a basic modal without being able to verify the material in context or inspect the full original document. 

**Feature 1 (Source Viewer)** transforms the citation modal into an immersive, native source inspection experience across every supported file type:
- **PDF Documents**: Loads the complete PDF document inside a native built-in browser viewport, automatically targeting page 1 and injecting search terms (`#search=keyword`) corresponding to the retrieved text snippet.
- **Text & Subtitles (.txt, .srt, .vtt)**: Fetches and displays the entire original file, performs string matching to wrap the cited passage in an animated highlight tag (`<mark>`), and automatically scrolls directly to the cited chunk.
- **Webpage URLs**: Dynamically renders an live iframe web preview alongside a highlighted snippet reference box, while generating a modern browser **Text Fragment URL** (`#:~:text=...`) to allow opening the full external web page directly highlighted in a new tab.
- **YouTube Lectures**: Extracts video ID and estimates timestamp offset from the retrieved chunk index (`chunk_index * 60s`), launching an embedded auto-playing video player directly at the referenced timestamp.

## 2. Technical Architecture & Modifications
- **Static File Serving (`server.js`)**: Configured express static routing (`/uploads`) to securely serve uploaded disk source materials directly to browser inspect viewports.
- **Citation Enrichment (`ragService.js`)**: Joined Qdrant vector payload search results with PostgreSQL source records (`type`, `file_path_or_url`) to return enriched citation metadata to the client.
- **Frontend Inspector UI (`index.html` & `ui.js`)**: Upgraded the simple modal into a multi-format inspection suite (`id="citation-modal"`) equipped with document type headers, dynamic container swapping, and external link navigation.

## 3. Testing Instructions
1. Open or refresh `http://localhost:3000` in your web browser.
2. Select any notebook containing indexed sources (PDF, Text/SRT/VTT, YouTube, or URL) and ask a question in the **💬 Research & Sources** chat tab.
3. Click on any returned citation chip (e.g., `Ref [1]`).
4. **Verify behaviors per format:**
   - **PDF**: Confirm the browser's PDF reader opens with the full document inside the modal.
   - **Text / Subtitle**: Confirm the entire text file loads, scrolls automatically down to the matching cited passage, and pulses in a high-visibility yellow highlight.
   - **YouTube**: Confirm the video embeds and automatically jumps to the timestamp associated with the retrieved chunk.
   - **Website**: Confirm the live web preview loads alongside the snippet box, and test clicking **↗ Open in New Tab** to verify Text Fragment deep-linking.
