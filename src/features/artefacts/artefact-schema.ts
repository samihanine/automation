import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { z } from "zod";
import type { Dataset } from "@/features/datasets/dataset-schema";
import type { Report } from "@/features/reports/report-schema";

export const artefactTypes = ["pbi-builder", "pbi-viewer", "xlsx-builder", "pptx-builder", "markdown-builder"] as const;

export type ArtefactType = (typeof artefactTypes)[number];

export type ArtefactContext = { dataset: Dataset; report?: Report };

export type ArtefactRenderProps<T> = {
  value: T;
  context: ArtefactContext;
  onChange: (value: T) => void;
};

export type ArtefactDownload<T> = { label: string; run: (value: T, context: ArtefactContext) => Promise<File> };

export type ArtefactDefinition<T extends { title: string } = { title: string }> = {
  type: ArtefactType;
  label: string;
  description: string;
  icon: LucideIcon;
  requiresReport?: boolean;
  schema: z.ZodType<T>;
  prompt: string;
  describeContext?: (context: ArtefactContext) => string;
  initial: (context: ArtefactContext) => T;
  upload?: { accept: string; read: (file: File) => Promise<T> };
  validate?: (value: T, context: ArtefactContext) => Promise<string[]>;
  render: ComponentType<ArtefactRenderProps<T>>;
  downloads: ArtefactDownload<T>[];
};

export function defineArtefact<T extends { title: string }>(definition: ArtefactDefinition<T>) {
  return definition as unknown as ArtefactDefinition;
}
