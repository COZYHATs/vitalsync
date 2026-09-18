# VitalSync — Medical Document Timeline, Phase 1

An MVP foundation for safely ingesting medical PDFs and images into a patient-scoped document system. PostgreSQL stores authoritative metadata; original files stay in local filesystem storage. This is a security-conscious architecture, **not** a certified HIPAA, GDPR, or medical-record system.

## Real-world design corrections

| Original requirement | Practical solution | Reason |
|---|---|---|
| AI can help with records | AI is represented only by future interfaces; candidate output must later be reviewed and verified | Medical data must not become fact merely because a model produced it. |
| Delete a document | User requests; an admin approves/rejects; approval soft-deletes metadata and retains the original | Preserves recovery, review, and auditability. |
| Obsidian organization | `KnowledgeStore` is only a constrained future contract; PostgreSQL is authoritative | A notes vault is not a transactional medical database. |
| Correct data | Original objects are immutable; future corrections must be separate, traceable structured records | Never overwrite the medical source. |

## Architecture

`browser → Gin REST API → service/authorization logic → PostgreSQL metadata + local Store`

The storage `Store` interface can be replaced by MinIO/S3 without changing document handlers. `internal/future/contracts.go` holds inactive contracts for extraction, timeline events, and Obsidian-style knowledge operations. No OCR, extraction, AI decisions, timeline, or insight generation is implemented.

## Requirements

- Go 1.23+
- PostgreSQL 14+

## Setup

1. Copy `.env.example` to `.env`, set a long random `SESSION_SECRET`, and create the PostgreSQL database.
2. Apply the migration:

   ```powershell
   psql "$env:DATABASE_URL" -f migrations/001_phase1.sql
   ```

3. Create the first administrator manually (registration always creates a normal user):

   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
   ```

4. Load environment variables using your shell or an environment loader, then run:

   ```powershell
   go mod tidy
   go run ./cmd/server
   ```

Open `http://localhost:8080`. The backend serves the vanilla HTML/CSS/JS frontend.

## API and access control

The API is under `/api`: auth, patients, documents, and administrator deletion-review endpoints follow the Phase 1 specification. Passwords are bcrypt hashes. Server-side sessions are stored as SHA-256 token hashes and delivered in an HttpOnly, SameSite=Lax cookie (marked Secure in production). Every patient and document query joins through the authenticated user, so URL ID changes cannot cross ownership boundaries.

Uploads accept PDF/JPG/JPEG/PNG only, validate content sniffing and extension, reject empty/oversize uploads (default 10 MiB), create UUID storage keys, calculate SHA-256 hashes, and reject an identical file for the same patient. The original name is metadata only. Uploads live at `STORAGE_PATH` with owner-only filesystem permissions.

## Deletion workflow

`user request → DELETION_REQUESTED → admin approve/reject → audit`

Approval sets the document state to `DELETED` and retains the local original. Physical destruction is deliberately not implemented; it requires a separately controlled retention process. Important actions write `audit_logs` without document contents.

## Testing

Run:

```powershell
go test ./...
go vet ./...
```

`internal/storage/local_test.go` covers save/open and path-traversal rejection. End-to-end database tests are intentionally not fabricated: they should run against an isolated PostgreSQL instance/transaction fixture before production use, covering registration/login, ownership isolation, upload validation, duplicate detection, and deletion approval.

## Project layout

- `cmd/server`: Gin API and HTTP middleware
- `internal/storage`: replaceable local original-file storage
- `internal/future`: inactive AI, timeline, and knowledge-store contracts
- `migrations`: PostgreSQL Phase 1 schema
- `web`: vanilla frontend

## Known limitations / next phase

The project has no OCR, clinical extraction, verified timeline, relationship graph, analytics, EMR/FHIR integration, mobile app, or automated hard-delete. Those capabilities must preserve source references, candidate/verified separation, explicit human review, and audit history.
