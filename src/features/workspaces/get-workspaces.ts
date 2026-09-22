import { useQuery } from "@tanstack/react-query";
import { workspaceStore } from "./workspace-store";

export const workspacesQueryKey = ["workspaces"];

export function useWorkspaces() {
  return useQuery({
    queryKey: workspacesQueryKey,
    queryFn: async () => workspaceStore.list(),
  });
}

export function useWorkspace(id: string | undefined) {
  const { data } = useWorkspaces();
  return data?.find((workspace) => workspace.id === id);
}
