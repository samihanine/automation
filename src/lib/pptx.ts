export const SLIDE = { width: 13.333, height: 7.5, margin: 0.4, gap: 0.12, grid: 9 };

const cellWidth = (SLIDE.width - 2 * SLIDE.margin - (SLIDE.grid - 1) * SLIDE.gap) / SLIDE.grid;
const cellHeight = (SLIDE.height - 2 * SLIDE.margin - (SLIDE.grid - 1) * SLIDE.gap) / SLIDE.grid;

export type GridBox = { x: number; y: number; w: number; h: number };

export function gridToInches({ x, y, w, h }: GridBox) {
  return {
    x: SLIDE.margin + (x - 1) * (cellWidth + SLIDE.gap),
    y: SLIDE.margin + (y - 1) * (cellHeight + SLIDE.gap),
    w: w * cellWidth + (w - 1) * SLIDE.gap,
    h: h * cellHeight + (h - 1) * SLIDE.gap,
  };
}

export function gridToPercent(box: GridBox) {
  const inches = gridToInches(box);
  return {
    left: `${(inches.x / SLIDE.width) * 100}%`,
    top: `${(inches.y / SLIDE.height) * 100}%`,
    width: `${(inches.w / SLIDE.width) * 100}%`,
    height: `${(inches.h / SLIDE.height) * 100}%`,
  };
}

export const ptToCqw = (pt: number) => `${((pt / 72 / SLIDE.width) * 100).toFixed(3)}cqw`;

export const fontSizes = { display: 32, title: 26, heading: 18, body: 14, small: 11, kpi: 34 };

export const lineHeight = (pt: number) => pt * 1.35;

export function textCapacity(box: Pick<GridBox, "w" | "h">, pt: number, reservedPt = 0) {
  const { w, h } = gridToInches({ x: 1, y: 1, ...box });
  const charsPerLine = Math.floor((w * 72 - 16) / (pt * 0.52));
  const lines = Math.floor((h * 72 - 12 - reservedPt) / lineHeight(pt));
  return { charsPerLine, lines: Math.max(0, lines), chars: Math.max(0, charsPerLine * lines) };
}

export const themePresets = {
  corporate: { primary: "#1F4E79", accent: "#E8A33D", background: "#FFFFFF", surface: "#F1F5F9", text: "#1E293B", muted: "#64748B" },
  midnight: { primary: "#6366F1", accent: "#22D3EE", background: "#0F172A", surface: "#1E293B", text: "#F1F5F9", muted: "#94A3B8" },
  minimal: { primary: "#111827", accent: "#EF4444", background: "#FFFFFF", surface: "#F5F5F5", text: "#111827", muted: "#6B7280" },
  warm: { primary: "#B45309", accent: "#0F766E", background: "#FFFBF5", surface: "#FDEBD3", text: "#3F2A14", muted: "#8A6F52" },
  forest: { primary: "#166534", accent: "#CA8A04", background: "#F7FBF7", surface: "#E3F1E5", text: "#14301D", muted: "#5B7463" },
} as const;

export type ThemePreset = keyof typeof themePresets;
export type ThemeColors = Record<keyof (typeof themePresets)["corporate"], string>;

export const themeFonts = ["Arial", "Calibri", "Georgia", "Segoe UI", "Verdana"] as const;

export function resolveTheme(theme: {
  preset: ThemePreset;
  primary?: string;
  accent?: string;
  font: string;
}) {
  const colors: ThemeColors = { ...themePresets[theme.preset] };
  if (theme.primary) colors.primary = theme.primary;
  if (theme.accent) colors.accent = theme.accent;
  return { colors, font: theme.font };
}

export const hex = (color: string) => color.replace("#", "").toUpperCase();

export function palette(colors: ThemeColors, count: number) {
  const base = [colors.primary, colors.accent, colors.muted, "#0EA5E9", "#A855F7", "#F43F5E"];
  return Array.from({ length: count }, (_, index) => base[index % base.length]);
}
