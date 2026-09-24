import { useQuery } from "@tanstack/react-query";
import { runDax } from "@/lib/dax";
import type { Dataset } from "./dataset-schema";

export function useDaxQuery(dataset: Dataset, dax: string | undefined) {
  return useQuery({
    queryKey: ["dax", dataset.config.datasetId, dax],
    queryFn: () => runDax(dataset.config, dax ?? ""),
    enabled: Boolean(dax?.trim()),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
