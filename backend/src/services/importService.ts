import { parseCsvText } from "./csvParser";
import { extractCrmRecords } from "./aiExtractor";
import type { CrmImportResponse, CsvSourceRow, ParsedCsvPayload, SkippedRecord } from "../types/crm";

type ImportInput = {
  body: unknown;
  contentType: string;
  fileName: string;
};

export async function importLeadCsv(input: ImportInput): Promise<CrmImportResponse> {
  const parsed = normalizePayload(input.body, input.contentType, input.fileName);
  const skippedRecords: SkippedRecord[] = [];

  const validRows: CsvSourceRow[] = [];
  for (const row of parsed.rows) {
    const signals = getContactSignals(row.fields);

    if (!signals.email && !signals.mobile) {
      skippedRecords.push({
        row_index: row.rowIndex,
        reason: "Skipped because the record contains neither email nor mobile number.",
        fields: row.fields,
      });
      continue;
    }

    validRows.push({
      ...row,
      emails: signals.emails,
      mobileNumbers: signals.mobileNumbers,
      sourceText: Object.values(row.fields).join(" | "),
    });
  }

  const extraction = await extractCrmRecords(validRows, {
    batchSize: Number(process.env.AI_BATCH_SIZE ?? 20),
  });

  return {
    success: true,
    file_name: input.fileName || parsed.fileName || "",
    source_format: parsed.sourceFormat,
    total_rows: parsed.rows.length,
    valid_rows: validRows.length,
    imported_rows: extraction.records.length,
    skipped_rows: skippedRecords.length,
    records: extraction.records,
    skipped_records: skippedRecords,
    provider: extraction.provider,
    model: extraction.model ?? "",
  };
}

function normalizePayload(body: unknown, contentType: string, fileName: string): ParsedCsvPayload {
  if (typeof body === "string") {
    return buildFromCsvText(body, fileName, contentType);
  }

  if (isRecord(body)) {
    if (typeof body.csvText === "string") {
      return buildFromCsvText(body.csvText, readOptionalString(body.fileName) || fileName, contentType);
    }

    if (typeof body.csv === "string") {
      return buildFromCsvText(body.csv, readOptionalString(body.fileName) || fileName, contentType);
    }

    if (Array.isArray(body.headers) && Array.isArray(body.rows)) {
      return buildFromTable(body.headers, body.rows, readOptionalString(body.fileName) || fileName);
    }
  }

  throw createImportError("Request body must contain CSV text or parsed headers and rows.", 400);
}

function buildFromCsvText(csvText: string, fileName: string, _contentType: string): ParsedCsvPayload {
  const parsed = parseCsvText(csvText);
  return buildFromTable(parsed.headers, parsed.rows, fileName, "csv");
}

function buildFromTable(headersInput: unknown[], rowsInput: unknown[], fileName = "", sourceFormat: ParsedCsvPayload["sourceFormat"] = "table"): ParsedCsvPayload {
  const headers = headersInput.map((header, index) => normalizeHeaderValue(header, index));
  const rows = rowsInput.map((row, rowIndex) => normalizeSourceRow(row, headers, rowIndex + 1));

  return {
    fileName,
    sourceFormat,
    headers,
    rows,
  };
}

function normalizeSourceRow(row: unknown, headers: string[], rowIndex: number): CsvSourceRow {
  if (Array.isArray(row)) {
    const fields: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      fields[header] = sanitizeCell(row[headerIndex]);
    });

    return {
      rowIndex,
      headers,
      fields,
      rawValues: row.map((value) => sanitizeCell(value)),
      sourceText: Object.values(fields).join(" | "),
      emails: [],
      mobileNumbers: [],
    };
  }

  if (isRecord(row)) {
    const fields: Record<string, string> = {};

    Object.entries(row).forEach(([key, value]) => {
      fields[normalizeHeaderValue(key)] = sanitizeCell(value);
    });

    return {
      rowIndex,
      headers,
      fields,
      rawValues: Object.values(fields),
      sourceText: Object.values(fields).join(" | "),
      emails: [],
      mobileNumbers: [],
    };
  }

  return {
    rowIndex,
    headers,
    fields: {},
    rawValues: [],
    sourceText: "",
    emails: [],
    mobileNumbers: [],
  };
}

function getContactSignals(fields: Record<string, string>) {
  const joinedText = Object.values(fields).join(" | ");
  const emails = extractEmails(joinedText);
  const mobileNumbers = extractPhones(joinedText);

  return {
    email: emails[0] ?? readField(fields, ["email", "email_address", "primary_email", "mail"]),
    mobile: mobileNumbers[0] ?? readField(fields, ["mobile", "phone", "contact_number", "mobile_number"]),
    emails,
    mobileNumbers,
  };
}

function extractEmails(text: string) {
  return Array.from(new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((value) => value.trim())));
}

function extractPhones(text: string) {
  return Array.from(new Set((text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? []).map((value) => value.trim())));
}

function readField(fields: Record<string, string>, candidates: string[]) {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeaderValue(candidate);
    const exact = fields[normalizedCandidate];
    if (exact) {
      return exact;
    }
  }

  return "";
}

function normalizeHeaderValue(value: unknown, index?: number) {
  const raw = sanitizeCell(value).replace(/^\uFEFF/, "").trim();
  if (raw.length > 0) {
    return raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  return `column_${(index ?? 0) + 1}`;
}

function sanitizeCell(value: unknown) {
  return String(value ?? "").replace(/\r?\n/g, "\\n").trim();
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createImportError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}
