import { z } from "zod";
import {
  pbiPageStateSchema,
  pbiViewerArtefactSchema,
  pbiVisualStateSchema,
} from "../pbi-viewer/pbi-artefact-schema";

export const pbiBuilderVisualSchema = pbiVisualStateSchema
  .extend({
    title: z.string().max(80).default(""),
    type: z.enum(["card", "bar", "column", "line", "area", "pie", "doughnut", "table", "text"]),
    layout: z
      .object({
        x: z.number().int().min(1).max(12),
        y: z.number().int().min(1).max(40),
        w: z.number().int().min(1).max(12),
        h: z.number().int().min(1).max(12),
      })
      .describe("Position on a 12-column grid, rows of 80px"),
    query: z.string().optional().describe("DAX query returning the visual data (not needed for text)"),
    category: z.string().optional().describe("Result column used as axis / slices"),
    values: z.array(z.string()).default([]).describe("Result columns used as values (card: first one)"),
    format: z.enum(["number", "integer", "currency", "percent"]).default("number"),
    text: z.string().optional().describe("Content of a text visual"),
  })
  .superRefine((visual, ctx) => {
    if (visual.layout.x + visual.layout.w - 1 > 12) {
      ctx.addIssue({ code: "custom", message: "layout.x + layout.w - 1 must be <= 12", path: ["layout"] });
    }
    if (visual.type === "text" ? !visual.text : !visual.query?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: visual.type === "text" ? "text visuals need 'text'" : `${visual.type} visuals need a DAX 'query'`,
      });
    }
  });

export const pbiBuilderPageSchema = pbiPageStateSchema.extend({
  displayName: z.string().min(1).max(60),
  visuals: z.array(pbiBuilderVisualSchema).max(20).default([]),
});

export const pbiBuilderArtefactSchema = pbiViewerArtefactSchema
  .extend({
    pages: z.array(pbiBuilderPageSchema).min(1).max(10),
  })
  .superRefine((report, ctx) => {
    const names = report.pages.map((page) => page.name);
    if (!names.includes(report.activePage)) {
      ctx.addIssue({ code: "custom", message: `activePage must be one of: ${names.join(", ")}`, path: ["activePage"] });
    }
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: "custom", message: "page names must be unique", path: ["pages"] });
    }
  });

export type PbiBuilderArtefact = z.infer<typeof pbiBuilderArtefactSchema>;
export type PbiBuilderPage = z.infer<typeof pbiBuilderPageSchema>;
export type PbiBuilderVisual = z.infer<typeof pbiBuilderVisualSchema>;
