# Phase 2: Document Ingestion & Source Management

## Goal
Establish a robust, reliable, and secure file upload and URL linking pipeline using Express, Multer, and PostgreSQL, ensuring proper error handling and clean disk utilization.

## Features Implemented
- Automatic creation of local `uploads/` directory on server startup to prevent runtime file system exceptions on clean installations.
- Parent notebook existence verification before storing file metadata in the relational database.
- Strict input file format validation restricting uploads exclusively to supported `.pdf` and `.txt` documents.
- Automatic disk cleanup (`fs.unlinkSync`) removing unsupported or orphaned attachments when validation fails.

## Files Modified
- `server/routes/sourceRoutes.js`: Added startup directory check (`fs.mkdirSync`) and linked to Multer storage destination.
- `server/controllers/sourceController.js`: Added database lookup to confirm notebook existence, added file extension validation, and added automatic file deletion on error states.

## APIs Verified
- `GET /api/notebooks/:notebookId/sources`: Lists all attached reference documents ordered by newest first.
- `POST /api/notebooks/:notebookId/sources`: Accepts multipart form file upload or JSON `{ "url": "..." }`, creating a record in PostgreSQL with status set to `pending` (returning HTTP 202 Accepted).
- `DELETE /api/notebooks/:notebookId/sources/:sourceId`: Removes source record from Postgres and triggers background vector deletion in Qdrant.

## Important Concepts Learned
- **Orphan File Clean-Up**: When using middleware like Multer, files are saved to the hard drive *before* controller code runs. If validation fails later in the controller (e.g., non-existent notebook ID or illegal file extension), the server must explicitly delete (`unlink`) the saved file from disk, otherwise storage will slowly leak over time.
- **Fire-and-Forget Asynchronous Processing**: After saving a source row to PostgreSQL with status `pending`, we return a `202 Accepted` HTTP response immediately while triggering `processSource(...)` asynchronously in the background. This prevents slow AI embedding operations from timing out user HTTP requests.
- **Input Guardrails**: Restricting file extensions at the controller boundary ensures downstream indexing extractors (`pdf-parse`, plain text reader) never crash when encountering unsupported binary blobs.

## Decisions Made
- **Early Rejection with Cleanup**: Rejecting invalid file extensions cleanly with an HTTP 400 status before attempting text chunking saves valuable server compute and prevents polluting our vector database.

## Problems Encountered
- *None during implementation; proactively patched missing folder exception and orphaned upload file retention risks.*

## Testing Checklist
Before proceeding to Phase 3, perform these manual tests using your local dev server (`http://localhost:3000`) or API tester (Postman/curl):
- [ ] **Create a Notebook**: Send `POST /api/notebooks` with `{ "name": "Testing Phase 2" }`. Save the returned `id` (UUID).
- [ ] **Upload a Valid Text File**: Create a simple `.txt` file and send as a form-data file upload (`field name: file`) to `POST /api/notebooks/<id>/sources`. Ensure it returns a source object with `"indexing_status": "pending"`.
- [ ] **Upload an Invalid File Type**: Try uploading a `.jpg` or `.exe` file to the same endpoint. Ensure the server rejects it with `400 Bad Request` and `"Only .txt and .pdf files are currently supported"`. Verify the file is deleted from your local `uploads/` folder.
- [ ] **Submit to Non-Existent Notebook**: Send a file to an arbitrary UUID like `POST /api/notebooks/00000000-0000-0000-0000-000000000000/sources`. Ensure it returns `404 Not Found`.

## Completion Status
✅ **COMPLETED (Pending User Testing Verification)**
