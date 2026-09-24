import { z } from "zod";

export const reportConfigSchema = z.object({
  url: z.string(),
  reportId: z.string(),
  groupId: z.string().nullable(),
  embedUrl: z.string(),
  pbiDatasetId: z.string().nullable(),
  pages: z.array(
    z.object({
      name: z.string(),
      displayName: z.string(),
      visuals: z.array(z.object({ name: z.string(), title: z.string().default(""), type: z.string() })),
    }),
  ),
  generatedAt: z.string(),
});

export const reportSchema = z.object({
  id: z.string(),
  name: z.string(),
  config: reportConfigSchema,
  context: z.string(),
  datasetId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReportConfig = z.infer<typeof reportConfigSchema>;
export type Report = z.infer<typeof reportSchema>;
