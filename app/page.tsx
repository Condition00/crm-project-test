"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";

type ParsedRow = string[];

export type BackendLeadRecord = {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
};

export type BackendImportResponse = {
  success: boolean;
  file_name: string;
  source_format: string;
  total_rows: number;
  valid_rows: number;
  imported_rows: number;
  skipped_rows: number;
  records: BackendLeadRecord[];
  skipped_records: Array<{
    row_index: number;
    reason: string;
  }>;
  provider: string;
  model: string;
};

const SAMPLE_CSV = `# Sample CRM Records
created_at,name,email,country_code,mobile_without_country_code,company,city,state,country,lead_owner,crm_status,crm_note,data_source,possession_time,description

2026-05-13 14:20:48,John Doe,john.doe@example.com,+91,9876543210,GrowEasy,Mumbai,Maharashtra,India,test@gmail.com,GOOD_LEAD_FOLLOW_UP,Client is asking to reschedule demo,,,

2026-05-13 14:25:30,Sarah Johnson,sarah.johnson@example.com,+91,9876543211,Tech Solutions,Bangalore,Karnataka,India,test@gmail.com,DID_NOT_CONNECT,"Person was busy, will try again next week",,,

2026-05-13 14:30:15,Rajesh Patel,rajesh.patel@example.com,+91,9876543212,Startup Inc,Delhi,Delhi,India,test@gmail.com,BAD_LEAD,Not interested in our services,,,

2026-05-13 14:35:22,Priya Singh,priya.singh@example.com,+91,9876543213,Enterprise Corp,Pune,Maharashtra,India,test@gmail.com,SALE_DONE,"Deal closed, onboarding in progress",,,`;

export default function Home() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState("Drop a CSV to preview it.");
  const [error, setError] = useState("");
  const [sampleUrl, setSampleUrl] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    setSampleUrl(url);

    return () => URL.revokeObjectURL(url);
  }, []);

  const previewColumns = useMemo(() => ["#", ...headers], [headers]);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a CSV file.");
      setStatus("Invalid file selected.");
      return;
    }

    setError("");
    setFileName(file.name);
    setStatus("Parsing CSV...");

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        throw new Error("The CSV needs a header row and at least one data row.");
      }

      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setStatus(`Parsed ${parsed.rows.length.toLocaleString()} rows.`);
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : "Unable to parse the CSV file.";
      setError(message);
      setHeaders([]);
      setRows([]);
      setStatus("Parsing failed.");
    }
  }

  async function handleConfirmImport() {
    try {
      setIsConfirming(true);
      setError("");

      const response = await fetch("/api/import-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          headers,
          rows,
        }),
      });

      if (!response.ok) {
        throw new Error(`Import failed with status ${response.status}`);
      }

      const result = (await response.json()) as BackendImportResponse;
      setStatus(`Imported ${result.imported_rows.toLocaleString()} records.`);
      window.sessionStorage.setItem("importResult", JSON.stringify(result));
      router.push("/generated-leads");
    } catch {
      setStatus("Import request failed.");
    } finally {
      setIsConfirming(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070b] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <div
            onDragEnter={() => setDragActive(true)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                return;
              }
              setDragActive(false);
            }}
            onDrop={handleDrop}
            className={`mx-auto flex min-h-[340px] w-2xl cursor-pointer items-center justify-center rounded-[28px] border border-dashed px-6 py-10 text-center transition-colors shadow-[0_1px_0_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.28)] ${dragActive ? "border-emerald-300/70 bg-emerald-400/10" : "border-white/15 bg-white/[0.03]"}`}
            onClick={() => inputRef.current?.click()}
          >
            <div className="space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-emerald-300">
                ↑
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">Drop your CSV file here</h1>
                <p className="text-sm text-zinc-400">or click to browse</p>
              </div>
              {fileName ? <p className="text-sm text-zinc-300">{fileName}</p> : null}
              {sampleUrl ? (
                <a
                  href={sampleUrl}
                  download="sample.csv"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-400/15"
                >
                  Download sample CSV
                </a>
              ) : null}
            </div>

            <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleInputChange} />
          </div>

          {error ? <p className="text-center text-sm text-rose-200">{error}</p> : null}
          <p className="text-center text-sm text-zinc-400">{status}</p>

          {rows.length > 0 ? (
            <section className="rounded-[28px] border border-zinc-800 bg-[#05070b] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04),0_18px_45px_rgba(0,0,0,0.18)] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Preview</h2>
                  <p className="text-sm text-zinc-400">Parsed column names, layouts, and structures</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileName("");
                    setHeaders([]);
                    setRows([]);
                    setStatus("Drop a CSV to preview it.");
                    setError("");
                    if (inputRef.current) {
                      inputRef.current.value = "";
                    }
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="overflow-auto rounded-2xl border border-white/8 bg-zinc-900">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur-[2px]">
                    <tr>
                      {previewColumns.map((column, index) => (
                        <th key={`${column}-${index}`} className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200" style={{ minWidth: index === 0 ? 72 : 180 }}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`${rowIndex}-${row.join("|")}`} className="bg-[#05070b] hover:bg-zinc-900/50">
                        <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{rowIndex + 1}</td>
                        {row.map((value, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`} className="border-b border-white/6 px-4 py-3 text-zinc-300">
                            {value || <span className="text-zinc-500">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isConfirming}
                  className="inline-flex h-11 items-center justify-center cursor-pointer rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isConfirming ? "Confirming..." : "Confirm"}
                </button>
              </div>
            </section>

          ) : null}

        </div>
      </div>
    </main>
  );
}

//parseCsv function adapted from https://stackoverflow.com/a/8497474/10629172 // best 

function parseCsv(input: string) {
  const normalizedInput = stripLeadingCommentLines(input);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  const pushCell = () => {
    currentRow.push(currentCell.trim());
    currentCell = "";
  };

  const pushRow = () => {
    if (currentRow.some((value) => value.length > 0)) {
      rows.push(currentRow);
    }
    currentRow = [];
  };

  for (let index = 0; index < normalizedInput.length; index += 1) {
    const character = normalizedInput[index];

    if (character === "\r") {
      continue;
    }

    if (inQuotes) {
      if (character === '"' && input[index + 1] === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }

      if (character === '"') {
        inQuotes = false;
        continue;
      }

      currentCell += character;
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      pushCell();
      continue;
    }

    if (character === "\n") {
      pushCell();
      pushRow();
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    pushCell();
    pushRow();
  }

  const [headerRow = [], ...dataRows] = rows;
  return {
    headers: headerRow.map((header, index) => header || `column_${index + 1}`),
    rows: dataRows,
  };
}

function stripLeadingCommentLines(text: string) {
  const lines = text.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("#");
  });

  return firstContentIndex === -1 ? text : lines.slice(firstContentIndex).join("\n");
}