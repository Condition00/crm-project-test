"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BackendImportResponse, BackendLeadRecord } from "../page";

export default function GeneratedLeadsPage() {
  const router = useRouter();
  const [result, setResult] = useState<BackendImportResponse | null>(null);

  function handleGoBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  useEffect(() => {
    const raw = window.sessionStorage.getItem("importResult");
    if (!raw) {
      router.replace("/");
      return;
    }

    try {
      setResult(JSON.parse(raw) as BackendImportResponse);
    } catch {
      router.replace("/");
    }
  }, [router]);

  if (!result) {
    return (
      <main className="min-h-screen bg-[#05070b] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center text-sm text-zinc-400">
          Loading generated leads...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070b] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-zinc-800 bg-[#05070b] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04),0_18px_45px_rgba(0,0,0,0.18)] sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex h-11 w-fit cursor-pointer items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-400/15"
              >
                Go back
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white sm:text-2xl">Manage Your Leads</h1>
                <p className="text-sm text-zinc-400">CRM table from JSON response.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
              <StatPill label="Imported" value={result.imported_rows.toLocaleString()} />
              <StatPill label="Skipped" value={result.skipped_rows.toLocaleString()} />
              <StatPill label="Total" value={result.total_rows.toLocaleString()} />
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-white/8 bg-zinc-900">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-[2px]">
                <tr>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">#</th>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">Created at</th>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">Name</th>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">Email</th>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">Mobile</th>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">Company</th>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">City</th>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">Status</th>
                  <th className="border-b border-white/10 px-4 py-3 font-semibold text-zinc-200">Data source</th>
                </tr>
              </thead>
              <tbody>
                {result.records.map((record, index) => (
                  <LeadsRow key={`${record.email}-${index}`} record={record} index={index} />
                ))}
              </tbody>
            </table>
          </div>

          <details className="mt-4 rounded-2xl border border-white/8 bg-zinc-900 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-white transition-colors hover:text-emerald-100">
              JSON response for developers (click this to expand)
            </summary>
            <pre className="mt-3 max-h-72 overflow-auto text-xs leading-5 text-zinc-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      </div>
    </main>
  );
}

function LeadsRow({ record, index }: { record: BackendLeadRecord; index: number }) {
  return (
    <tr className="bg-[#05070b] hover:bg-zinc-900/50">
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{index + 1}</td>
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{formatDate(record.created_at)}</td>
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{record.name || <span className="text-zinc-500">—</span>}</td>
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{record.email || <span className="text-zinc-500">—</span>}</td>
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{record.mobile_without_country_code || <span className="text-zinc-500">—</span>}</td>
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{record.company || <span className="text-zinc-500">—</span>}</td>
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{record.city || <span className="text-zinc-500">—</span>}</td>
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">
        <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
          {record.crm_status}
        </span>
      </td>
      <td className="border-b border-white/6 px-4 py-3 text-zinc-300">{record.data_source || <span className="text-zinc-500">—</span>}</td>
    </tr>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}