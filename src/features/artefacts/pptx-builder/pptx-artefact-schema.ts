import { z } from "zod";
import { fontSizes, lineHeight, textCapacity, themeFonts, themePresets } from "@/lib/pptx";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB color");
const cell = z.number().int().min(1).max(9);

export const pptxSectionContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("title"),
    variant: z.enum(["center", "left", "banner"]).default("left"),
    title: z.string().min(1),
    subtitle: z.string().optional(),
  }),
  z.object({
    type: z.literal("text"),
    variant: z.enum(["plain", "card", "accent"]).default("plain"),
    heading: z.string().optional(),
    body: z.string().min(1),
  }),
  z.object({
    type: z.literal("bullets"),
    variant: z.enum(["dots", "numbers", "checks"]).default("dots"),
    heading: z.string().optional(),
    items: z.array(z.string().min(1)).min(1).max(8),
  }),
  z.object({
    type: z.literal("hero"),
    variant: z.enum(["image-left", "image-right", "image-background"]).default("image-left"),
    title: z.string().min(1),
    text: z.string().optional(),
    imageUrl: z.url().optional().describe("Public https image URL"),
  }),
  z.object({
    type: z.literal("kpi"),
    variant: z.enum(["plain", "card", "filled"]).default("card"),
    label: z.string().min(1).max(40),
    value: z.string().min(1).max(12).describe("Formatted value, e.g. '$1.2M' or '34%'"),
    delta: z.string().max(16).optional().describe("e.g. '+12% vs LY'"),
    trend: z.enum(["up", "down", "flat"]).optional(),
  }),
  z.object({
    type: z.literal("chart"),
    variant: z.enum(["default", "minimal"]).default("default"),
    chartType: z.enum(["bar", "column", "line", "area", "pie", "doughnut"]),
    title: z.string().optional(),
    categories: z.array(z.string()).min(1).max(24),
    series: z
      .array(z.object({ name: z.string(), values: z.array(z.number()) }))
      .min(1)
      .max(5),
    showValues: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("table"),
    variant: z.enum(["striped", "plain", "header-filled"]).default("header-filled"),
    heading: z.string().optional(),
    columns: z.array(z.string()).min(1).max(8),
    rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).max(14),
  }),
  z.object({
    type: z.literal("quote"),
    variant: z.enum(["plain", "filled"]).default("plain"),
    text: z.string().min(1),
    author: z.string().optional(),
  }),
  z.object({
    type: z.literal("image"),
    variant: z.enum(["cover", "contain"]).default("cover"),
    url: z.url().describe("Public https image URL"),
    caption: z.string().optional(),
  }),
]);

export const pptxSectionSchema = z
  .object({
    x: cell.describe("Column where the section starts (1-9)"),
    y: cell.describe("Row where the section starts (1-9)"),
    w: cell.describe("Width in grid cells (1-9)"),
    h: cell.describe("Height in grid cells (1-9)"),
    content: pptxSectionContentSchema,
  })
  .superRefine((section, ctx) => {
    const issue = (message: string, path: PropertyKey[] = []) =>
      ctx.addIssue({ code: "custom", message, path });
    if (section.x + section.w - 1 > 9) issue(`x + w - 1 must be <= 9 (got ${section.x + section.w - 1})`, ["w"]);
    if (section.y + section.h - 1 > 9) issue(`y + h - 1 must be <= 9 (got ${section.y + section.h - 1})`, ["h"]);

    const box = { w: section.w, h: section.h };
    const headingSpace = lineHeight(fontSizes.heading) + 6;
    const content = section.content;
    const fit = (value: string | undefined, pt: number, path: string, reservedPt = 0) => {
      if (!value) return;
      const capacity = textCapacity(box, pt, reservedPt);
      if (value.length > capacity.chars) {
        issue(
          `Text too long for a ${section.w}x${section.h} section: ${value.length} chars, max ${capacity.chars}. Shorten it or enlarge the section.`,
          ["content", path],
        );
      }
    };

    switch (content.type) {
      case "title":
        fit(content.title, fontSizes.display, "title", content.subtitle ? lineHeight(fontSizes.heading) : 0);
        fit(content.subtitle, fontSizes.heading, "subtitle", lineHeight(fontSizes.display));
        break;
      case "text":
        fit(content.heading, fontSizes.heading, "heading");
        fit(content.body, fontSizes.body, "body", content.heading ? headingSpace : 0);
        break;
      case "bullets": {
        const capacity = textCapacity(box, fontSizes.body, content.heading ? headingSpace : 0);
        const lines = content.items.reduce(
          (total, item) => total + Math.ceil(item.length / Math.max(1, capacity.charsPerLine - 3)),
          0,
        );
        if (lines > capacity.lines) {
          issue(
            `Bullets need ${lines} lines but a ${section.w}x${section.h} section fits ${capacity.lines}. Remove or shorten items, or enlarge the section.`,
            ["content", "items"],
          );
        }
        break;
      }
      case "hero":
        if (section.w < 4 || section.h < 3) issue("hero needs at least w=4 and h=3");
        fit(content.title, fontSizes.title, "title");
        fit(content.text, fontSizes.body, "text", 2 * lineHeight(fontSizes.title));
        break;
      case "kpi":
        if (section.w < 2 || section.h < 2) issue("kpi needs at least w=2 and h=2");
        break;
      case "chart":
        if (section.w < 3 || section.h < 3) issue("chart needs at least w=3 and h=3");
        content.series.forEach((series, index) => {
          if (series.values.length !== content.categories.length) {
            issue(
              `series "${series.name}" has ${series.values.length} values but there are ${content.categories.length} categories`,
              ["content", "series", index, "values"],
            );
          }
        });
        if ((content.chartType === "pie" || content.chartType === "doughnut") && content.series.length > 1) {
          issue("pie and doughnut charts accept a single series", ["content", "series"]);
        }
        break;
      case "table": {
        const maxRows = Math.floor(section.h * 2) - (content.heading ? 2 : 1);
        const maxColumns = Math.max(1, Math.floor(section.w * 1.2));
        if (content.rows.length > maxRows) {
          issue(`A ${section.w}x${section.h} table fits ${maxRows} rows (got ${content.rows.length}).`, ["content", "rows"]);
        }
        if (content.columns.length > maxColumns) {
          issue(`A ${section.w}-wide table fits ${maxColumns} columns (got ${content.columns.length}).`, ["content", "columns"]);
        }
        content.rows.forEach((row, index) => {
          if (row.length !== content.columns.length) {
            issue(`row ${index} has ${row.length} cells, expected ${content.columns.length}`, ["content", "rows", index]);
          }
        });
        break;
      }
      case "quote":
        fit(content.text, fontSizes.heading, "text", content.author ? headingSpace : 0);
        break;
      case "image":
        break;
    }
  });

const overlaps = (a: z.infer<typeof pptxSectionSchema>, b: z.infer<typeof pptxSectionSchema>) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const pptxSlideSchema = z
  .object({
    name: z.string().describe("Short slide label, not rendered"),
    background: z.enum(["default", "surface", "primary"]).default("default"),
    notes: z.string().optional().describe("Speaker notes"),
    sections: z.array(pptxSectionSchema).min(1).max(9),
  })
  .superRefine((slide, ctx) => {
    slide.sections.forEach((section, index) => {
      slide.sections.slice(index + 1).forEach((other, offset) => {
        if (overlaps(section, other)) {
          ctx.addIssue({
            code: "custom",
            message: `sections ${index} and ${index + offset + 1} overlap on the 9x9 grid`,
            path: ["sections", index + offset + 1],
          });
        }
      });
    });
  });

export const pptxThemeSchema = z.object({
  preset: z.enum(Object.keys(themePresets) as [keyof typeof themePresets]).default("corporate"),
  primary: hexColor.optional().describe("Overrides the preset primary color"),
  accent: hexColor.optional().describe("Overrides the preset accent color"),
  font: z.enum(themeFonts).default("Calibri"),
});

export const pptxArtefactSchema = z.object({
  title: z.string().min(1).max(120),
  theme: pptxThemeSchema.default({ preset: "corporate", font: "Calibri" }),
  slides: z.array(pptxSlideSchema).max(40),
});

export type PptxArtefact = z.infer<typeof pptxArtefactSchema>;
export type PptxSlide = z.infer<typeof pptxSlideSchema>;
export type PptxSection = z.infer<typeof pptxSectionSchema>;
export type PptxSectionContent = z.infer<typeof pptxSectionContentSchema>;
