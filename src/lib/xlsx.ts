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
