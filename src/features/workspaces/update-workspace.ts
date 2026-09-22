import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateWorkspaceInput } from "./workspace-schema";
import { workspaceStore } from "./workspace-store";
import { workspacesQueryKey } from "./get-workspaces";

export function updateWorkspace(id: string, input: UpdateWorkspaceInput) {
  const workspace = workspaceStore.get(id);
  if (!workspace) throw new Error("Workspace not found");
  return workspaceStore.save({
    ...workspace,
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateWorkspaceInput & { id: string }) =>
      updateWorkspace(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}
