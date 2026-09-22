import { useQuery } from "@tanstack/react-query";
import { runDax } from "@/lib/dax";
import type { Workspace } from "./workspace-schema";

export function daxQueryOptions(workspace: Workspace, dax: string) {
  return {
    queryKey: ["dax", workspace.datasetConfig.datasetId, dax],
    queryFn: () => runDax(workspace.datasetConfig, dax),
    staleTime: 5 * 60_000,
    retry: false,
  };
}

export function useDaxQuery(workspace: Workspace, dax: string | undefined) {
  return useQuery({
    ...daxQueryOptions(workspace, dax ?? ""),
    enabled: Boolean(dax?.trim()),
  });
}
