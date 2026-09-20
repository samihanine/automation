# Atelier

A frontend table workspace with a single working folder. Built with React, TypeScript, TanStack Router, Zod, ExcelJS and shadcn/Base UI.

```sh
bun install
bun dev
```

## Workspace

Choose a working folder on the first visit to Tables. Its name and reference are stored in LocalStorage; its browser directory handle is stored in IndexedDB. Browsers do not expose the full native filesystem path. Use desktop Chrome or Edge on localhost/HTTPS for folder access.

**Change folder** switches to that folder's tables and schemas without moving or deleting files. Selecting a previous folder restores its workspace. Use **Grant access** if the browser requires renewed permission. Existing files are never silently overwritten when creating a table.

The application contains only Tables. There is no sidebar, source system, standalone schema editor, AI integration or page navigation.

## Create and edit tables

Click **+** beside the table tabs to create a table. Upload CSV/XLSX, select a worksheet, and name the table. Columns and a schema are inferred from the file; the rows are written into a new workbook in the working folder. Type inference is conservative: booleans, numbers, ISO dates, otherwise text. You can also create an empty table or use an imported schema as a template.

The first input row contains headers. CSV accepts comma, semicolon or tab separators, quoted multiline fields and escaped quotes. Legacy `.xls` files must first be converted to `.xlsx`. If the destination filename already exists, choose another table name to preserve it.

The settings icon beside each column opens a sheet for its name, type, order, options, colors and relation target. Use **⋮ → Add column** to add a field. Schema edits are persisted locally when applied; click **Save** to write row and schema changes into the workbook. Invalid type conversions are rejected without discarding the original values.

Each column has a filter above the table. Option, boolean and relation filters allow multiple selections; selected options display their configured colors. Text, number and date columns use appropriately typed inputs. Filters combine with AND; selected values within a filter combine with OR.

Grid and Detail views share rows and selection. The download icon exports selected rows to Excel; the copy icon copies selected rows as tab-separated values. There is no Open Excel or CSV export action. Existing row import with column mapping remains available through **Import data**.

## Schemas

**Download schema** exports the workspace's JSON structure, including option colors and relations. **Import schema** adds or updates schemas by ID. Existing rows are associated with columns by stable ID. Imported templates are available in the new-table dialog. Importing a schema is disabled while there are unsaved row changes.

Each folder has independent schema and table metadata in `atelier:workspace:<folder-id>`. Existing Excel sources from earlier versions can recover their registered tables when the same directory handle is selected. Older browser-only tables and workbook files are not deleted or silently migrated.

## Excel

Each table is one `.xlsx` file. Generated workbooks have light-gray filterable headers, equal 32-character column widths, 40-point rows, thin cell borders and conditional formatting for colored options. Stable IDs are kept in a hidden column and metadata worksheet. The reader ignores these internal fields when using a generated workbook to create a new table.

Save refuses to overwrite files modified since their last read. Reload before saving if another application changed the workbook. The folder remains the durable location for the data; workspace registration and schemas are browser-local, so keep schema exports when moving between browsers.

Rich text supports bold, italic, lists and embedded PNG/JPEG/GIF images. The detail editor spans the full form width. Excel stores formatted text in cells and image previews on an Images worksheet. Hidden metadata preserves the original rich content when reopening unchanged cells.

The detail header and record cards show colored option tags. Option and relation fields use shadcn selects. Schema import/export is available from the table's ⋮ menu.

## Code

- `src/lib/workspace.ts`: folder selection, handle persistence and permissions.
- `src/lib/xlsx.ts`: workbook storage, formatting, file import and schema inference.
- `src/lib/local-storage.ts`: JSON persistence and downloads.
- `src/schema/tableSchema.ts`: contracts and schema validation.
- `src/components/table-context.tsx`: workspace state and action feedback.
- `src/components/table-ui.tsx`: shared Tailwind field and layout styles.
- `src/components/tables-workspace.tsx`: table creation, rows, filters and import/export.
- `src/components/column-settings.tsx`: column settings sheet.
- `AGENTS.md`: code and design rules.

No tests, builds or browser checks were run for this simplification, as requested.

## Views and table actions

The checkbox to the left of the filters selects all filtered rows in any view. Selection is shared by Grid, Detail, Kanban and Dashboard; exports use the selected rows.

Kanban groups rows by the first Options column by default. Choose another Options column with **Group by**. Drag cards between groups or use **Move to**; open a card to edit its details. Click **Save** to persist changes. Dashboard shows counts, percentages and a Recharts donut for every Options column, using the filtered rows. Unassigned and unavailable values remain visible in both views.

The **⋮** menu contains **Add column**, **Rename table** and schema import/export. Renaming also renames the workbook, preserves row IDs and unsaved edits, and rejects filename collisions or external file changes.

Column settings include a description. Saved and downloaded workbooks include **Legend** as the second worksheet, with each column's description, type and colored options. Generated Legend sheets are excluded from data imports.

Paste a PNG, JPEG or GIF image directly into rich text with Ctrl+V or Cmd+V. Pasted and uploaded images use the same embedded base64 storage and Excel export.
