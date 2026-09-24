import { z } from "zod";

export const datasetConfigSchema = z.object({
  url: z.string(),
  datasetId: z.string(),
  groupId: z.string().nullable(),
  webUrl: z.string().optional(),
  configuredBy: z.string().optional(),
  structure: z.string(),
  generatedAt: z.string(),
});

export const datasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  config: datasetConfigSchema,
  context: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DatasetConfig = z.infer<typeof datasetConfigSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
