import express, { type Request, type Response } from "express";

type ImportLeadRow = Array<string | number | null | undefined>;

type ImportLeadsRequestBody = {
  fileName?: string;
  headers?: unknown[];
  rows?: unknown[];
};

const app = express();
const port = 3080;

app.use(express.json({ limit: "10mb" }));

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from Bun and TypeScript!" });
});

app.post("/import-leads", (req: Request<{}, {}, ImportLeadsRequestBody>, res: Response) => {
  const fileName = typeof req.body?.fileName === "string" ? req.body.fileName : "unknown.csv";
  const headers = Array.isArray(req.body?.headers)
    ? req.body.headers.filter((header: unknown): header is string => typeof header === "string")
    : [];
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

  const imported: Array<Record<string, unknown>> = [];
  const skipped: Array<Record<string, unknown>> = [];

  rows.forEach((row: unknown, index: number) => {
    if (!Array.isArray(row)) {
      skipped.push({
        rowNumber: index + 1,
        status: "Skipped",
        note: "Malformed row",
      });
      return;
    }

    const normalizedRow = row as ImportLeadRow;
    const rowMap = new Map<string, string>();

    headers.forEach((header, headerIndex) => {
      const value = normalizedRow[headerIndex];
      rowMap.set(header, typeof value === "string" ? value : value == null ? "" : String(value));
    });

    const leadName = rowMap.get("lead_name") ?? rowMap.get("name") ?? rowMap.get("full_name") ?? "";
    const email = rowMap.get("email") ?? "";
    const phone = rowMap.get("phone") ?? rowMap.get("mobile") ?? rowMap.get("contact") ?? "";
    const note = rowMap.get("crm_note") ?? rowMap.get("note") ?? rowMap.get("reason") ?? "";

    const isBlank = normalizedRow.every((value) => String(value ?? "").trim().length === 0);
    const missingIdentity = !leadName && !email && !phone;

    if (isBlank || missingIdentity) {
      skipped.push({
        rowNumber: index + 1,
        leadName,
        email,
        phone,
        status: "Skipped",
        note: isBlank ? "Empty row" : "Missing lead identifiers",
      });
      return;
    }

    imported.push({
      rowNumber: index + 1,
      leadName,
      email,
      phone,
      company: rowMap.get("company") ?? rowMap.get("organization") ?? "",
      countryCode: rowMap.get("country_code") ?? rowMap.get("countrycode") ?? "",
      city: rowMap.get("city") ?? "",
      status: "Imported",
      note: note || "Imported from CSV",
    });
  });

  res.json({
    fileName,
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    message: `Imported ${imported.length} records and skipped ${skipped.length} records.`,
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
