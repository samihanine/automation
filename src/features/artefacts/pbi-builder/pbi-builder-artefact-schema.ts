import { z } from "zod";
import {
  pbiPageStateSchema,
  pbiViewerArtefactSchema,
  pbiVisualStateSchema,
} from "../pbi-viewer/pbi-artefact-schema";

export const aggregations = ["Sum", "Average", "Count", "DistinctCount", "Min", "Max"] as const;

const columnFieldSchema = z.object({
  kind: z.literal("column"),
  table: z.string(),
  column: z.string(),
  aggregation: z.enum(aggregations).optional().describe("Required when a column is used as a value"),
});

export const pbiFieldSchema = z.discriminatedUnion("kind", [
  columnFieldSchema,
  z.object({ kind: z.literal("measure"), table: z.string().describe("Home table of the model measure"), measure: z.string() }),
]);

const groupFieldSchema = columnFieldSchema.omit({ aggregation: true });

export const visualTypes = ["card", "bar", "column", "line", "area", "pie", "doughnut", "table", "matrix", "text"] as const;

const chartTypes = new Set(["bar", "column", "line", "area", "pie", "doughnut"]);

export const pbiBuilderVisualSchema = pbiVisualStateSchema
  .extend({
    title: z.string().max(80).default(""),
    type: z.enum(visualTypes),
    layout: z
      .object({
        x: z.number().int().min(1).max(12),
        y: z.number().int().min(1).max(9),
        w: z.number().int().min(1).max(12),
        h: z.number().int().min(1).max(9),
      })
      .describe("Position in the exported .pbix: 16:9 page split in 12 columns x 9 rows"),
    category: groupFieldSchema.optional().describe("Axis / slices column (charts only)"),
    rows: z.array(groupFieldSchema).max(4).default([]).describe("Row headers (matrix only)"),
    columns: z.array(groupFieldSchema).max(2).default([]).describe("Column headers (matrix only)"),
    values: z.array(pbiFieldSchema).max(10).default([]).describe("Measures or aggregated columns; tables may also list plain columns"),
    sort: z.object({ by: z.enum(["category", "value"]), direction: z.enum(["asc", "desc"]) }).optional(),
    format: z.enum(["number", "integer", "currency", "percent"]).default("number"),
    text: z.string().optional().describe("Content of a text visual"),
  })
  .superRefine((visual, ctx) => {
    const issue = (message: string, path: PropertyKey[] = []) => ctx.addIssue({ code: "custom", message, path });
    if (visual.layout.x + visual.layout.w - 1 > 12) issue("layout.x + layout.w - 1 must be <= 12", ["layout"]);
    if (visual.layout.y + visual.layout.h - 1 > 9) issue("layout.y + layout.h - 1 must be <= 9", ["layout"]);
    if (visual.type === "text") {
      if (!visual.text) issue("text visuals need 'text'", ["text"]);
      return;
    }
    if (visual.values.length === 0) issue(`${visual.type} visuals need at least one value`, ["values"]);
    if (chartTypes.has(visual.type) && !visual.category) issue(`${visual.type} visuals need a category column`, ["category"]);
    if (visual.type === "matrix" && visual.rows.length === 0) issue("matrix visuals need at least one row field", ["rows"]);
    if (visual.type !== "table") {
      visual.values.forEach((field, index) => {
        if (field.kind === "column" && !field.aggregation) {
          issue("columns used as values need an aggregation (or use a measure)", ["values", index]);
        }
      });
    }
    if (["pie", "doughnut", "card"].includes(visual.type) && visual.values.length > 1) {
      issue(`${visual.type} visuals accept a single value`, ["values"]);
    }
  });

export const pbiBuilderPageSchema = pbiPageStateSchema.extend({
  displayName: z.string().min(1).max(60),
  visuals: z.array(pbiBuilderVisualSchema).max(20).default([]),
});

export const pbiBuilderArtefactSchema = pbiViewerArtefactSchema
  .extend({ pages: z.array(pbiBuilderPageSchema).min(1).max(10) })
  .superRefine((report, ctx) => {
    const names = report.pages.map((page) => page.name);
    if (!names.includes(report.activePage)) {
      ctx.addIssue({ code: "custom", message: `activePage must be one of: ${names.join(", ")}`, path: ["activePage"] });
    }
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: "custom", message: "page names must be unique", path: ["pages"] });
    }
    const visualNames = report.pages.flatMap((page) => page.visuals.map((visual) => visual.name));
    if (new Set(visualNames).size !== visualNames.length) {
      ctx.addIssue({ code: "custom", message: "visual names must be unique across the report", path: ["pages"] });
    }
  });

export type PbiField = z.infer<typeof pbiFieldSchema>;
export type PbiGroupField = z.infer<typeof groupFieldSchema>;
export type PbiBuilderArtefact = z.infer<typeof pbiBuilderArtefactSchema>;
export type PbiBuilderPage = z.infer<typeof pbiBuilderPageSchema>;
export type PbiBuilderVisual = z.infer<typeof pbiBuilderVisualSchema>;
