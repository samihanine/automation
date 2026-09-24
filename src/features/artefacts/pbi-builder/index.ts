import { LayoutDashboardIcon } from "lucide-react";
import { defineArtefact } from "../artefact-schema";
import { pbiBuilderArtefactPrompt } from "./pbi-builder-artefact-prompt";
import { pbiBuilderArtefactSchema } from "./pbi-builder-artefact-schema";
import { DisplayPbiBuilderArtefact } from "./display-pbi-builder-artefact";
import { downloadPbiBuilderArtefact } from "./download-pbi-builder-artefact";
import { validatePbiBuilderArtefact } from "./validate-pbi-builder-artefact";

export const pbiBuilderArtefact = defineArtefact({
  type: "pbi-builder",
  label: "PBI Builder",
  description: "Build a new Power BI report on the dataset, export it as .pbix",
  icon: LayoutDashboardIcon,
  schema: pbiBuilderArtefactSchema,
  prompt: pbiBuilderArtefactPrompt,
  initial: ({ dataset }) => ({
    title: `${dataset.name} report`,
    activePage: "page1",
    filters: [],
    pages: [{ name: "page1", displayName: "Page 1", filters: [], visuals: [] }],
  }),
  validate: validatePbiBuilderArtefact,
  render: DisplayPbiBuilderArtefact,
  downloads: [{ label: "Power BI (.pbix)", run: downloadPbiBuilderArtefact }],
});
