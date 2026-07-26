# Phase 5: Chat History & Session Persistence

## Goal
Persist all user prompts and AI responses into our relational Neon PostgreSQL database and automatically load conversation history whenever a user opens a notebook.

## Features Implemented
- **Get-or-Create Session Helper**: Automatically locates or initializes a default chat session (`chat_sessions` table) for any target notebook without forcing extra client requests.
- **Message Turn Recording**: Saves incoming user messages (`role='user'`) and generated AI completions (`role='assistant'`) with their citation structures (`JSONB`) directly into the PostgreSQL `messages` table.
- **Conversation Recovery API**: New GET endpoint returning chronological message arrays for UI hydration.
- **Frontend Hydration**: UI clears leftover DOM bubbles when switching between notebooks and renders previous conversations with clickable citation chips.

## Files Modified
- `server/routes/chatRoutes.js`: Mapped `GET /` to retrieve message history.
- `server/controllers/chatController.js`: Added `getHistory` handler and injected session management and database insertion logic into the existing `chat` handler.
- `client/js/api.js`: Added `getChatHistory(notebookId)` fetch helper.
- `client/js/ui.js`: Implemented `renderChatHistory(notebookId)` and tied it into notebook selection events.

## Important Concepts Learned
- **Get-or-Create Pattern**: When designing MVPs, forcing frontends to call explicit setup endpoints (e.g., `POST /api/sessions` before sending the very first chat message) increases API complexity and frontend state bug risk. Checking for an existing session and creating one on the fly (`SELECT ... LIMIT 1` -> fallback `INSERT`) produces resilient backend services.
- **JSONB in PostgreSQL**: Storing structured citation arrays as PostgreSQL `JSONB` gives us relational foreign key safety on chat sessions while maintaining schema flexibility for complex citation objects without needing extra join tables.
- **DOM Hydration vs. State Contamination**: Why clear `chatMessages.innerHTML` immediately when selecting a notebook? If a user clicks Notebook A and then Notebook B, failing to wipe the message box results in visual contamination where messages from unrelated notebooks mix on screen.

## Decisions Made
- **Implicit Single-Session Architecture (V1 MVP)**: Confined conversations to one long-lived timeline per notebook rather than creating complex branch threading or multi-tab chat tabs, keeping cognitive load low for beginners.

## Problems Encountered
- *None during implementation; cleanly integrated across existing routes and database schema tables.*

## Testing Checklist
- [ ] Send a chat prompt via UI and confirm both user query and assistant response save into Neon DB without errors.
- [ ] Refresh your web browser while inside a notebook and confirm previous chat messages re-render immediately on load.
- [ ] Switch between two different notebooks and confirm chat histories swap out cleanly without mixing messages.

## Completion Status
✅ **COMPLETED**
