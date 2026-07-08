import {
  allowedCrmStatuses,
  allowedDataSources,
  type CrmImportRecord,
  type CsvSourceRow,
} from "../types/crm";

type AiExtractorOptions = {
  batchSize: number;
};

type AiBatchResponse = {
  records: CrmImportRecord[];
  provider: string;
  model?: string;
};

export async function extractCrmRecords(rows: CsvSourceRow[], options: AiExtractorOptions): Promise<AiBatchResponse> {
  if (rows.length === 0) {
    return { records: [], provider: "none" };
  }

  const batchSize = Math.max(1, options.batchSize || 20);
  const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  const model = process.env.AI_MODEL ?? "gemini-1.5-flash";
  const useGemini = Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY) && provider === "gemini";

  const records: CrmImportRecord[] = [];

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);

    if (!useGemini) {
      records.push(...batch.map((row) => normalizeRecordFromSource(row)));
      continue;
    }

    try {
      const extracted = await callGemini(batch, model);
      const normalized = batch.map((row, batchIndex) => normalizeRecordFromAi(extracted[batchIndex] ?? null, row));
      records.push(...normalized);
    } catch {
      records.push(...batch.map((row) => normalizeRecordFromSource(row)));
    }
  }

  return {
    records,
    provider: useGemini ? "gemini" : "heuristic",
    model: useGemini ? model : undefined,
  };
}

async function callGemini(batch: CsvSourceRow[], model: string) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");

  if (!apiKey) {
    throw new Error("Missing AI API key.");
  }

  const response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
      systemInstruction: {
        parts: [
          {
            text: [
              "You extract GrowEasy CRM records from CSV rows.",
              "Return only valid JSON with a top-level records array.",
              "Each record must include: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.",
              `Allowed crm_status values: ${allowedCrmStatuses.join(", ")}.`,
              `Allowed data_source values: ${allowedDataSources.join(", ")} or empty string.`,
              "created_at must be parseable by JavaScript Date.",
              "If multiple emails exist, use the first email and append the rest to crm_note.",
              "If multiple mobile numbers exist, use the first mobile and append the rest to crm_note.",
              "Keep crm_note single-line by escaping line breaks as \\n.",
            ].join(" "),
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({ records: batch }, null, 2),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

  return parseJsonArray(content);
}

function parseJsonArray(content: string) {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error("Empty AI response.");
  }

  try {
    const parsed = JSON.parse(trimmed) as { records?: unknown } | unknown[];
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { records?: unknown[] }).records)) {
      return (parsed as { records: unknown[] }).records;
    }
  } catch {
    // Fall through to bracket extraction.
  }

  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");

  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown[];
  }

  throw new Error("Unable to parse AI response JSON.");
}

function normalizeRecordFromAi(record: unknown, row: CsvSourceRow): CrmImportRecord {
  const base = isRecord(record) ? record : {};
  const sourceEmails = dedupe([...(row.emails ?? []), ...extractEmails(row.sourceText)]);
  const sourcePhones = dedupe([...(row.mobileNumbers ?? []), ...extractPhones(row.sourceText)]);

  const selectedEmail = pickString(base, ["email"]) || sourceEmails[0] || "";
  const selectedPhone = pickString(base, ["mobile_without_country_code", "mobile", "phone"]) || sourcePhones[0] || "";

  const noteParts = [
    pickString(base, ["crm_note", "note", "remarks"]),
    sourceEmails.slice(1).map((email) => `Additional email: ${email}`).join("; "),
    sourcePhones.slice(1).map((phone) => `Additional mobile: ${phone}`).join("; "),
  ]
    .filter(Boolean)
    .join("; ");

  return {
    created_at: ensureParsableDate(pickString(base, ["created_at"]) || new Date().toISOString()),
    name: pickString(base, ["name"]) || deriveName(row, selectedEmail),
    email: selectedEmail,
    country_code: pickString(base, ["country_code"]) || inferCountryCode(selectedPhone),
    mobile_without_country_code: selectedPhone,
    company: pickString(base, ["company"]),
    city: pickString(base, ["city"]),
    state: pickString(base, ["state"]),
    country: pickString(base, ["country"]),
    lead_owner: pickString(base, ["lead_owner"]),
    crm_status: sanitizeStatus(pickString(base, ["crm_status"])),
    crm_note: sanitizeText(noteParts || pickString(base, ["crm_note"])),
    data_source: sanitizeDataSource(pickString(base, ["data_source"])),
    possession_time: pickString(base, ["possession_time"]),
    description: sanitizeText(pickString(base, ["description"])),
  };
}

function normalizeRecordFromSource(row: CsvSourceRow): CrmImportRecord {
  const sourceEmails = dedupe([...(row.emails ?? []), ...extractEmails(row.sourceText)]);
  const sourcePhones = dedupe([...(row.mobileNumbers ?? []), ...extractPhones(row.sourceText)]);
  const selectedEmail = sourceEmails[0] || readField(row.fields, ["email", "email_address", "primary_email"]);
  const selectedPhone = sourcePhones[0] || readField(row.fields, ["mobile", "phone", "contact_number", "mobile_number"]);

  return {
    created_at: ensureParsableDate(readField(row.fields, ["created_at", "createdon", "date", "timestamp"]) || new Date().toISOString()),
    name: readField(row.fields, ["name", "lead_name", "full_name"]) || deriveName(row, selectedEmail),
    email: selectedEmail,
    country_code: readField(row.fields, ["country_code", "countrycode"]) || inferCountryCode(selectedPhone),
    mobile_without_country_code: selectedPhone,
    company: readField(row.fields, ["company", "organization", "business"]),
    city: readField(row.fields, ["city", "town"]),
    state: readField(row.fields, ["state", "province"]),
    country: readField(row.fields, ["country"]),
    lead_owner: readField(row.fields, ["lead_owner", "owner"]),
    crm_status: sanitizeStatus(guessStatus(row)),
    crm_note: sanitizeText(buildNote(row, sourceEmails, sourcePhones)),
    data_source: sanitizeDataSource(detectDataSource(row)),
    possession_time: readField(row.fields, ["possession_time", "possession"]),
    description: sanitizeText(readField(row.fields, ["description", "notes", "remarks", "comment"])),
  };
}

function guessStatus(row: CsvSourceRow) {
  const text = row.sourceText.toLowerCase();

  if (/(sale done|closed|won|booked|paid|deal closed|onboarding)/.test(text)) {
    return "SALE_DONE";
  }

  if (/(bad lead|not interested|spam|wrong number|do not contact)/.test(text)) {
    return "BAD_LEAD";
  }

  if (/(did not connect|no answer|busy|call back|unable to reach)/.test(text)) {
    return "DID_NOT_CONNECT";
  }

  return "GOOD_LEAD_FOLLOW_UP";
}

function detectDataSource(row: CsvSourceRow) {
  const text = row.sourceText.toLowerCase();
  for (const candidate of allowedDataSources) {
    if (text.includes(candidate.replace(/_/g, " ")) || text.includes(candidate)) {
      return candidate;
    }
  }

  return "";
}

function buildNote(row: CsvSourceRow, emails: string[], phones: string[]) {
  const extras = [
    ...emails.slice(1).map((email) => `Additional email: ${email}`),
    ...phones.slice(1).map((phone) => `Additional mobile: ${phone}`),
  ];

  const note = readField(row.fields, ["crm_note", "note", "remarks", "comment", "description"]);
  return sanitizeText([note, ...extras].filter(Boolean).join("; "));
}

function sanitizeStatus(value: string) {
  const normalized = value.trim().toUpperCase();
  return allowedCrmStatuses.includes(normalized as (typeof allowedCrmStatuses)[number])
    ? (normalized as (typeof allowedCrmStatuses)[number])
    : "GOOD_LEAD_FOLLOW_UP";
}

function sanitizeDataSource(value: string) {
  const normalized = value.trim();
  return allowedDataSources.includes(normalized as (typeof allowedDataSources)[number])
    ? (normalized as (typeof allowedDataSources)[number])
    : "";
}

function ensureParsableDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function inferCountryCode(phone: string) {
  const cleaned = phone.trim();
  if (cleaned.startsWith("+")) {
    const match = cleaned.match(/^\+\d{1,4}/);
    return match?.[0] ?? "";
  }

  return "";
}

function deriveName(row: CsvSourceRow, email: string) {
  if (email.includes("@")) {
    const localPart = email.split("@")[0] ?? "";
    return localPart
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  }

  return readField(row.fields, ["name", "lead_name", "full_name"]) || "";
}

function readField(fields: Record<string, string>, candidates: string[]) {
  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (fields[normalized]) {
      return fields[normalized];
    }
  }

  return "";
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value.trim();
    }
  }

  return "";
}

function sanitizeText(value: string) {
  return value.replace(/\r?\n/g, "\\n").trim();
}

function extractEmails(text: string) {
  return Array.from(new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((value) => value.trim())));
}

function extractPhones(text: string) {
  return Array.from(new Set((text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? []).map((value) => value.trim())));
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
