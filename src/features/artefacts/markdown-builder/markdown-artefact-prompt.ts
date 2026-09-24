export const markdownArtefactPrompt = `A document written in MDX-style markdown (GitHub markdown + inline HTML), rendered live and downloadable as PDF or .md.
- "content" supports headings (##, ###), paragraphs, **bold**, *italic*, lists, tables, blockquotes, code blocks, horizontal rules, and HTML such as <span style="color:#16a34a">, <mark>, <div style="…">, <br>, <sup>, <details>. No scripts, no JSX components.
- Use HTML only when markdown cannot express it (colors, alignment, highlighted callouts, layout).
- Do not repeat "title" as an H1 in content: the title is rendered separately. Start sections at "##".
- Every number must come from a run_dax_query result. Format numbers for humans ("1.23M", percentages with one decimal).
- Prefer short sections, tables for figures, and a short "Key takeaways" list when relevant.
- For small changes use edit_artefact on "content" (the full text) or "title".`;
