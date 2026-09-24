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
  description: "Navigate and filter an existing Power BI report",
  icon: MonitorPlayIcon,
  requiresReport: true,
  schema: pbiViewerArtefactSchema,
  prompt: pbiViewerArtefactPrompt,
  describeContext: describeReportPages,
  initial: ({ report }) => ({
    title: report?.name ?? "Report",
    activePage: report?.config.pages[0]?.name ?? "",
    filters: [],
    pages: [],
  }),
  validate: validatePbiViewerArtefact,
  render: DisplayPbiViewerArtefact,
  downloads: [],
});
