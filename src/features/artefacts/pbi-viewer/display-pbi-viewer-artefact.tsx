import { useEffect, useRef, useState } from "react";
import type { Report } from "powerbi-client";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { describeFilter, embedReport, registerEmbeddedReport, resetEmbed } from "@/lib/pbi-client";
import type { PbiFilter } from "@/lib/pbi-client";
import { errorMessage } from "@/lib/utils";
import type { ArtefactRenderProps } from "../artefact-schema";
import type { PbiViewerArtefact } from "./pbi-artefact-schema";
import { applyReportState, isEmptyState, readReportState, sameState } from "./report-state";

export function DisplayPbiViewerArtefact({ value, context, onChange }: ArtefactRenderProps<PbiViewerArtefact>) {
  const container = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const applied = useRef<PbiViewerArtefact | undefined>(undefined);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  const config = context.report?.config;
  const reportId = config?.reportId;
  const embedUrl = config?.embedUrl;

  useEffect(() => {
    const element = container.current;
    if (!element || !reportId || !embedUrl) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setReport(null);
    setError(null);

    const sync = (embedded: Report) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const current = latest.current.value;
        const state = await readReportState(embedded, current).catch(() => current);
        if (cancelled || sameState(state, current)) return;
        applied.current = state;
        latest.current.onChange(state);
      }, 400);
    };

    embedReport(element, { reportId, embedUrl }, { pageName: latest.current.value.activePage || undefined })
      .then((embedded) => {
        if (cancelled) return;
        registerEmbeddedReport(reportId, embedded);
        for (const event of ["filtersApplied", "pageChanged", "dataSelected"]) embedded.on(event, () => sync(embedded));
        if (isEmptyState(latest.current.value)) {
          applied.current = latest.current.value;
          sync(embedded);
        }
        setReport(embedded);
      })
      .catch((reason: unknown) => !cancelled && setError(errorMessage(reason)));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      registerEmbeddedReport(reportId, null);
      void resetEmbed(element);
    };
  }, [reportId, embedUrl]);

  useEffect(() => {
    if (!report || (applied.current && sameState(applied.current, value))) return;
    const previous = applied.current;
    applied.current = value;
    applyReportState(report, value, previous).catch((reason: unknown) => setError(errorMessage(reason)));
  }, [report, value]);

  const page = config?.pages.find((item) => item.name === value.activePage);
  const pageState = value.pages.find((item) => item.name === value.activePage);
  const chips: Array<{ scope: string; filter: PbiFilter }> = [
    ...value.filters.map((filter) => ({ scope: "Report", filter })),
    ...(pageState?.filters ?? []).map((filter) => ({ scope: "Page", filter })),
    ...(pageState?.visuals ?? []).flatMap((visual) =>
      visual.filters.map((filter) => ({
        scope: page?.visuals.find((item) => item.name === visual.name)?.title || visual.name,
        filter,
      })),
    ),
  ];

  if (!config) return <p className="p-6 text-sm text-muted-foreground">The report of this artefact no longer exists.</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2 text-xs">
        <span className="font-medium">{page?.displayName ?? value.activePage}</span>
        {chips.length === 0 && <span className="text-muted-foreground">· No active filter</span>}
        {chips.map(({ scope, filter }, index) => (
          <Badge key={index} variant="outline" className="font-normal">
            <span className="text-muted-foreground">{scope}:</span> {describeFilter(filter)}
          </Badge>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
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
    </div>
  );
}
