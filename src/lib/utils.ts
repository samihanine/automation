export { cn } from "cn";

export function optionBackground(
  column: import("@/schema/tableSchema").Column,
  value: unknown,
) {
  const color = column.options?.colors?.[String(value)] ?? "#b49a62";
  if (column.type !== "select" || !value || !/^#[0-9a-f]{6}$/i.test(color))
    return undefined;
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(parseInt(color.slice(i, i + 2), 16) * 0.18 + 255 * 0.82)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
