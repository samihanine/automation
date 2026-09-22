import type { CSSProperties } from "react";
import { SimpleChart } from "@/components/simple-chart";
import { fontSizes, gridToPercent, palette, ptToCqw, resolveTheme } from "@/lib/pptx";
import type { ThemeColors } from "@/lib/pptx";
import { formatValue } from "@/lib/utils";
import type { ArtefactRenderProps } from "../artefact-schema";
import type { PptxArtefact, PptxSection, PptxSlide } from "./pptx-artefact-schema";

type Theme = ReturnType<typeof resolveTheme>;

export function DisplayPptxArtefact({ value }: ArtefactRenderProps<PptxArtefact>) {
  const theme = resolveTheme(value.theme);
  if (value.slides.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No slides yet.</p>;
  }
  return (
    <div className="h-full space-y-6 overflow-auto bg-muted/40 p-6">
      {value.slides.map((slide, index) => (
        <figure key={index} className="mx-auto max-w-4xl">
          <figcaption className="mb-1.5 text-xs text-muted-foreground">
            {index + 1}. {slide.name}
          </figcaption>
          <Slide slide={slide} theme={theme} />
          {slide.notes && (
            <p className="mt-1.5 text-xs whitespace-pre-wrap text-muted-foreground italic">{slide.notes}</p>
          )}
        </figure>
      ))}
    </div>
  );
}

export function slideBackground(slide: PptxSlide, colors: ThemeColors) {
  return slide.background === "primary"
    ? colors.primary
    : slide.background === "surface"
      ? colors.surface
      : colors.background;
}

function Slide({ slide, theme }: { slide: PptxSlide; theme: Theme }) {
  const background = slideBackground(slide, theme.colors);
  const colors: ThemeColors =
    slide.background === "primary"
      ? { ...theme.colors, text: "#FFFFFF", muted: "#E2E8F0", surface: "rgba(255,255,255,0.12)" }
      : theme.colors;
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-sm shadow-md ring-1 ring-black/5"
      style={{ background, color: colors.text, fontFamily: `"${theme.font}", ${theme.font === "Georgia" ? "serif" : "Carlito, Arial, sans-serif"}`, containerType: "inline-size" }}
    >
      {slide.sections.map((section, index) => (
        <div key={index} className="absolute flex overflow-hidden" style={gridToPercent(section)}>
          <Section section={section} colors={colors} />
        </div>
      ))}
    </div>
  );
}

const size = (pt: number): CSSProperties => ({ fontSize: ptToCqw(pt), lineHeight: 1.3 });
const pad = { padding: ptToCqw(10) };

function Section({ section, colors }: { section: PptxSection; colors: ThemeColors }) {
  const content = section.content;
  switch (content.type) {
    case "title": {
      const banner = content.variant === "banner";
      return (
        <div
          className="flex w-full flex-col justify-center gap-[1cqw]"
          style={{
            ...pad,
            textAlign: content.variant === "center" ? "center" : "left",
            background: banner ? colors.primary : undefined,
            color: banner ? "#FFFFFF" : colors.text,
            borderRadius: banner ? ptToCqw(6) : undefined,
          }}
        >
          <div className="font-bold" style={size(fontSizes.display)}>{content.title}</div>
          {content.subtitle && (
            <div style={{ ...size(fontSizes.heading), opacity: 0.8 }}>{content.subtitle}</div>
          )}
        </div>
      );
    }
    case "text":
      return (
        <div
          className="flex w-full flex-col gap-[0.6cqw]"
          style={{
            ...pad,
            background: content.variant === "card" ? colors.surface : undefined,
            borderRadius: content.variant === "card" ? ptToCqw(6) : undefined,
            borderLeft: content.variant === "accent" ? `${ptToCqw(4)} solid ${colors.accent}` : undefined,
          }}
        >
          {content.heading && (
            <div className="font-semibold" style={{ ...size(fontSizes.heading), color: colors.primary }}>
              {content.heading}
            </div>
          )}
          <div className="whitespace-pre-wrap" style={size(fontSizes.body)}>{content.body}</div>
        </div>
      );
    case "bullets":
      return (
        <div className="flex w-full flex-col gap-[0.6cqw]" style={pad}>
          {content.heading && (
            <div className="font-semibold" style={{ ...size(fontSizes.heading), color: colors.primary }}>
              {content.heading}
            </div>
          )}
          <ul className="space-y-[0.4cqw]" style={size(fontSizes.body)}>
            {content.items.map((item, index) => (
              <li key={index} className="flex gap-[0.8cqw]">
                <span className="shrink-0 font-semibold" style={{ color: colors.accent }}>
                  {content.variant === "numbers" ? `${index + 1}.` : content.variant === "checks" ? "✓" : "•"}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "hero": {
      const image = content.imageUrl ? (
        <img src={content.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full" style={{ background: colors.surface }} />
      );
      const text = (
        <div className="flex flex-col justify-center gap-[1cqw]" style={pad}>
          <div className="font-bold" style={size(fontSizes.title)}>{content.title}</div>
          {content.text && <div style={size(fontSizes.body)}>{content.text}</div>}
        </div>
      );
      if (content.variant === "image-background") {
        return (
          <div className="relative w-full" style={{ borderRadius: ptToCqw(6), overflow: "hidden" }}>
            <div className="absolute inset-0">{image}</div>
            <div className="absolute inset-0 flex" style={{ background: "rgba(0,0,0,0.45)", color: "#FFFFFF" }}>
              {text}
            </div>
          </div>
        );
      }
      return (
        <div className={`grid w-full grid-cols-2 ${content.variant === "image-right" ? "[&>*:first-child]:order-2" : ""}`}>
          <div className="overflow-hidden" style={{ borderRadius: ptToCqw(6) }}>{image}</div>
          {text}
        </div>
      );
    }
    case "kpi": {
      const filled = content.variant === "filled";
      const trendColor = content.trend === "up" ? "#16A34A" : content.trend === "down" ? "#DC2626" : colors.muted;
      return (
        <div
          className="flex w-full flex-col justify-center gap-[0.4cqw]"
          style={{
            ...pad,
            background: filled ? colors.primary : content.variant === "card" ? colors.surface : undefined,
            color: filled ? "#FFFFFF" : colors.text,
            borderRadius: ptToCqw(6),
          }}
        >
          <div style={{ ...size(fontSizes.small), opacity: 0.75 }}>{content.label}</div>
          <div className="font-bold" style={{ ...size(fontSizes.kpi), color: filled ? "#FFFFFF" : colors.primary }}>
            {content.value}
          </div>
          {content.delta && (
            <div style={{ ...size(fontSizes.small), color: filled ? "#FFFFFF" : trendColor }}>
              {content.trend === "up" ? "▲ " : content.trend === "down" ? "▼ " : ""}
              {content.delta}
            </div>
          )}
        </div>
      );
    }
    case "chart": {
      const data = content.categories.map((category, index) => ({
        category,
        ...Object.fromEntries(content.series.map((series) => [series.name, series.values[index] ?? null])),
      }));
      return (
        <div className="flex w-full flex-col" style={pad}>
          {content.title && (
            <div className="mb-[0.5cqw] font-semibold" style={size(fontSizes.small + 2)}>{content.title}</div>
          )}
          <div className="min-h-0 flex-1">
            <SimpleChart
              type={content.chartType}
              data={data}
              category="category"
              series={content.series.map((series) => series.name)}
              colors={palette(colors, Math.max(content.series.length, content.categories.length))}
              showGrid={content.variant !== "minimal"}
              showLegend={content.variant !== "minimal" && content.series.length > 1}
              showValues={content.showValues}
              textColor={colors.muted}
              fontSize={10}
            />
          </div>
        </div>
      );
    }
    case "table":
      return (
        <div className="flex w-full flex-col gap-[0.6cqw]" style={pad}>
          {content.heading && (
            <div className="font-semibold" style={{ ...size(fontSizes.heading), color: colors.primary }}>
              {content.heading}
            </div>
          )}
          <table className="w-full border-collapse" style={size(fontSizes.small)}>
            <thead>
              <tr
                style={{
                  background: content.variant === "header-filled" ? colors.primary : undefined,
                  color: content.variant === "header-filled" ? "#FFFFFF" : colors.primary,
                  borderBottom: `1px solid ${colors.muted}`,
                }}
              >
                {content.columns.map((column) => (
                  <th key={column} className="px-[0.6cqw] py-[0.35cqw] text-left font-semibold">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={{
                    background: content.variant !== "plain" && rowIndex % 2 === 1 ? colors.surface : undefined,
                  }}
                >
                  {row.map((value, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-[0.6cqw] py-[0.35cqw]"
                      style={{ textAlign: typeof value === "number" ? "right" : "left" }}
                    >
                      {formatValue(value, "number")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "quote":
      return (
        <div
          className="flex w-full flex-col justify-center gap-[0.8cqw]"
          style={{
            ...pad,
            background: content.variant === "filled" ? colors.surface : undefined,
            borderLeft: `${ptToCqw(4)} solid ${colors.accent}`,
            borderRadius: content.variant === "filled" ? ptToCqw(6) : undefined,
          }}
        >
          <div className="italic" style={size(fontSizes.heading)}>“{content.text}”</div>
          {content.author && <div style={{ ...size(fontSizes.small), color: colors.muted }}>— {content.author}</div>}
        </div>
      );
    case "image":
      return (
        <figure className="flex w-full flex-col">
          <img
            src={content.url}
            alt={content.caption ?? ""}
            className="min-h-0 w-full flex-1"
            style={{ objectFit: content.variant, borderRadius: ptToCqw(6) }}
          />
          {content.caption && (
            <figcaption className="mt-[0.4cqw] text-center" style={{ ...size(fontSizes.small), color: colors.muted }}>
              {content.caption}
            </figcaption>
          )}
        </figure>
      );
  }
}
