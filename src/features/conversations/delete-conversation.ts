import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as llm from "@/lib/llm";
import { conversationStore } from "./conversation-store";
import { conversationsQueryKey } from "./use-conversations";

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      conversationStore.remove(id);
      await llm.deleteConversation(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationsQueryKey }),
  });
}
