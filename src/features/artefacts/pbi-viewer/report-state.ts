import type { Report, VisualDescriptor, models } from "powerbi-client";
import { fromPowerBiFilter, toPowerBiFilter } from "@/lib/pbi-client";
import type { PbiFilter } from "@/lib/pbi-client";
import type { PbiViewerArtefact } from "./pbi-artefact-schema";

const toFilters = (filters: models.IFilter[]) =>
  filters.map(fromPowerBiFilter).filter((filter): filter is PbiFilter => filter !== null);

async function visualFilters(visual: VisualDescriptor) {
  try {
    return toFilters(visual.type === "slicer" ? (await visual.getSlicerState()).filters : await visual.getFilters());
  } catch {
    return [];
  }
}

export async function readReportState(report: Report, value: PbiViewerArtefact): Promise<PbiViewerArtefact> {
  const page = await report.getActivePage();
  const [reportFilters, pageFilters, visuals] = await Promise.all([report.getFilters(), page.getFilters(), page.getVisuals()]);
  const visualStates = (
    await Promise.all(visuals.map(async (visual) => ({ name: visual.name, filters: await visualFilters(visual) })))
  ).filter((visual) => visual.filters.length > 0);
  const pageState = { name: page.name, filters: toFilters(pageFilters), visuals: visualStates };
  return {
    ...value,
    activePage: page.name,
    filters: toFilters(reportFilters),
    pages: [
      ...value.pages.filter((item) => item.name !== page.name),
      ...(pageState.filters.length || visualStates.length ? [pageState] : []),
    ],
  };
}

export async function applyReportState(report: Report, value: PbiViewerArtefact, previous?: PbiViewerArtefact) {
  const active = await report.getActivePage();
  if (active.name !== value.activePage) await report.setPage(value.activePage);
  await report.setFilters(value.filters.map(toPowerBiFilter));

  const pageNames = new Set([...(previous?.pages ?? []), ...value.pages].map((page) => page.name));
  for (const pageName of pageNames) {
    const state = value.pages.find((page) => page.name === pageName);
    const before = previous?.pages.find((page) => page.name === pageName);
    const page = report.page(pageName);
    await page.setFilters((state?.filters ?? []).map(toPowerBiFilter));
    const visualNames = new Set([...(before?.visuals ?? []), ...(state?.visuals ?? [])].map((visual) => visual.name));
    for (const visualName of visualNames) {
      const filters = (state?.visuals.find((visual) => visual.name === visualName)?.filters ?? []).map(toPowerBiFilter);
      const visual = await page.getVisualByName(visualName);
      if (visual.type === "slicer") await visual.setSlicerState({ filters: filters as models.ISlicerFilter[] });
      else await visual.setFilters(filters);
    }
  }
}

export const isEmptyState = (value: PbiViewerArtefact) => value.filters.length === 0 && value.pages.length === 0;

export const sameState = (a: PbiViewerArtefact, b: PbiViewerArtefact) => JSON.stringify(a) === JSON.stringify(b);
