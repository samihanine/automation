import { runDax } from "@/lib/dax";
import { readXlsx, sheetsToXlsx } from "@/lib/xlsx";
import { slugify } from "@/lib/utils";
import type { ArtefactContext } from "../artefact-schema";
import type { XlsxArtefact } from "./xlsx-artefact-schema";
import { resolveXlsxSheet } from "./resolve-xlsx-sheet";

export async function downloadXlsxArtefact(value: XlsxArtefact, { dataset }: ArtefactContext) {
  const sheets = await Promise.all(
    value.sheets.map(async (sheet) =>
      resolveXlsxSheet(sheet, sheet.query ? await runDax(dataset.config, sheet.query) : undefined),
    ),
  );
  const blob = await sheetsToXlsx(sheets);
  return new File([blob], `${slugify(value.title)}.xlsx`, { type: blob.type });
}

export async function readXlsxArtefact(file: File): Promise<XlsxArtefact> {
  const workbook = await readXlsx(file);
  return {
    title: file.name.replace(/\.[^.]+$/, ""),
    sheets: workbook.slice(0, 10).map(({ name, rows: [header = [], ...body] }, index) => {
      const keys = header.map((cell, column) => String(cell ?? `Column ${column + 1}`));
      return {
        name: name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || `Sheet${index + 1}`,
        columns: keys.map((key, column) => ({
          key,
          header: key,
          format: body.every((row) => row[column] === null || typeof row[column] === "number") ? ("number" as const) : ("text" as const),
        })),
        rows: body.slice(0, 1000).map((row) => Object.fromEntries(keys.map((key, column) => [key, row[column] ?? null]))),
      };
    }),
  };
}
