import { runDax } from "@/lib/dax";
import { errorMessage } from "@/lib/utils";
import type { Workspace } from "@/features/workspaces/workspace-schema";
import type { PbiBuilderArtefact } from "./pbi-builder-artefact-schema";
import { visualQuery } from "./visual-query";

export async function validatePbiBuilderArtefact(value: PbiBuilderArtefact, workspace: Workspace) {
  const checks = value.pages.flatMap((page) =>
    page.visuals.map(async (visual) => {
      const query = visualQuery(value, page, visual);
      if (!query) return [];
      try {
        await runDax(workspace.datasetConfig, query);
        return [];
      } catch (error) {
        return [`page "${page.name}" visual "${visual.name}": ${errorMessage(error)}\nGenerated DAX: ${query}`];
      }
    }),
  );
  return (await Promise.all(checks)).flat();
}
