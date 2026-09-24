import { z } from "zod";
import { artefactTypes } from "@/features/artefacts/artefact-schema";
import { modelIds } from "@/lib/models";

export const conversationArtefactSchema = z.object({
  type: z.enum(artefactTypes),
  value: z.unknown(),
  reportId: z.string().optional(),
});

export const conversationEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  kind: z.enum(["user", "assistant", "tool", "error", "system", "file"]),
  text: z.string(),
  tool: z.string().optional(),
  thought: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  model: z.string().optional(),
  durationMs: z.number().optional(),
  file: z.object({ id: z.string(), name: z.string(), type: z.string() }).optional(),
});

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  datasetId: z.string(),
  artefact: conversationArtefactSchema.nullable(),
  model: z.enum(modelIds),
  events: z.array(conversationEventSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationArtefact = z.infer<typeof conversationArtefactSchema>;
export type ConversationEvent = z.infer<typeof conversationEventSchema>;
