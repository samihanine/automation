import { buildThinPbix } from "@/lib/pbix";
import { slugify } from "@/lib/utils";
import type { Workspace } from "@/features/workspaces/workspace-schema";
import type { PbiBuilderArtefact } from "./pbi-builder-artefact-schema";
import { buildPbixLayout } from "./pbix-layout";

export async function downloadPbiBuilderArtefact(value: PbiBuilderArtefact, workspace: Workspace) {
  const blob = buildThinPbix(buildPbixLayout(value), workspace.datasetConfig.datasetId);
  return new File([blob], `${slugify(value.title)}.pbix`, { type: blob.type });
}
