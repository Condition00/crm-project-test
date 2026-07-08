# CRM Project

This project is a CSV-to-CRM lead ingestion flow built. It lets a user upload a CSV, preview the rows in the browser, confirm the import, send the data through a Next.js proxy to the backend, and view the generated CRM leads on a separate results page.
The goal is to turn raw lead data into a structured, readable CRM-style output without requiring a database. The backend normalizes the incoming CSV/table payload, extracts or infers CRM fields, and returns JSON that the frontend renders as a lead table.

## What It Does

- Upload a CSV file in the frontend.
- Preview the parsed rows before import.
- Confirm the import and send the payload to the backend through `proxy.ts`.
- Generate structured CRM lead records from the uploaded data.
- Display the imported results on a dedicated `/generated-leads` page.
- Hide the raw JSON behind a dropdown for developers.

## Flow

1. The user drops a CSV file on the homepage.
2. The frontend parses the file and shows a preview table.
3. On confirm, the frontend POSTs the parsed rows to `/api/import-leads`.
4. `frontend/proxy.ts` forwards that request to the backend service.
5. The backend normalizes the rows, extracts CRM-ready fields, and returns a JSON response.
6. The frontend stores the response in session storage and opens the `/generated-leads` page.
7. The results page shows the imported leads in a CRM-style table and keeps the raw JSON collapsed by default.

## Project Structure

- `frontend/` - Next.js app with upload, preview, proxy, and results pages.
- `backend/` - Bun + Express service that parses CSV/table payloads and builds CRM lead records.
- `frontend/app/page.tsx` - upload and preview page.
- `frontend/app/generated-leads/page.tsx` - results page for generated leads.
- `frontend/proxy.ts` - proxy layer that forwards import requests to the backend.

## Setup

### Frontend

```bash
cd frontend
bun install
bun run dev
```

### Backend

```bash
cd backend
bun install
bun run index.ts
```

The frontend runs on `http://localhost:3000` and the backend runs on `http://localhost:3080` by default.

## Environment Variables

Backend AI settings:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
AI_MODEL=gemini-1.5-flash
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
AI_BATCH_SIZE=20
```

If `GEMINI_API_KEY` is not set, the backend falls back to deterministic heuristic extraction.

## API Overview

The main import endpoint accepts a CSV text payload or a parsed table payload and returns a structured CRM response.

Endpoint:

```http
POST /api/import-leads
```

Example request:

```json
{
	"fileName": "sample.csv",
	"headers": ["name", "email", "phone"],
	"rows": [
		["John Doe", "john@example.com", "+91-9876543210"]
	]
}
```

Example response shape:

```json
{
	"success": true,
	"file_name": "sample.csv",
	"source_format": "table",
	"total_rows": 1,
	"valid_rows": 1,
	"imported_rows": 1,
	"skipped_rows": 0,
	"records": [],
	"skipped_records": [],
	"provider": "gemini",
	"model": "gemini-1.5-flash"
}
```

See [backend/README.md](backend/README.md) for the full API contract and backend behavior.

## Validation

The following checks have been run during development:

- Frontend production build passes.
- Backend service builds/runs with Bun.
- Import flow works through the Next.js proxy.
- Results page loads the imported JSON from session storage.

## Edge Cases Handled

- Invalid file types are rejected before parsing.
- Empty CSV uploads are rejected.
- Rows without email or mobile are skipped on import.
- Failed import requests show an error state.
- Missing Gemini credentials fall back to heuristic extraction.

## Future Improvements

- Add persistent storage for imported leads.
- Add pagination and search on the generated leads page.
- Add CSV export for the generated CRM records.
- Add authentication or per-user workspaces.
- Add richer validation and mapping rules for messy CSV files.

## Demo Assets


## Limitations

- Imported data is not persisted after refresh because the project is intentionally stateless.
- The results page depends on session storage, so direct access without a recent import redirects back to the homepage.
- AI-based extraction quality depends on the input CSV quality and the availability of the Gemini API key.

## Notes

This repository is intentionally split into a frontend app and a backend service so the data flow is easy to understand during review.
