# Project rules

- Keep code short, readable, modular and grouped by business concern. Prefer a few cohesive files over many tiny abstractions.
- Use TypeScript, React, TanStack Router, Zod, ExcelJS and the existing shadcn/Base UI components. Reuse installed dependencies.
- Run all business logic in the frontend. Keep the application focused on tables; do not add AI, agents, chat or unrelated pages.
- Do not add source-code comments, speculative features or generic frameworks. Use clear names instead.
- Use English for interface text, errors, placeholders, accessibility labels and documentation. Never translate user-entered content.
- Keep the interface white and minimal: thin neutral borders, compact spacing, readable sans-serif text and gold primary actions. Use Tailwind utilities and shadcn primitives for styling; keep global CSS limited to theme tokens and base styles. Do not add a table-specific stylesheet.
- Avoid fake profile information, decorative sidebar headers or footers, and nonfunctional controls.
- Use one selected workspace folder, with its handle in IndexedDB and its display name/reference in LocalStorage. No sidebar, source system or standalone schema pages. Keep schemas separate from rows, edit columns through a sheet, and infer schemas when creating tables from CSV/XLSX. Persist stable IDs and preserve user data during changes.
- Use the same option colors and column order in the UI and Excel. Excel sheets have light-gray filterable headers, equal wide columns, 40-point rows, cell borders and conditional formatting for options.
- Handle errors at user action boundaries. Do not silently replace data or report an operation as successful before it finishes.
- Do not run tests, builds or browser checks unless requested. Formatting and required route generation are allowed.
- Do not delegate work unless explicitly requested.
