import { workspaceStore } from "@/features/workspaces/workspace-store";
import { getConversationMessages } from "@/lib/llm";
import { downloadJson } from "@/lib/utils";
import type { Conversation } from "./conversation-schema";

export async function downloadConversation(conversation: Conversation) {
  const workspace = workspaceStore.get(conversation.workspaceId);
  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      conversation: {
        id: conversation.id,
        title: conversation.title,
        artefactType: conversation.artefactType,
        model: conversation.model,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      workspace: workspace && { id: workspace.id, title: workspace.title },
      displayedMessages: conversation.events
        .filter((event) => event.kind === "user" || event.kind === "assistant")
        .map(({ kind, text, at }) => ({ role: kind, text, at })),
      events: conversation.events,
      llmMessages: await getConversationMessages(conversation.id),
      artefact: conversation.artefact,
    },
    `conversation-${conversation.title}`,
  );
}
