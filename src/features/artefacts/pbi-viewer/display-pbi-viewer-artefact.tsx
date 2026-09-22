import { useEffect, useRef, useState } from "react";
import type { Report, models } from "powerbi-client";
import { Spinner } from "@/components/ui/spinner";
import { embedReport, resetEmbed, toPowerBiFilter } from "@/lib/pbi-client";
import { errorMessage } from "@/lib/utils";
import type { ArtefactRenderProps } from "../artefact-schema";
import type { PbiViewerArtefact } from "./pbi-artefact-schema";

async function applyState(report: Report, value: PbiViewerArtefact, previous?: PbiViewerArtefact) {
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

export function DisplayPbiViewerArtefact({ value, workspace, onChange }: ArtefactRenderProps<PbiViewerArtefact>) {
  const container = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const applied = useRef<PbiViewerArtefact | undefined>(undefined);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  const { reportId, embedUrl } = workspace.reportConfig;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    setReport(null);
    setError(null);
    applied.current = undefined;
    embedReport(element, { reportId, embedUrl }, { pageName: latest.current.value.activePage })
      .then((embedded) => {
        if (cancelled) return;
        embedded.on("pageChanged", (event) => {
          const name = (event.detail as { newPage?: { name?: string } }).newPage?.name;
          const current = latest.current.value;
          if (name && name !== current.activePage) {
            applied.current = { ...current, activePage: name };
            latest.current.onChange({ ...current, activePage: name });
          }
        });
        setReport(embedded);
      })
      .catch((reason) => !cancelled && setError(errorMessage(reason)));
    return () => {
      cancelled = true;
      void resetEmbed(element);
    };
  }, [reportId, embedUrl]);

  useEffect(() => {
    if (!report) return;
    const previous = applied.current;
    applied.current = value;
    applyState(report, value, previous).catch((reason) => setError(errorMessage(reason)));
  }, [report, value]);

  return (
    <div className="relative h-full">
      <div ref={container} className="h-full w-full [&_iframe]:border-0" />
      {!report && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {error && (
        <p className="absolute inset-x-4 bottom-4 rounded-md border border-destructive/30 bg-background p-3 text-xs text-destructive shadow">
          {error}
        </p>
      )}
    </div>
  );
}
