import type PptxGenJS from "pptxgenjs";
import { fontSizes, gridToInches, hex, palette, resolveTheme } from "@/lib/pptx";
import type { ThemeColors } from "@/lib/pptx";
import { formatValue, slugify } from "@/lib/utils";
import type { PptxArtefact, PptxSection } from "./pptx-artefact-schema";
import { slideBackground } from "./display-pptx-artefact";

type Box = { x: number; y: number; w: number; h: number };
type Context = { pptx: PptxGenJS; slide: PptxGenJS.Slide; colors: ThemeColors; font: string };

const PAD = 0.14;

async function imageData(url: string) {
  try {
    const blob = await fetch(url).then((response) => {
      if (!response.ok) throw new Error();
      return response.blob();
    });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function text(ctx: Context, value: PptxGenJS.TextProps[] | string, box: Box, options: PptxGenJS.TextPropsOptions = {}) {
  ctx.slide.addText(value, {
    ...box,
    fontFace: ctx.font,
    color: hex(ctx.colors.text),
    valign: "top",
    margin: PAD * 72,
    fit: "shrink",
    ...options,
  });
}

function rect(ctx: Context, box: Box, color: string) {
  ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, {
    ...box,
    fill: { color: hex(color) },
    line: { color: hex(color) },
    rectRadius: 0.08,
  });
}

function headingBlock(ctx: Context, heading: string | undefined, box: Box) {
  if (!heading) return box;
  const height = 0.45;
  text(ctx, heading, { ...box, h: height }, { fontSize: fontSizes.heading, bold: true, color: hex(ctx.colors.primary) });
  return { ...box, y: box.y + height, h: box.h - height };
}

async function addSection(ctx: Context, section: PptxSection) {
  const box = gridToInches(section);
  const content = section.content;
  const { colors } = ctx;

  switch (content.type) {
    case "title": {
      const banner = content.variant === "banner";
      if (banner) rect(ctx, box, colors.primary);
      const runs: PptxGenJS.TextProps[] = [
        { text: content.title, options: { fontSize: fontSizes.display, bold: true, breakLine: Boolean(content.subtitle) } },
      ];
      if (content.subtitle) runs.push({ text: content.subtitle, options: { fontSize: fontSizes.heading } });
      text(ctx, runs, box, {
        valign: "middle",
        align: content.variant === "center" ? "center" : "left",
        color: banner ? "FFFFFF" : hex(colors.text),
      });
      break;
    }
    case "text": {
      if (content.variant === "card") rect(ctx, box, colors.surface);
      if (content.variant === "accent") {
        ctx.slide.addShape(ctx.pptx.ShapeType.rect, { x: box.x, y: box.y, w: 0.06, h: box.h, fill: { color: hex(colors.accent) } });
      }
      const body = headingBlock(ctx, content.heading, box);
      text(ctx, content.body, body, { fontSize: fontSizes.body });
      break;
    }
    case "bullets": {
      const body = headingBlock(ctx, content.heading, box);
      text(
        ctx,
        content.items.map((item) => ({
          text: content.variant === "checks" ? `✓  ${item}` : item,
          options: {
            bullet:
              content.variant === "numbers"
                ? { type: "number" as const }
                : content.variant === "dots"
                  ? true
                  : false,
            breakLine: true,
            paraSpaceAfter: 4,
          },
        })),
        body,
        { fontSize: fontSizes.body },
      );
      break;
    }
    case "hero": {
      const data = content.imageUrl ? await imageData(content.imageUrl) : null;
      const background = content.variant === "image-background";
      const half = box.w / 2;
      const imageBox = background ? box : { ...box, w: half, x: content.variant === "image-right" ? box.x + half : box.x };
      const textBox = background ? box : { ...box, w: half, x: content.variant === "image-right" ? box.x : box.x + half };
      if (data) {
        ctx.slide.addImage({ data, ...imageBox, sizing: { type: "cover", w: imageBox.w, h: imageBox.h } });
      } else {
        rect(ctx, imageBox, colors.surface);
      }
      if (background) {
        ctx.slide.addShape(ctx.pptx.ShapeType.rect, { ...box, fill: { color: "000000", transparency: 55 } });
      }
      const runs: PptxGenJS.TextProps[] = [
        { text: content.title, options: { fontSize: fontSizes.title, bold: true, breakLine: Boolean(content.text) } },
      ];
      if (content.text) runs.push({ text: content.text, options: { fontSize: fontSizes.body } });
      text(ctx, runs, textBox, { valign: "middle", color: background ? "FFFFFF" : hex(colors.text) });
      break;
    }
    case "kpi": {
      const filled = content.variant === "filled";
      if (filled) rect(ctx, box, colors.primary);
      if (content.variant === "card") rect(ctx, box, colors.surface);
      const trendColor = content.trend === "up" ? "16A34A" : content.trend === "down" ? "DC2626" : hex(colors.muted);
      const runs: PptxGenJS.TextProps[] = [
        { text: content.label, options: { fontSize: fontSizes.small, breakLine: true, color: filled ? "FFFFFF" : hex(colors.muted) } },
        { text: content.value, options: { fontSize: fontSizes.kpi, bold: true, breakLine: Boolean(content.delta), color: filled ? "FFFFFF" : hex(colors.primary) } },
      ];
      if (content.delta) {
        const arrow = content.trend === "up" ? "▲ " : content.trend === "down" ? "▼ " : "";
        runs.push({ text: `${arrow}${content.delta}`, options: { fontSize: fontSizes.small, color: filled ? "FFFFFF" : trendColor } });
      }
      text(ctx, runs, box, { valign: "middle" });
      break;
    }
    case "chart": {
      const pie = content.chartType === "pie" || content.chartType === "doughnut";
      const types: Record<typeof content.chartType, PptxGenJS.CHART_NAME> = {
        bar: "bar",
        column: "bar",
        line: "line",
        area: "area",
        pie: "pie",
        doughnut: "doughnut",
      };
      const minimal = content.variant === "minimal";
      ctx.slide.addChart(
        types[content.chartType],
        content.series.map((series) => ({ name: series.name, labels: content.categories, values: series.values })),
        {
          ...box,
          barDir: content.chartType === "bar" ? "bar" : "col",
          chartColors: palette(colors, pie ? content.categories.length : content.series.length).map(hex),
          showTitle: Boolean(content.title),
          title: content.title,
          titleFontSize: 12,
          titleColor: hex(colors.text),
          showLegend: pie ? !minimal : !minimal && content.series.length > 1,
          legendPos: "b",
          legendFontSize: 9,
          legendColor: hex(colors.muted),
          showValue: content.showValues,
          dataLabelFontSize: 9,
          dataLabelFormatCode: "#,##0",
          catAxisLabelColor: hex(colors.muted),
          valAxisLabelColor: hex(colors.muted),
          catAxisLabelFontSize: 9,
          valAxisLabelFontSize: 9,
          valGridLine: minimal ? { style: "none" } : { color: "E2E8F0", size: 0.5 },
          holeSize: content.chartType === "doughnut" ? 55 : undefined,
          lineDataSymbol: "none",
          fontFace: ctx.font,
        },
      );
      break;
    }
    case "table": {
      const body = headingBlock(ctx, content.heading, box);
      const filled = content.variant === "header-filled";
      const header = content.columns.map((column) => ({
        text: column,
        options: { bold: true, color: filled ? "FFFFFF" : hex(colors.primary), fill: filled ? { color: hex(colors.primary) } : undefined },
      }));
      const rows = content.rows.map((row, rowIndex) =>
        row.map((value) => ({
          text: formatValue(value, "number"),
          options: {
            align: typeof value === "number" ? ("right" as const) : ("left" as const),
            fill: content.variant !== "plain" && rowIndex % 2 === 1 ? { color: hex(colors.surface) } : undefined,
          },
        })),
      );
      ctx.slide.addTable([header, ...rows], {
        x: body.x + PAD,
        y: body.y + PAD / 2,
        w: body.w - 2 * PAD,
        fontSize: fontSizes.small,
        fontFace: ctx.font,
        color: hex(colors.text),
        border: { type: "solid", pt: 0.5, color: "E2E8F0" },
        autoPage: false,
      });
      break;
    }
    case "quote": {
      if (content.variant === "filled") rect(ctx, box, colors.surface);
      ctx.slide.addShape(ctx.pptx.ShapeType.rect, { x: box.x, y: box.y, w: 0.06, h: box.h, fill: { color: hex(colors.accent) } });
      const runs: PptxGenJS.TextProps[] = [
        { text: `“${content.text}”`, options: { fontSize: fontSizes.heading, italic: true, breakLine: Boolean(content.author) } },
      ];
      if (content.author) runs.push({ text: `— ${content.author}`, options: { fontSize: fontSizes.small, color: hex(colors.muted) } });
      text(ctx, runs, box, { valign: "middle" });
      break;
    }
    case "image": {
      const data = await imageData(content.url);
      const captionHeight = content.caption ? 0.35 : 0;
      const imageBox = { ...box, h: box.h - captionHeight };
      if (data) {
        ctx.slide.addImage({ data, ...imageBox, sizing: { type: content.variant, w: imageBox.w, h: imageBox.h } });
      } else {
        rect(ctx, imageBox, colors.surface);
      }
      if (content.caption) {
        text(ctx, content.caption, { ...box, y: box.y + imageBox.h, h: captionHeight }, { fontSize: fontSizes.small, align: "center", color: hex(colors.muted) });
      }
      break;
    }
  }
}

export async function downloadPptxArtefact(value: PptxArtefact) {
  const { default: Pptx } = await import("pptxgenjs");
  const pptx = new Pptx();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = value.title;
  const theme = resolveTheme(value.theme);

  for (const slideValue of value.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: hex(slideBackground(slideValue, theme.colors)) };
    const colors: ThemeColors =
      slideValue.background === "primary"
        ? { ...theme.colors, text: "#FFFFFF", muted: "#E2E8F0", surface: theme.colors.primary }
        : theme.colors;
    if (slideValue.notes) slide.addNotes(slideValue.notes);
    for (const section of slideValue.sections) {
      await addSection({ pptx, slide, colors, font: theme.font }, section);
    }
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return new File([blob], `${slugify(value.title)}.pptx`, {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
