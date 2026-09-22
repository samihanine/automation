import { MonitorPlayIcon } from "lucide-react";
import { defineArtefact } from "../artefact-schema";
import { describeReportPages } from "./pbi-artefact-context";
import { pbiViewerArtefactPrompt } from "./pbi-artefact-prompt";
import { pbiViewerArtefactSchema } from "./pbi-artefact-schema";
import { DisplayPbiViewerArtefact } from "./display-pbi-viewer-artefact";
import { validatePbiViewerArtefact } from "./validate-pbi-viewer-artefact";

export const pbiViewerArtefact = defineArtefact({
  type: "pbi-viewer",
  label: "PBI Viewer",
  description: "Navigate and filter the workspace Power BI report",
  icon: MonitorPlayIcon,
  schema: pbiViewerArtefactSchema,
  prompt: pbiViewerArtefactPrompt,
  context: describeReportPages,
  initial: (workspace) => ({
    title: workspace.reportConfig.name,
    activePage: workspace.reportConfig.pages[0]?.name ?? "",
    filters: [],
    pages: [],
  }),
  validate: validatePbiViewerArtefact,
  render: DisplayPbiViewerArtefact,
});
