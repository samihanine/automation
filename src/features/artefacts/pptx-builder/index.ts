import { PresentationIcon } from "lucide-react";
import { defineArtefact } from "../artefact-schema";
import { DisplayPptxArtefact } from "./display-pptx-artefact";
import { downloadPptxArtefact } from "./download-pptx-artefact";
import { pptxArtefactPrompt } from "./pptx-artefact-prompt";
import { pptxArtefactSchema } from "./pptx-artefact-schema";

export const pptxBuilderArtefact = defineArtefact({
  type: "pptx-builder",
  label: "PPTX Builder",
  description: "Design slide decks on a 9x9 grid, export as PowerPoint",
  examples: [
    "Create a 5-slide deck on this year's sales",
    "Make a one-slide KPI summary for management",
    "Build a deck comparing chains and districts",
  ],
  icon: PresentationIcon,
  schema: pptxArtefactSchema,
  prompt: pptxArtefactPrompt,
  initial: (workspace) => ({
    title: `${workspace.title} presentation`,
    theme: { preset: "corporate" as const, font: "Calibri" as const },
    slides: [],
  }),
  render: DisplayPptxArtefact,
  download: downloadPptxArtefact,
});
