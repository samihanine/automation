import type { Workspace } from "@/features/workspaces/workspace-schema";

export function describeReportPages(workspace: Workspace) {
  const { reportConfig } = workspace;
  return [
    `Report "${reportConfig.name}" pages (name → display name, then visuals as name: type "title"):`,
    ...reportConfig.pages.flatMap((page) => [
      `- ${page.name} → "${page.displayName}"`,
      ...page.visuals.map((visual) => `    - ${visual.name}: ${visual.type}${visual.title ? ` "${visual.title}"` : ""}`),
    ]),
  ].join("\n");
}
