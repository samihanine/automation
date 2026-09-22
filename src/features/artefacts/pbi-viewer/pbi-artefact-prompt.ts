export const pbiViewerArtefactPrompt = `Controls an existing embedded Power BI report (read-only, not downloadable).
- The artefact state is applied to the live report: "activePage" is the displayed page, "filters" are report-level filters, "pages[].filters" page-level filters, "pages[].visuals[].filters" visual-level filters (for slicers they set the slicer selection).
- Use page and visual "name" ids exactly as listed in the report description, never display names.
- Filters target a model column: {"table": "Store", "column": "Territory"}. Check names in the dataset structure and check values with run_dax_query (e.g. EVALUATE VALUES('Store'[Territory])) before filtering.
- Basic filter: {"filterType":"basic","target":{...},"operator":"In","values":["NC","TN"]}.
- Advanced filter: {"filterType":"advanced","target":{...},"logicalOperator":"And","conditions":[{"operator":"GreaterThanOrEqual","value":2014}]}.
- To clear filters, send empty arrays. Keep "pages" limited to pages that carry state.
- You cannot add or edit visuals here: explain what the report shows and navigate / filter it.`;
