import { datasets } from "@/features/datasets/dataset-store";
import { getConversationMessages } from "@/lib/llm";
import { downloadJson } from "@/lib/utils";
import type { Conversation } from "./conversation-schema";

export async function downloadConversation(conversation: Conversation) {
  const { events, artefact, ...meta } = conversation;
  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      conversation: meta,
      dataset: datasets.get(conversation.datasetId)?.name,
      displayedMessages: events
        .filter((event) => event.kind === "user" || event.kind === "assistant" || event.kind === "file")
        .map(({ kind, text, at }) => ({ role: kind, text, at })),
      events,
      llmMessages: await getConversationMessages(conversation.id),
      artefact,
    },
    `conversation-${conversation.title}`,
  );
}
