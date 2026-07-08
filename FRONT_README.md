# Frontend

This is the Next.js App Router frontend for the CRM CSV import flow. It provides the upload page, CSV preview, confirm action, proxy wiring, and the generated leads page.

## Run

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

- `/` - upload and preview page.
- `/generated-leads` - CRM-style results page.

## Proxy Setup

The frontend uses `proxy.ts` to forward `/api/*` requests to the backend service.

Default backend target:

```bash
http://localhost:3080
```

If needed, set `BACKEND_URL` to point the proxy at a different backend host.

## Flow

1. Upload a CSV file on the homepage.
2. Review the parsed preview table.
3. Click Confirm to send the data to the backend through the proxy.
4. The backend response is stored in session storage.
5. The app navigates to `/generated-leads` and renders the imported records.

## Validation

Checked during development:

- Frontend production build passes.
- Proxy forwarding works for the import request.
- The generated leads page loads from session storage.

