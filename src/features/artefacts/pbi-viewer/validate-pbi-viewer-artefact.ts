import type { ArtefactContext } from "../artefact-schema";
import type { PbiViewerArtefact } from "./pbi-artefact-schema";

export async function validatePbiViewerArtefact(value: PbiViewerArtefact, { report }: ArtefactContext) {
  if (!report) return ["No report selected."];
  const pages = new Map(report.config.pages.map((page) => [page.name, page]));
  const errors: string[] = [];
  if (!pages.has(value.activePage)) {
    errors.push(`activePage "${value.activePage}" does not exist. Valid pages: ${[...pages.keys()].join(", ")}`);
  }
  for (const pageState of value.pages) {
    const page = pages.get(pageState.name);
    if (!page) {
      errors.push(`page "${pageState.name}" does not exist`);
      continue;
    }
    const visuals = new Set(page.visuals.map((visual) => visual.name));
    for (const visual of pageState.visuals) {
      if (!visuals.has(visual.name)) {
        errors.push(`visual "${visual.name}" does not exist on page "${page.name}"`);
      }
    }
  }
  return errors;
}
