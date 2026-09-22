export const xlsxArtefactPrompt = `An Excel workbook shown as tables and downloadable as .xlsx.
- A workbook has 1 to 10 sheets. Each sheet has columns and either live data from a DAX "query" or static "rows".
- Prefer "query" for dataset data: rows are then fetched live (no row limit issue, no copy mistakes). Test the query with run_dax_query first, then reuse the exact same text. Column keys must match the result column names returned by run_dax_query (e.g. "Territory", "Total Sales").
- Use static "rows" only for small hand-made tables (summaries, assumptions, comments). Keys of each row must match column keys.
- Pick formats: "currency" for amounts, "percent" for ratios (0.25 = 25%), "integer" for counts, "date" for ISO dates.
- To edit, send the whole workbook with update_artefact.`;
