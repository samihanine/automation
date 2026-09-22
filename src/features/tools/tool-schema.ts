import { z } from "zod";
import type { ArtefactDefinition } from "@/features/artefacts";
import type { Workspace } from "@/features/workspaces/workspace-schema";

export type ToolContext = {
  workspace: Workspace;
  artefact: ArtefactDefinition;
  getArtefactValue: () => unknown;
  setArtefactValue: (value: unknown) => void;
};

export type ToolDefinition<TInput = unknown> = {
  name: string;
  description: string;
  input: z.ZodType<TInput>;
  run: (input: TInput, context: ToolContext) => Promise<unknown>;
};

export function defineTool<TInput>(tool: ToolDefinition<TInput>) {
  return tool as unknown as ToolDefinition;
}

export const toolCallSchema = z.object({
  thought: z.string().optional(),
  tool: z.string(),
  input: z.record(z.string(), z.unknown()).default({}),
});

export type ToolCall = z.infer<typeof toolCallSchema>;

export function formatIssues(error: z.ZodError, max = 20) {
  return error.issues
    .slice(0, max)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}
