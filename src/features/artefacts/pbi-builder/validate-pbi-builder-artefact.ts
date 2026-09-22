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
      const where = `page "${page.name}" visual "${visual.name}"`;
      try {
        const result = await runDax(workspace.datasetConfig, query);
        const columns = new Set(result.columns.map((column) => column.name));
        return [visual.category, ...visual.values]
          .filter((column): column is string => Boolean(column) && result.rowCount > 0 && !columns.has(column!))
          .map((column) => `${where}: column "${column}" not in result (${[...columns].join(", ")})`);
      } catch (error) {
        return [`${where}: ${errorMessage(error)}`];
      }
    }),
  );
  return (await Promise.all(checks)).flat();
}
