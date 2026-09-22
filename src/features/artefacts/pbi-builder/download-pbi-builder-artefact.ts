import { slugify } from "@/lib/utils";
import type { Workspace } from "@/features/workspaces/workspace-schema";
import type { PbiBuilderArtefact } from "./pbi-builder-artefact-schema";

export async function downloadPbiBuilderArtefact(value: PbiBuilderArtefact, workspace: Workspace) {
  const definition = {
    ...value,
    dataset: {
      id: workspace.datasetConfig.datasetId,
      groupId: workspace.datasetConfig.groupId,
      name: workspace.datasetConfig.name,
    },
  };
  return new File([JSON.stringify(definition, null, 2)], `${slugify(value.title)}.report.json`, {
    type: "application/json",
  });
}
