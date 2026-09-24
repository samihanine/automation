import { datasets } from "./dataset-store";

export function updateDataset(id: string, patch: { name: string; context: string }) {
  const dataset = datasets.get(id);
  if (!dataset) throw new Error("Dataset not found");
  return datasets.save({ ...dataset, ...patch, updatedAt: new Date().toISOString() });
}

export const useUpdateDataset = () =>
  datasets.useMutate(async ({ id, ...patch }: { id: string; name: string; context: string }) => updateDataset(id, patch));
