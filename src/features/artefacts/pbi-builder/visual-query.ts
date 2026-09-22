import { filterToDax } from "@/lib/pbi-client";
import type {
  PbiBuilderArtefact,
  PbiBuilderPage,
  PbiBuilderVisual,
  PbiField,
} from "./pbi-builder-artefact-schema";

const quoteTable = (table: string) => `'${table.replace(/'/g, "''")}'`;
const columnRef = (table: string, column: string) => `${quoteTable(table)}[${column}]`;

const daxAggregations = {
  Sum: "SUM",
  Average: "AVERAGE",
  Count: "COUNT",
  DistinctCount: "DISTINCTCOUNT",
  Min: "MIN",
  Max: "MAX",
} as const;

export function fieldLabel(field: PbiField) {
  if (field.kind === "measure") return field.measure;
  return field.aggregation ? `${field.aggregation} of ${field.column}` : field.column;
}

function fieldExpression(field: PbiField) {
  if (field.kind === "measure") return `[${field.measure}]`;
  return `${daxAggregations[field.aggregation ?? "Sum"]}(${columnRef(field.table, field.column)})`;
}

const isGroupBy = (field: PbiField): field is Extract<PbiField, { kind: "column" }> =>
  field.kind === "column" && !field.aggregation;

export function visualQuery(report: PbiBuilderArtefact, page: PbiBuilderPage, visual: PbiBuilderVisual) {
  if (visual.type === "text") return undefined;

  const groupBy = [...(visual.category ? [visual.category] : []), ...visual.values].filter(isGroupBy);
  const values = visual.values.filter((field) => !isGroupBy(field));
  const filters = [...report.filters, ...page.filters, ...visual.filters].map(filterToDax);

  const args = [
    ...groupBy.map((field) => columnRef(field.table, field.column)),
    ...filters,
    ...values.map((field) => `"${fieldLabel(field).replace(/"/g, '""')}", ${fieldExpression(field)}`),
  ];

  const define = report.measures.length
    ? `DEFINE\n${report.measures
        .map((measure) => `MEASURE ${quoteTable(measure.table)}[${measure.name}] = ${measure.expression}`)
        .join("\n")}\n`
    : "";

  const sortField = visual.sort?.by === "category" ? visual.category : values[0];
  const orderBy =
    visual.sort && sortField
      ? `\nORDER BY ${sortField.kind === "column" && !sortField.aggregation ? columnRef(sortField.table, sortField.column) : `[${fieldLabel(sortField)}]`} ${visual.sort.direction.toUpperCase()}`
      : "";

  return `${define}EVALUATE\nSUMMARIZECOLUMNS(${args.join(", ")})${orderBy}`;
}
