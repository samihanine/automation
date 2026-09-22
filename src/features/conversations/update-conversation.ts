import { queryClient } from "@/lib/query-client";
import type { Conversation, ConversationEvent } from "./conversation-schema";
import { conversationStore } from "./conversation-store";
import { conversationsQueryKey } from "./use-conversations";

export function getConversation(id: string) {
  const conversation = conversationStore.get(id);
  if (!conversation) throw new Error("Conversation not found");
  return conversation;
}

export function updateConversation(id: string, update: (conversation: Conversation) => Partial<Conversation>) {
  const conversation = getConversation(id);
  const next = conversationStore.save({
    ...conversation,
    ...update(conversation),
    updatedAt: new Date().toISOString(),
  });
  void queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
  return next;
}

export function addConversationEvent(id: string, event: Omit<ConversationEvent, "id" | "at">) {
  updateConversation(id, (conversation) => ({
    events: [
      ...conversation.events,
      { ...event, id: crypto.randomUUID(), at: new Date().toISOString() },
    ],
  }));
}
