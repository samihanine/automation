export const markdownArtefactPrompt = `A Markdown document rendered live and exportable as PDF.
- "content" is GitHub-flavoured markdown: headings (##, ###), paragraphs, **bold**, *italic*, bullet and numbered lists, tables, blockquotes, code blocks, horizontal rules.
- Do not repeat "title" as an H1 in content: the title is rendered separately. Start sections at "##".
- Every number must come from a run_dax_query result. Format numbers for humans (1 234 567 → "1.23M", percentages with one decimal).
- Prefer short sections, markdown tables for figures, and a short "Key takeaways" list when relevant.
- To edit, send the full updated document with update_artefact (keep unchanged parts as they are).`;
