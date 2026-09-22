import { applyFiltersToDax } from "@/lib/pbi-client";
import type { PbiBuilderArtefact, PbiBuilderPage, PbiBuilderVisual } from "./pbi-builder-artefact-schema";

export function visualQuery(report: PbiBuilderArtefact, page: PbiBuilderPage, visual: PbiBuilderVisual) {
  if (!visual.query) return undefined;
  return applyFiltersToDax(visual.query, [...report.filters, ...page.filters, ...visual.filters]);
}
