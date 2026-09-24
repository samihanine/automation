import { PresentationIcon } from "lucide-react";
import { defineArtefact } from "../artefact-schema";
import { DisplayPptxArtefact } from "./display-pptx-artefact";
import { downloadPptxArtefact } from "./download-pptx-artefact";
import { pptxArtefactPrompt } from "./pptx-artefact-prompt";
import { pptxArtefactSchema } from "./pptx-artefact-schema";

export const pptxBuilderArtefact = defineArtefact({
  type: "pptx-builder",
  label: "PowerPoint",
  description: "Design slide decks on a 9x9 grid, export as .pptx",
  icon: PresentationIcon,
  schema: pptxArtefactSchema,
  prompt: pptxArtefactPrompt,
  initial: ({ dataset }) => ({
    title: `${dataset.name} presentation`,
    theme: { preset: "corporate" as const, font: "Calibri" as const },
    slides: [],
  }),
  render: DisplayPptxArtefact,
  downloads: [{ label: "PowerPoint", run: downloadPptxArtefact }],
});
