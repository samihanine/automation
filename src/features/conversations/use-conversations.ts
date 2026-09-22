import { useQuery } from "@tanstack/react-query";
import { conversationStore } from "./conversation-store";

export const conversationsQueryKey = ["conversations"];

export function useConversations() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: async () =>
      conversationStore.list().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  });
}

export function useConversation(id: string | undefined) {
  const { data } = useConversations();
  return data?.find((conversation) => conversation.id === id);
}
