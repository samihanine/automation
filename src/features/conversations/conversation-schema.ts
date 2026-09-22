import { z } from "zod";
import { artefactTypes } from "@/features/artefacts/artefact-schema";
import { modelIds } from "@/lib/llm";

export const conversationEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  kind: z.enum(["user", "assistant", "tool", "error", "system"]),
  text: z.string(),
  tool: z.string().optional(),
  thought: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  model: z.string().optional(),
  durationMs: z.number().optional(),
});

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  workspaceId: z.string(),
  artefactType: z.enum(artefactTypes),
  model: z.enum(modelIds),
  artefact: z.unknown(),
  events: z.array(conversationEventSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationEvent = z.infer<typeof conversationEventSchema>;
