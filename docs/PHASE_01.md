# Phase 1: Foundation & Database Setup

## Goal
Establish a structured Node.js/Express backend connected to a hosted PostgreSQL instance (Neon DB) using standard SQL scripts and the `pg` library.

## Features Implemented
- Basic Express HTTP server with middleware for CORS, JSON body parsing, and static HTML file serving.
- Neon DB connection pool configuration with mandatory SSL options.
- Initialization script to set up UUID extensions and core database schema tables.

## Files Created / Modified
- `server.js`: Core server setup and API routing.
- `db.js`: Database connection pool using `pg` and environment variables.
- `.env`: Storing credentials (`DATABASE_URL`, API keys).
- `scripts/init-db.js`: Executable script for creating relational tables.

## APIs Added
- `GET /api/health`: Healthcheck endpoint returning simple operational timestamp.
- Route mounts for `/api/notebooks`, `/api/notebooks/:notebookId/sources`, and `/api/notebooks/:notebookId/chat`.

## Database Changes
Initialized four essential tables in PostgreSQL:
1. `notebooks`: Stores project containers (`id`, `name`, `created_at`).
2. `sources`: Tracks references uploaded to notebooks (`id`, `notebook_id`, `type`, `title`, `file_path_or_url`, `indexing_status`, `error_message`).
3. `chat_sessions`: Groups user conversation histories under notebooks.
4. `messages`: Stores individual chat turns (`role`, `content`, `citations`).

## Important Concepts Learned
- **Connection Pools (`pg.Pool`)**: Instead of opening and closing a new database connection on every HTTP request, a connection pool keeps multiple reusable connections open, improving API performance.
- **SSL in Remote DBs**: Hosting providers like Neon require SSL encryption (`ssl: { rejectUnauthorized: false }`) to ensure data sent between your server and the database cannot be intercepted.
- **Cascading Deletes**: Using `ON DELETE CASCADE` in SQL foreign keys guarantees that deleting a notebook cleanly eliminates its orphan sources, chat sessions, and messages automatically.

## Decisions Made
- **Raw SQL via `pg` over ORMs**: Avoided heavy frameworks like Prisma or Sequelize to keep code transparent and easy to master for backend beginners.

## Problems Encountered
- **Windows Script Execution Policy**: Running `npm run init-db` encountered a PowerShell security policy restriction.
- *Resolution*: Executed `node scripts/init-db.js` directly via executable invocation, cleanly applying all migrations to Neon DB.

## Improvements for Future
- Add automatic migration running on server boot if table creation needs to happen continuously, or transition to lightweight migration trackers if table schemas evolve.

## Testing Checklist
- [x] Database credentials successfully authenticate against Neon DB cloud instance.
- [x] Execution of `init-db.js` completes without errors and logs success.
- [x] Express dev server boots cleanly on port 3000 (`npm run dev`).

## Completion Status
✅ **COMPLETED**
