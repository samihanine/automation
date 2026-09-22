import { z } from "zod";
import { dataRowSchema } from "@/lib/dax";

export const xlsxColumnSchema = z.object({
  key: z.string().describe("Row property (or DAX result column name) holding the value"),
  header: z.string().describe("Header shown in Excel"),
  format: z
    .enum(["text", "integer", "number", "currency", "percent", "date", "boolean"])
    .default("text")
    .describe("percent expects ratios (0.25 = 25%)"),
});

export const xlsxSheetSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(31)
    .regex(/^[^[\]:*?/\\]+$/, "Sheet names cannot contain [ ] : * ? / \\"),
  query: z
    .string()
    .optional()
    .describe("Optional DAX query. When set, rows are loaded live from the dataset and 'rows' is ignored"),
  columns: z
    .array(xlsxColumnSchema)
    .max(40)
    .default([])
    .describe("Columns to show. With a query, leave empty to show every result column"),
  rows: z.array(dataRowSchema).max(1000).default([]).describe("Static rows, keyed by column key"),
});

export const xlsxArtefactSchema = z.object({
  title: z.string().min(1).max(120),
  sheets: z
    .array(xlsxSheetSchema)
    .min(1)
    .max(10)
    .refine(
      (sheets) => new Set(sheets.map((sheet) => sheet.name.toLowerCase())).size === sheets.length,
      "Sheet names must be unique",
    ),
});

export type XlsxArtefact = z.infer<typeof xlsxArtefactSchema>;
export type XlsxArtefactSheet = z.infer<typeof xlsxSheetSchema>;
