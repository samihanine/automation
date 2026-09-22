export const pbiBuilderArtefactPrompt = `A Power BI report built from scratch on the workspace semantic model. Rendered live and downloadable as a .pbix live-connected to the semantic model, so visuals are defined like in Power BI Desktop: with model fields, not with DAX queries.

STRUCTURE (same as the PBI viewer: pages → visuals, report / page / visual filters)
- pages: [{name (id, e.g. "overview"), displayName, filters, visuals}]. "activePage" is the displayed page.
- visual: {name (unique id), title, type, layout, category, values, sort, format, filters}.
  - type: card | bar (horizontal) | column | line | area | pie | doughnut | table | text.
  - layout: 16:9 page split in 12 columns x 9 rows (x 1-12, y 1-9, w, h). Cards w=3 h=2, charts w=6 h=4, full-width table w=12 h=4. Avoid overlaps.
  - category: the axis / slices column, e.g. {"kind":"column","table":"Store","column":"Territory"} (charts only).
  - values: fields shown as values:
    - model measure: {"kind":"measure","table":"Sales","measure":"Total Sales"}
    - aggregated column: {"kind":"column","table":"Sales","column":"Units","aggregation":"Sum"} (Sum | Average | Count | DistinctCount | Min | Max)
    - tables may also list plain columns (no aggregation) to group by.
    - card, pie and doughnut take a single value.
  - sort: {"by":"value"|"category","direction":"desc"|"asc"}.
  - format (render only): number | integer | currency | percent.
  - text visuals use "text" instead of fields.
- measures: report-level DAX measures when the model has no suitable measure, e.g. {"table":"Sales","name":"Sales LY","expression":"CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Time'[Date]))"}. Reference them in values as {"kind":"measure","table":"Sales","measure":"Sales LY"}. Names must not clash with existing model measures.
- Filters (report, page, visual) target model columns: {"filterType":"basic","target":{"table":"Store","column":"Territory"},"operator":"In","values":["NC"]}.

RULES
- Use exact table / column / measure names from the dataset structure. Prefer existing model measures.
- Explore values with run_dax_query before filtering.
- Validation runs the DAX generated for every visual: fix any reported error (wrong name, bad measure expression).
- To edit, send the whole report with update_artefact.`;
