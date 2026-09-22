import { z } from "zod";

export const markdownArtefactSchema = z.object({
  title: z.string().min(1).max(120).describe("Document title"),
  content: z
    .string()
    .max(40000)
    .describe("GitHub-flavoured markdown body, without repeating the title as H1"),
});

export type MarkdownArtefact = z.infer<typeof markdownArtefactSchema>;
