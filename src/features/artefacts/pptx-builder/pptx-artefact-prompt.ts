import { themeFonts, themePresets } from "@/lib/pptx";

export const pptxArtefactPrompt = `A PowerPoint deck (16:9) rendered live and downloadable as .pptx.

LAYOUT
- Each slide is a 9x9 grid. Every section has x, y (start cell, 1-9) and w, h (size in cells, 1-9).
- Constraints: x + w - 1 <= 9, y + h - 1 <= 9, sections of a slide must not overlap. Leave empty cells for breathing room.
- Typical layouts: title row y=1 h=2 w=9; two columns w=4 at x=1 and x=6; three KPIs w=3 at x=1,4,7; a big chart w=6 h=6 next to bullets w=3.

SECTIONS ("content.type" with a visual "content.variant")
- title (center | left | banner): title, subtitle?. Needs h>=2.
- text (plain | card | accent): heading?, body.
- bullets (dots | numbers | checks): heading?, 1-8 short items.
- hero (image-left | image-right | image-background): title, text?, imageUrl? (public https). Needs w>=4, h>=3.
- kpi (plain | card | filled): label, value (formatted, <=12 chars like "$1.2M"), delta?, trend? (up|down|flat). Needs w>=2, h>=2.
- chart (default | minimal): chartType bar|column|line|area|pie|doughnut, title?, categories (<=24), series [{name, values}] with one value per category (pie: one series), showValues. Needs w>=3, h>=3.
- table (striped | plain | header-filled): heading?, columns (<=8), rows (arrays with one cell per column). Rows fit about 2*h-1.
- quote (plain | filled): text, author?.
- image (cover | contain): url (public https), caption?.

TEXT LIMITS
- Text is sized automatically from the section size. Roughly: body text fits ~30 characters per cell of area (w*h*30), headings ~7 characters per column of width. Validation rejects overflowing text with the exact limit: shorten the text or enlarge the section.
- Slides are visual: one idea per slide, short phrases, no paragraphs longer than 3 lines.

THEME
- theme.preset: ${Object.keys(themePresets).join(" | ")}. Optional overrides theme.primary / theme.accent (#RRGGBB). theme.font: ${themeFonts.join(" | ")}.
- slide.background: default | surface | primary (primary = colored slide with white text, good for section breaks).

DATA
- Every figure must come from run_dax_query results. Aggregate before charting (top 10, by month…).
- Put speaker notes in slide.notes when useful.
- To edit, send the full deck with update_artefact.`;
