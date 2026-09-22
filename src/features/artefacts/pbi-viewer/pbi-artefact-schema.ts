import { z } from "zod";
import { pbiFilterSchema } from "@/lib/pbi-client";

export const pbiVisualStateSchema = z.object({
  name: z.string().describe("Visual name (id) from the report description"),
  filters: z.array(pbiFilterSchema).default([]).describe("Visual-level filters (slicer state for slicers)"),
});

export const pbiPageStateSchema = z.object({
  name: z.string().describe("Page name (id) from the report description"),
  filters: z.array(pbiFilterSchema).default([]).describe("Page-level filters"),
  visuals: z.array(pbiVisualStateSchema).default([]),
});

export const pbiViewerArtefactSchema = z.object({
  title: z.string().min(1).max(120),
  activePage: z.string().describe("Name (id) of the page displayed"),
  filters: z.array(pbiFilterSchema).default([]).describe("Report-level filters applied to every page"),
  pages: z.array(pbiPageStateSchema).default([]).describe("Only pages with filters or visual state"),
});

export type PbiViewerArtefact = z.infer<typeof pbiViewerArtefactSchema>;
