import type { DataRow } from "./dax";

export type XlsxColumnFormat =
  | "text"
  | "integer"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "boolean";

export type XlsxSheet = {
  name: string;
  columns: Array<{ key: string; header: string; format: XlsxColumnFormat; width?: number }>;
  rows: DataRow[];
};

const numberFormats: Partial<Record<XlsxColumnFormat, string>> = {
  integer: "#,##0",
  number: "#,##0.00",
  currency: "\"$\"#,##0.00",
  percent: "0.0%",
  date: "yyyy-mm-dd",
};

export async function sheetsToXlsx(sheets: XlsxSheet[]) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    worksheet.columns = sheet.columns.map((column) => ({
      key: column.key,
      header: column.header,
      width:
        column.width ??
        Math.min(
          50,
          Math.max(
            10,
            column.header.length + 2,
            ...sheet.rows.slice(0, 200).map((row) => String(row[column.key] ?? "").length + 2),
          ),
        ),
      style: { numFmt: numberFormats[column.format] },
    }));
    for (const row of sheet.rows) {
      worksheet.addRow(
        Object.fromEntries(
          sheet.columns.map((column) => {
            const value = row[column.key] ?? null;
            return [
              column.key,
              column.format === "date" && typeof value === "string" && !Number.isNaN(Date.parse(value))
                ? new Date(value)
                : value,
            ];
          }),
        ),
      );
    }
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    if (sheet.columns.length) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function cellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const cell = value as { result?: unknown; text?: string; richText?: Array<{ text: string }> };
    if (cell.result !== undefined) return cellValue(cell.result);
    if (cell.richText) return cell.richText.map((part) => part.text).join("");
    return cell.text ?? null;
  }
  return value as string | number | boolean;
}

export async function readXlsx(blob: Blob) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());
  return workbook.worksheets.map((worksheet) => {
    const rows: Array<Array<string | number | boolean | null>> = [];
    worksheet.eachRow((row) => {
      rows.push((row.values as unknown[]).slice(1).map(cellValue));
    });
    return { name: worksheet.name, rows };
  });
}

export async function xlsxToText(blob: Blob, maxRows = 200) {
  const sheets = await readXlsx(blob);
  return sheets
    .map(({ name, rows }) =>
      [`## Sheet ${name}`, ...rows.slice(0, maxRows).map((row) => row.map((value) => value ?? "").join("\t"))].join("\n"),
    )
    .join("\n\n");
}
