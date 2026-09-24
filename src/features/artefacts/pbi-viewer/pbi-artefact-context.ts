import type { ArtefactContext } from "../artefact-schema";

export function describeReportPages({ report }: ArtefactContext) {
  if (!report) return "No report selected.";
  return [
    `Report "${report.name}" pages (name → display name, then visuals as name: type "title"):`,
    ...report.config.pages.flatMap((page) => [
      `- ${page.name} → "${page.displayName}"`,
      ...page.visuals.map((visual) => `    - ${visual.name}: ${visual.type}${visual.title ? ` "${visual.title}"` : ""}`),
    ]),
    "",
    `Report business context (written by the user):\n${report.context.trim() || "(none)"}`,
  ].join("\n");
}
