import { markdownToPdf } from "@/lib/markdown";
import { slugify } from "@/lib/utils";
import type { MarkdownArtefact } from "./markdown-artefact-schema";

export async function downloadMarkdownArtefact(value: MarkdownArtefact) {
  const blob = await markdownToPdf(value.title, `# ${value.title}\n\n${value.content}`);
  return new File([blob], `${slugify(value.title)}.pdf`, { type: "application/pdf" });
}
