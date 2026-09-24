import { datasetPath, fetchSemanticModelStructure, powerBiRequest } from "@/lib/dax";
import { groupFromPath, GUID } from "@/lib/pbi-url";
import { datasets } from "./dataset-store";

export function parseDatasetUrl(url: string) {
  const { pathname } = new URL(url);
  const datasetId = new RegExp(`/(?:datasets|semanticmodels)/(${GUID})`, "i").exec(pathname)?.[1];
  if (!datasetId) throw new Error("No semantic model ID found in the URL.");
  return { datasetId, groupId: groupFromPath(pathname) };
}

export async function createDataset(url: string) {
  const target = parseDatasetUrl(url);
  const [info, structure] = await Promise.all([
    powerBiRequest<{ name: string; webUrl?: string; configuredBy?: string }>(datasetPath(target)),
    fetchSemanticModelStructure(target),
  ]);
  const now = new Date().toISOString();
  return datasets.save({
    id: crypto.randomUUID(),
    name: info.name,
    config: { url, ...target, webUrl: info.webUrl, configuredBy: info.configuredBy, structure, generatedAt: now },
    context: "",
    createdAt: now,
    updatedAt: now,
  });
}

export const useCreateDataset = () => datasets.useMutate(createDataset);
