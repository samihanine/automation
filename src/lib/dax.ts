import { z } from "zod";
import { getPbiToken } from "./pbi-auth";

export const POWER_BI_API = "https://api.powerbi.com/v1.0/myorg";

export const scalarValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type ScalarValue = z.infer<typeof scalarValueSchema>;

export const dataRowSchema = z.record(z.string(), scalarValueSchema);
export type DataRow = z.infer<typeof dataRowSchema>;

export const resultColumnSchema = z.object({
  name: z.string(),
  source: z.string(),
  role: z.enum(["dimension", "metric"]),
  type: z.enum(["string", "integer", "number", "boolean"]),
});
export type ResultColumn = z.infer<typeof resultColumnSchema>;

export type DaxResult = {
  columns: ResultColumn[];
  rows: DataRow[];
  rowCount: number;
  executionMs: number;
};

export type DatasetTarget = { datasetId: string; groupId: string | null };

const COLUMN_REF_PATTERN = /^\s*'?([^'[\]]+)'?\s*\[\s*([^\]]+)\s*\]\s*$/;

export class DaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DaxError";
  }
}

export function datasetPath({ datasetId, groupId }: DatasetTarget) {
  return groupId
    ? `/groups/${groupId}/datasets/${datasetId}`
    : `/datasets/${datasetId}`;
}

export async function powerBiRequest<T>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getPbiToken();
  const response = await fetch(`${POWER_BI_API}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new DaxError(
      extractPowerBiError(
        body,
        `Power BI HTTP ${response.status} ${response.statusText}`,
      ),
    );
  }
  return JSON.parse(body) as T;
}

type ExecuteQueriesResponse = {
  results?: Array<{
    tables?: Array<{
      rows?: Record<string, unknown>[];
      error?: { code?: string; message?: string };
    }>;
    error?: { code?: string; message?: string };
  }>;
};

export function ensureEvaluate(dax: string) {
  const trimmed = dax.trim();
  if (!trimmed) return trimmed;
  if (/^(EVALUATE|DEFINE)\b/i.test(trimmed)) return trimmed;
  return `EVALUATE\n${trimmed}`;
}

export async function executeDax(target: DatasetTarget, dax: string) {
  const response = await powerBiRequest<ExecuteQueriesResponse>(
    `${datasetPath(target)}/executeQueries`,
    {
      method: "POST",
      body: JSON.stringify({
        queries: [{ query: ensureEvaluate(dax) }],
        serializerSettings: { includeNulls: true },
      }),
    },
  );
  const result = response.results?.[0];
  const error = result?.error ?? result?.tables?.[0]?.error;
  if (error) {
    throw new DaxError(
      shortenDaxMessage(error.message ?? "The DAX query failed."),
    );
  }
  return result?.tables?.[0]?.rows ?? [];
}

export async function runDax(target: DatasetTarget, dax: string) {
  const startedAt = Date.now();
  const rows = await executeDax(target, dax);
  return toDaxResult(rows, Date.now() - startedAt);
}

export function daxRepairHint(error: string) {
  const reserved = error.match(/syntax for '([^']+)'/i)?.[1];
  if (
    reserved &&
    /^(item|time|date|value|text|true|false|table|column|action|currency|rank)$/i.test(
      reserved,
    )
  ) {
    return `Reserved name: use '${reserved}'[Column], not ${reserved}[Column]. Time, Date, Item and other DAX reserved words must be quoted.`;
  }
  if (!/single value|cannot be determined/i.test(error)) return undefined;
  if (/KEEPFILTERS/i.test(error)) {
    return "Year filter: CALCULATETABLE(SUMMARIZECOLUMNS(...), 'Time'[Year] = 2014). No KEEPFILTERS('Table'[Column] = …) inside SUMMARIZECOLUMNS or SELECTCOLUMNS.";
  }
  return "Do not use a group-by column as a named expression in SUMMARIZECOLUMNS. Use SELECTCOLUMNS afterwards.";
}

export function isBlankScalar(value: ScalarValue | undefined) {
  return value === null || value === undefined || value === "";
}

export function isBlankResult(rows: DataRow[]) {
  return (
    rows.length === 0 ||
    rows.every((row) => Object.values(row).every(isBlankScalar))
  );
}

export function timeIntelligenceHint(columns: string[], sample: DataRow[]) {
  if (sample.length === 0) return undefined;
  const prior = columns.find(
    (column) => /n-1|lastyear|prior|previous/i.test(column) || /ly$/i.test(column),
  );
  const current = columns.find(
    (column) =>
      column !== prior &&
      /sales|revenue|ventes|ca|amount/i.test(column) &&
      !/var|pct|ly|n-1|prior|previous/i.test(column),
  );
  if (
    prior &&
    current &&
    sample.every((row) => isBlankScalar(row[prior])) &&
    sample.some((row) => typeof row[current] === "number")
  ) {
    return "Prior-year column is blank: an outer year filter (CALCULATETABLE(..., 'Time'[Year] = N)) overrides CALCULATE(..., year = N-1). Compute each year with CALCULATE([Measure], ALL('Time'[Year]), 'Time'[Year] = …) without an outer year filter.";
  }
  return undefined;
}

type PowerBiErrorBody = {
  error?: {
    message?: string;
    "pbi.error"?: {
      details?: Array<{ code?: string; detail?: { value?: string } }>;
    };
  };
};

function shortenDaxMessage(message: string) {
  const withoutQuery = message.replace(/^Query\s*\([^)]+\)\s*/i, "");
  const withoutDump = withoutQuery.replace(
    /\s*\((?:VAR|EVALUATE|DEFINE)\b[\s\S]*$/i,
    "",
  );
  const trimmed = (withoutDump.trim() || withoutQuery.trim()).replace(
    /\s+/g,
    " ",
  );
  return trimmed.length > 400 ? `${trimmed.slice(0, 397)}…` : trimmed;
}

export function extractPowerBiError(body: string, fallback: string): string {
  const raw = body.trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as PowerBiErrorBody;
    const details = parsed.error?.["pbi.error"]?.details ?? [];
    const detail = details.find((item) => item.code === "DetailsMessage")
      ?.detail?.value;
    const message = detail ?? parsed.error?.message;
    if (typeof message === "string" && message.trim()) {
      return shortenDaxMessage(message);
    }
  } catch {
    const embedded = raw.match(/\{[\s\S]*"pbi\.error"[\s\S]*\}/);
    if (embedded) return extractPowerBiError(embedded[0], fallback);
  }
  return raw.length > 400 ? `${raw.slice(0, 397)}…` : raw;
}

export function columnName(key: string) {
  let value = key.trim();
  if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
  const match = COLUMN_REF_PATTERN.exec(value);
  return (match ? match[2] : value).trim();
}

function toScalar(value: unknown): ScalarValue {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  return String(value);
}

function inferType(values: ScalarValue[]): ResultColumn["type"] {
  const defined = values.filter((value) => value !== null);
  if (defined.length === 0) return "string";
  if (defined.every((value) => typeof value === "boolean")) return "boolean";
  if (defined.every((value) => typeof value === "number")) {
    return defined.every((value) => Number.isInteger(value))
      ? "integer"
      : "number";
  }
  return "string";
}

export function toDaxResult(
  rawRows: Record<string, unknown>[],
  executionMs: number,
): DaxResult {
  const keyToName = new Map<string, string>();
  const used = new Set<string>();
  for (const key of Object.keys(rawRows[0] ?? {})) {
    const base = columnName(key);
    let name = base;
    for (let suffix = 2; used.has(name.toLowerCase()); suffix++) {
      name = `${base} ${suffix}`;
    }
    used.add(name.toLowerCase());
    keyToName.set(key, name);
  }

  const rows = rawRows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        keyToName.get(key) ?? columnName(key),
        toScalar(value),
      ]),
    ),
  );

  const columns = [...keyToName].map(([source, name]): ResultColumn => {
    const type = inferType(rows.map((row) => row[name] ?? null));
    return {
      name,
      source,
      type,
      role: type === "integer" || type === "number" ? "metric" : "dimension",
    };
  });

  return { columns, rows, rowCount: rows.length, executionMs };
}

type InfoRow = Record<string, unknown>;

const text = (row: InfoRow, key: string) => String(row[`[${key}]`] ?? "");
const flag = (row: InfoRow, key: string) => row[`[${key}]`] === true;

function isAutoDateTable(name: string) {
  return /^(LocalDateTable_|DateTableTemplate_)/i.test(name);
}

function isJunkTable(table: InfoRow) {
  return (
    isAutoDateTable(text(table, "Name")) ||
    flag(table, "IsPrivate") ||
    flag(table, "ShowAsVariationOnly")
  );
}

export function formatSemanticModelStructure({
  tables,
  columns,
  measures,
  relationships,
}: Record<"tables" | "columns" | "measures" | "relationships", InfoRow[]>) {
  const activeRelationships = relationships.filter(
    (row) =>
      row["[IsActive]"] !== false &&
      !isAutoDateTable(text(row, "FromTable")) &&
      !isAutoDateTable(text(row, "ToTable")),
  );
  const keyColumns = new Set(
    activeRelationships.flatMap((row) => [
      `${text(row, "FromTable")}[${text(row, "FromColumn")}]`,
      `${text(row, "ToTable")}[${text(row, "ToColumn")}]`,
    ]),
  );

  const lines: string[] = [];
  for (const table of tables) {
    if (isJunkTable(table)) continue;
    const name = text(table, "Name");
    const hiddenTable = flag(table, "IsHidden");

    const tableColumns = columns
      .filter((row) => text(row, "Table") === name)
      .filter((row) => text(row, "Type") !== "RowNumber")
      .filter(
        (row) =>
          !flag(row, "IsHidden") ||
          hiddenTable ||
          keyColumns.has(`${name}[${text(row, "Name")}]`),
      )
      .map((row) => `[${text(row, "Name")}] (${text(row, "DataType")})`);

    const tableMeasures = measures
      .filter((row) => text(row, "Table") === name)
      .filter((row) => hiddenTable || !flag(row, "IsHidden"))
      .map((row) => `[${text(row, "Name")}] (${text(row, "DataType")})`);

    if (tableColumns.length === 0 && tableMeasures.length === 0) continue;

    lines.push(
      hiddenTable ? `### '${name}' (hidden, usable in DAX)` : `### '${name}'`,
    );
    if (tableColumns.length) lines.push(`Columns: ${tableColumns.join(", ")}`);
    if (tableMeasures.length) lines.push(`Measures: ${tableMeasures.join(", ")}`);
    lines.push("");
  }

  if (activeRelationships.length) {
    lines.push(
      "### Relationships",
      ...activeRelationships.map((row) => `- ${text(row, "Relationship")}`),
    );
  }

  return lines.join("\n").trim();
}

export async function fetchSemanticModelStructure(target: DatasetTarget) {
  const query = (fn: string) => executeDax(target, `EVALUATE ${fn}()`);
  const [tables, columns, measures, relationships] = await Promise.all([
    query("INFO.VIEW.TABLES"),
    query("INFO.VIEW.COLUMNS"),
    query("INFO.VIEW.MEASURES"),
    query("INFO.VIEW.RELATIONSHIPS"),
  ]);
  return formatSemanticModelStructure({
    tables,
    columns,
    measures,
    relationships,
  });
}
