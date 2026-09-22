import type { ArtefactDefinition, ArtefactType } from "./artefact-schema";
import { markdownBuilderArtefact } from "./markdown-builder";
import { pbiBuilderArtefact } from "./pbi-builder";
import { pbiViewerArtefact } from "./pbi-viewer";
import { pptxBuilderArtefact } from "./pptx-builder";
import { xlsxBuilderArtefact } from "./xlsx-builder";

export const artefacts: Record<ArtefactType, ArtefactDefinition> = {
  "pbi-builder": pbiBuilderArtefact,
  "pbi-viewer": pbiViewerArtefact,
  "xlsx-builder": xlsxBuilderArtefact,
  "pptx-builder": pptxBuilderArtefact,
  "markdown-builder": markdownBuilderArtefact,
};

export * from "./artefact-schema";
