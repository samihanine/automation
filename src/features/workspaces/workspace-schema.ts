import { z } from "zod";

export const datasetConfigSchema = z.object({
  url: z.string(),
  datasetId: z.string(),
  groupId: z.string().nullable(),
  name: z.string(),
  webUrl: z.string().optional(),
  configuredBy: z.string().optional(),
  structure: z.string(),
  generatedAt: z.string(),
});

export const reportConfigSchema = z.object({
  url: z.string(),
  reportId: z.string(),
  groupId: z.string().nullable(),
  name: z.string(),
  embedUrl: z.string(),
  datasetId: z.string().nullable(),
  pages: z.array(
    z.object({
      name: z.string(),
      displayName: z.string(),
      visuals: z.array(
        z.object({ name: z.string(), title: z.string().default(""), type: z.string() }),
      ),
    }),
  ),
  generatedAt: z.string(),
});

export const workspaceSchema = z.object({
  id: z.string(),
  title: z.string(),
  datasetConfig: datasetConfigSchema,
  datasetContext: z.string(),
  reportConfig: reportConfigSchema,
  reportContext: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createWorkspaceInputSchema = z.object({
  datasetUrl: z.url("Enter a valid semantic model URL"),
  reportUrl: z.url("Enter a valid embedded report URL"),
});

export const updateWorkspaceInputSchema = workspaceSchema.pick({
  title: true,
  datasetContext: true,
  reportContext: true,
});

export type DatasetConfig = z.infer<typeof datasetConfigSchema>;
export type ReportConfig = z.infer<typeof reportConfigSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceInputSchema>;
