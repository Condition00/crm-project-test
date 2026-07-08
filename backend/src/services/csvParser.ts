type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

export function parseCsvText(input: string): ParsedCsv {
  const text = stripLeadingCommentLines(input.replace(/^\uFEFF/, ""));
  const delimiter = detectDelimiter(text);
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

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === "\r") {
      continue;
    }

    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
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

    if (character === delimiter) {
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

function detectDelimiter(text: string) {
  const sampleLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const candidates = [",", ";", "\t", "|"] as const;

  return candidates
    .map((candidate) => ({ candidate, count: (sampleLine.match(new RegExp(escapeRegex(candidate), "g")) ?? []).length }))
    .sort((left, right) => right.count - left.count)[0]?.candidate ?? ",";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeadingCommentLines(text: string) {
  const lines = text.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("#");
  });

  return firstContentIndex === -1 ? text : lines.slice(firstContentIndex).join("\n");
}
