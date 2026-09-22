import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { z } from "zod";
import type { Workspace } from "@/features/workspaces/workspace-schema";

export const artefactTypes = [
  "pbi-builder",
  "pbi-viewer",
  "xlsx-builder",
  "pptx-builder",
  "markdown-builder",
] as const;

export type ArtefactType = (typeof artefactTypes)[number];

export type ArtefactRenderProps<T> = {
  value: T;
  workspace: Workspace;
  onChange: (value: T) => void;
};

export type ArtefactDefinition<T extends { title: string } = { title: string }> = {
  type: ArtefactType;
  label: string;
  description: string;
  examples: string[];
  icon: LucideIcon;
  schema: z.ZodType<T>;
  prompt: string;
  context?: (workspace: Workspace) => string;
  initial: (workspace: Workspace) => T;
  validate?: (value: T, workspace: Workspace) => Promise<string[]>;
  render: ComponentType<ArtefactRenderProps<T>>;
  download?: (value: T, workspace: Workspace) => Promise<File>;
};

export function defineArtefact<T extends { title: string }>(
  definition: ArtefactDefinition<T>,
) {
  return definition as unknown as ArtefactDefinition;
}
