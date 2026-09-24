import { RichMarkdown } from "@/components/rich-markdown";
import type { ArtefactRenderProps } from "../artefact-schema";
import type { MarkdownArtefact } from "./markdown-artefact-schema";

export function DisplayMarkdownArtefact({ value }: ArtefactRenderProps<MarkdownArtefact>) {
  return (
    <div className="h-full overflow-auto bg-muted/40 p-6">
      <article className="mx-auto max-w-3xl rounded-md border bg-background px-10 py-8 shadow-sm">
        <RichMarkdown>{`# ${value.title}\n\n${value.content}`}</RichMarkdown>
      </article>
    </div>
  );
}
