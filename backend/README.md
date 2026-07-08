# Backend

This service receives CSV or table-shaped lead data, normalizes it, extracts CRM fields, and returns structured JSON for the frontend.

## Install

```bash
bun install
```

## Run

```bash
bun run index.ts
```

The service listens on port `3080` by default.

## Environment Variables

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
AI_MODEL=gemini-1.5-flash
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
AI_BATCH_SIZE=20
```

Gemini is the default provider. If no Gemini API key is available, the backend falls back to heuristic extraction so the import still works.

## API Contract

### `POST /api/import-leads`

Accepts either raw CSV text or a parsed table payload.

Example table payload:

```json
{
	"fileName": "sample.csv",
	"headers": ["name", "email", "phone"],
	"rows": [
		["John Doe", "john@example.com", "+91-9876543210"]
	]
}
```

Example response:

```json
{
	"success": true,
	"file_name": "sample.csv",
	"source_format": "table",
	"total_rows": 1,
	"valid_rows": 1,
	"imported_rows": 1,
	"skipped_rows": 0,
	"records": [
		{
			"created_at": "2026-07-08T10:57:48.142Z",
			"name": "John Doe",
			"email": "john@example.com",
			"country_code": "+91",
			"mobile_without_country_code": "9876543210",
			"company": "",
			"city": "",
			"state": "",
			"country": "",
			"lead_owner": "",
			"crm_status": "GOOD_LEAD_FOLLOW_UP",
			"crm_note": "",
			"data_source": "",
			"possession_time": "",
			"description": ""
		}
	],
	"skipped_records": [],
	"provider": "gemini",
	"model": "gemini-1.5-flash"
}
```

## Behavior Notes

- Rows without email or mobile are skipped.
- The backend normalizes CRM status into one of the allowed values.
- Data source values are normalized to the supported set when detected.
- AI extraction is batched to keep responses manageable.
- When Gemini is unavailable, deterministic fallback logic still produces a valid response.

## Validation

Checked during development:

- Bun service starts successfully.
- CSV/table payloads are accepted.
- The API returns the expected CRM response shape.

