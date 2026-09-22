import { FileTextIcon } from "lucide-react";
import { defineArtefact } from "../artefact-schema";
import { DisplayMarkdownArtefact } from "./display-markdown-artefact";
import { downloadMarkdownArtefact } from "./download-markdown-artefact";
import { markdownArtefactPrompt } from "./markdown-artefact-prompt";
import { markdownArtefactSchema } from "./markdown-artefact-schema";

export const markdownBuilderArtefact = defineArtefact({
  type: "markdown-builder",
  label: "Markdown Builder",
  description: "Write a report or memo, export it as PDF",
  icon: FileTextIcon,
  schema: markdownArtefactSchema,
  prompt: markdownArtefactPrompt,
  initial: (workspace) => ({ title: `${workspace.title} notes`, content: "" }),
  render: DisplayMarkdownArtefact,
  download: downloadMarkdownArtefact,
});
