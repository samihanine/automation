import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceStore } from "./workspace-store";
import { workspacesQueryKey } from "./get-workspaces";

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => workspaceStore.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}
