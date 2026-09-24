import { markdownToPdf } from "@/lib/markdown";
import { slugify } from "@/lib/utils";
import type { MarkdownArtefact } from "./markdown-artefact-schema";

const document = (value: MarkdownArtefact) => `# ${value.title}\n\n${value.content}`;

export async function downloadMarkdownPdf(value: MarkdownArtefact) {
  const blob = await markdownToPdf(value.title, document(value));
  return new File([blob], `${slugify(value.title)}.pdf`, { type: "application/pdf" });
}

export async function downloadMarkdownFile(value: MarkdownArtefact) {
  return new File([document(value)], `${slugify(value.title)}.md`, { type: "text/markdown" });
}

export async function readMarkdownFile(file: File): Promise<MarkdownArtefact> {
  const text = await file.text();
  const heading = /^#\s+(.+)\n+/.exec(text);
  return {
    title: heading?.[1].trim() ?? file.name.replace(/\.[^.]+$/, ""),
    content: heading ? text.slice(heading[0].length) : text,
  };
}
