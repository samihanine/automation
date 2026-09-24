import { filterToDax } from "@/lib/pbi-client";
import type { PbiBuilderArtefact, PbiBuilderPage, PbiBuilderVisual, PbiField, PbiGroupField } from "./pbi-builder-artefact-schema";

const columnRef = (field: PbiGroupField) => `'${field.table.replace(/'/g, "''")}'[${field.column}]`;

const daxAggregations = { Sum: "SUM", Average: "AVERAGE", Count: "COUNT", DistinctCount: "DISTINCTCOUNT", Min: "MIN", Max: "MAX" } as const;

export function fieldLabel(field: PbiField | PbiGroupField) {
  if (field.kind === "measure") return field.measure;
  return "aggregation" in field && field.aggregation ? `${field.aggregation} of ${field.column}` : field.column;
}

const isGroupBy = (field: PbiField): field is PbiField & PbiGroupField => field.kind === "column" && !field.aggregation;

export function groupFields(visual: PbiBuilderVisual): PbiGroupField[] {
  return [
    ...(visual.category ? [visual.category] : []),
    ...visual.rows,
    ...visual.columns,
    ...visual.values.filter(isGroupBy),
  ];
}

export const valueFields = (visual: PbiBuilderVisual) => visual.values.filter((field) => !isGroupBy(field));

function valueExpression(field: PbiField) {
  if (field.kind === "measure") return `[${field.measure}]`;
  return `${daxAggregations[field.aggregation ?? "Sum"]}(${columnRef(field)})`;
}

export function visualQuery(report: PbiBuilderArtefact, page: PbiBuilderPage, visual: PbiBuilderVisual) {
  if (visual.type === "text") return undefined;
  const values = valueFields(visual);
  const args = [
    ...groupFields(visual).map(columnRef),
    ...[...report.filters, ...page.filters, ...visual.filters].map(filterToDax),
    ...values.map((field) => `"${fieldLabel(field).replace(/"/g, '""')}", ${valueExpression(field)}`),
  ];
  const sortField = visual.sort?.by === "category" ? visual.category : values[0];
  const orderBy =
    visual.sort && sortField
      ? `\nORDER BY ${sortField.kind === "column" && !("aggregation" in sortField && sortField.aggregation) ? columnRef(sortField) : `[${fieldLabel(sortField)}]`} ${visual.sort.direction.toUpperCase()}`
      : "";
  return `EVALUATE\nSUMMARIZECOLUMNS(${args.join(", ")})${orderBy}`;
}
