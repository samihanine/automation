export const pbiBuilderArtefactPrompt = `A Power BI report built from scratch on the dataset. Rendered live (one visual per row with its configuration) and downloadable as a .pbix live-connected to the semantic model. Visuals are defined like in Power BI Desktop, with model fields only: no DAX anywhere in the artefact.

STRUCTURE (same as the PBI viewer: pages → visuals, report / page / visual filters)
- pages: [{name (id, e.g. "overview"), displayName, filters, visuals}]. "activePage" is the displayed page.
- visual: {name (unique id), title, type, layout, category, rows, columns, values, sort, format, filters}.
  - type: card | bar (horizontal) | column | line | area | pie | doughnut | table | matrix | text.
  - category: axis / slices column for charts, e.g. {"kind":"column","table":"Store","column":"Territory"}.
  - rows / columns: header columns of a matrix (rows required, columns optional).
  - values:
    - model measure: {"kind":"measure","table":"Sales","measure":"Total Sales"}
    - aggregated column: {"kind":"column","table":"Sales","column":"Units","aggregation":"Sum"} (Sum | Average | Count | DistinctCount | Min | Max)
    - tables may also list plain columns (no aggregation) to group by.
    - card, pie and doughnut take a single value.
  - sort: {"by":"value"|"category","direction":"desc"|"asc"}.
  - format (render only): number | integer | currency | percent.
  - layout: position in the exported .pbix, 16:9 page split in 12 columns x 9 rows (x 1-12, y 1-9, w, h). Cards w=3 h=2, charts w=6 h=4, tables/matrices w=12 h=4. Avoid overlaps.
  - text visuals use "text" (markdown / simple HTML) instead of fields.
- Filters (report, page, visual) target model columns: {"filterType":"basic","target":{"table":"Store","column":"Territory"},"operator":"In","values":["NC"]}.

RULES
- Use exact table / column / measure names from the dataset structure. Only existing model measures can be used: if a calculation is missing, use an aggregated column or a filter, or explain it to the user.
- Explore values with run_dax_query before filtering.
- Validation runs every visual against the model: fix any reported error.
- Create with update_artefact, then use edit_artefact to add visuals ("insert" into "pages.0.visuals") or change fields.`;
