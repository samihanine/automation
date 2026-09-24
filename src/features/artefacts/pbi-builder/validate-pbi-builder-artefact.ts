import { runDax } from "@/lib/dax";
import { errorMessage } from "@/lib/utils";
import type { ArtefactContext } from "../artefact-schema";
import type { PbiBuilderArtefact } from "./pbi-builder-artefact-schema";
import { visualQuery } from "./visual-query";

export async function validatePbiBuilderArtefact(value: PbiBuilderArtefact, { dataset }: ArtefactContext) {
  const checks = value.pages.flatMap((page) =>
    page.visuals.map(async (visual) => {
      const query = visualQuery(value, page, visual);
      if (!query) return [];
      try {
        await runDax(dataset.config, query);
        return [];
      } catch (error) {
        return [`page "${page.name}" visual "${visual.name}": ${errorMessage(error)}`];
      }
    }),
  );
  return (await Promise.all(checks)).flat();
}
