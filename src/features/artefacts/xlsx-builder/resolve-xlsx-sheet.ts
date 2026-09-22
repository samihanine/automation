import type { DaxResult } from "@/lib/dax";
import type { XlsxSheet } from "@/lib/xlsx";
import type { XlsxArtefactSheet } from "./xlsx-artefact-schema";

export function resolveXlsxSheet(sheet: XlsxArtefactSheet, result?: DaxResult): XlsxSheet {
  if (!sheet.query || !result) {
    return { name: sheet.name, columns: sheet.columns, rows: sheet.rows };
  }
  const columns = sheet.columns.length
    ? sheet.columns
    : result.columns.map((column) => ({
        key: column.name,
        header: column.name,
        format:
          column.type === "integer"
            ? ("integer" as const)
            : column.type === "number"
              ? ("number" as const)
              : ("text" as const),
      }));
  return { name: sheet.name, columns, rows: result.rows };
}
