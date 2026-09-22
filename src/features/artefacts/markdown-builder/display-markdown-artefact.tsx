import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ArtefactRenderProps } from "../artefact-schema";
import type { MarkdownArtefact } from "./markdown-artefact-schema";

export function DisplayMarkdownArtefact({ value }: ArtefactRenderProps<MarkdownArtefact>) {
  return (
    <div className="h-full overflow-auto bg-muted/40 p-6">
      <article className="markdown mx-auto max-w-3xl rounded-md border bg-background px-10 py-8 shadow-sm">
        <h1>{value.title}</h1>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value.content}</ReactMarkdown>
      </article>
    </div>
  );
}
