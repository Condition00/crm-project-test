export const allowedCrmStatuses = ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"] as const;
export const allowedDataSources = ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"] as const;

export type CrmStatus = (typeof allowedCrmStatuses)[number];
export type DataSource = (typeof allowedDataSources)[number] | "";

export interface CsvSourceRow {
  rowIndex: number;
  headers: string[];
  fields: Record<string, string>;
  rawValues: string[];
  sourceText: string;
  emails: string[];
  mobileNumbers: string[];
}

export interface CrmImportRecord {
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
  crm_status: CrmStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  row_index: number;
  reason: string;
  fields?: Record<string, string>;
}

export interface CrmImportResponse {
  success: true;
  file_name: string;
  source_format: "csv" | "table";
  total_rows: number;
  valid_rows: number;
  imported_rows: number;
  skipped_rows: number;
  records: CrmImportRecord[];
  skipped_records: SkippedRecord[];
  provider: string;
  model: string;
}

export interface ParsedCsvPayload {
  fileName: string;
  sourceFormat: "csv" | "table";
  headers: string[];
  rows: CsvSourceRow[];
}
