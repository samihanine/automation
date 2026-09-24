import { FileTextIcon } from "lucide-react";
import { defineArtefact } from "../artefact-schema";
import { DisplayMarkdownArtefact } from "./display-markdown-artefact";
import { downloadMarkdownFile, downloadMarkdownPdf, readMarkdownFile } from "./download-markdown-artefact";
import { markdownArtefactPrompt } from "./markdown-artefact-prompt";
import { markdownArtefactSchema } from "./markdown-artefact-schema";

export const markdownBuilderArtefact = defineArtefact({
  type: "markdown-builder",
  label: "Markdown",
  description: "Write a report or memo in markdown + HTML, export it as PDF or .md",
  icon: FileTextIcon,
  schema: markdownArtefactSchema,
  prompt: markdownArtefactPrompt,
  initial: ({ dataset }) => ({ title: `${dataset.name} notes`, content: "" }),
  upload: { accept: ".md,.mdx,.markdown,.txt", read: readMarkdownFile },
  render: DisplayMarkdownArtefact,
  downloads: [
    { label: "PDF", run: downloadMarkdownPdf },
    { label: "Markdown", run: downloadMarkdownFile },
  ],
});
