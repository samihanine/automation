import * as llm from "@/lib/llm";
import type { ModelId } from "@/lib/models";
import { queryClient } from "@/lib/query-client";
import type { ConversationArtefact } from "./conversation-schema";
import { conversationStore } from "./conversation-store";
import { conversationsQueryKey } from "./use-conversations";

export async function createConversation(input: {
  title: string;
  datasetId: string;
  artefact: ConversationArtefact | null;
  model: ModelId;
}) {
  const { id } = await llm.createConversation(input.title);
  const now = new Date().toISOString();
  const conversation = conversationStore.save({ id, ...input, events: [], createdAt: now, updatedAt: now });
  await queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
  return conversation;
}
