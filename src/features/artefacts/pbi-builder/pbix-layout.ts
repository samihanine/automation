import type { PbiFilter } from "@/lib/pbi-client";
import type { PbiBuilderArtefact, PbiBuilderVisual, PbiField, PbiGroupField } from "./pbi-builder-artefact-schema";

const PAGE = { width: 1280, height: 720, columns: 12, rows: 9 };

const visualTypes: Record<Exclude<PbiBuilderVisual["type"], "text">, string> = {
  card: "card",
  bar: "clusteredBarChart",
  column: "clusteredColumnChart",
  line: "lineChart",
  area: "areaChart",
  pie: "pieChart",
  doughnut: "donutChart",
  table: "tableEx",
  matrix: "pivotTable",
};

const aggregationCodes = { Sum: 0, Average: 1, DistinctCount: 2, Min: 3, Max: 4, Count: 5 } as const;

function literal(value: string | number | boolean) {
  if (typeof value === "string") return { Literal: { Value: `'${value.replace(/'/g, "''")}'` } };
  if (typeof value === "boolean") return { Literal: { Value: String(value) } };
  return { Literal: { Value: Number.isInteger(value) ? `${value}L` : `${value}D` } };
}

class QueryBuilder {
  private sources = new Map<string, { Name: string; Entity: string; Type: 0 }>();

  source(table: string) {
    let source = this.sources.get(table);
    if (!source) {
      source = { Name: `s${this.sources.size}`, Entity: table, Type: 0 };
      this.sources.set(table, source);
    }
    return { SourceRef: { Source: source.Name } };
  }

  column(table: string, column: string) {
    return { Column: { Expression: this.source(table), Property: column } };
  }

  field(field: PbiField | PbiGroupField) {
    if (field.kind === "measure") {
      return { Measure: { Expression: this.source(field.table), Property: field.measure } };
    }
    const column = this.column(field.table, field.column);
    return "aggregation" in field && field.aggregation
      ? { Aggregation: { Expression: column, Function: aggregationCodes[field.aggregation] } }
      : column;
  }

  from() {
    return [...this.sources.values()];
  }
}

export function queryRef(field: PbiField | PbiGroupField) {
  if (field.kind === "measure") return `${field.table}.${field.measure}`;
  const ref = `${field.table}.${field.column}`;
  return "aggregation" in field && field.aggregation ? `${field.aggregation}(${ref})` : ref;
}

function condition(query: QueryBuilder, filter: PbiFilter) {
  const column = query.column(filter.target.table, filter.target.column);
  if (filter.filterType === "basic") {
    const inCondition = { In: { Expressions: [column], Values: filter.values.map((value) => [literal(value)]) } };
    return filter.operator === "In" ? inCondition : { Not: { Expression: inCondition } };
  }
  const comparisons = { Is: 0, GreaterThan: 1, GreaterThanOrEqual: 2, LessThan: 3, LessThanOrEqual: 4 } as const;
  const parts = filter.conditions.map(({ operator, value }): object => {
    switch (operator) {
      case "IsNot":
        return { Not: { Expression: { Comparison: { ComparisonKind: 0, Left: column, Right: literal(value) } } } };
      case "Contains":
        return { Contains: { Left: column, Right: literal(value) } };
      case "DoesNotContain":
        return { Not: { Expression: { Contains: { Left: column, Right: literal(value) } } } };
      case "StartsWith":
        return { StartsWith: { Left: column, Right: literal(value) } };
      default:
        return { Comparison: { ComparisonKind: comparisons[operator], Left: column, Right: literal(value) } };
    }
  });
  return parts.reduce((left, right): object =>
    filter.logicalOperator === "Or" ? { Or: { Left: left, Right: right } } : { And: { Left: left, Right: right } },
  );
}

function filtersJson(filters: PbiFilter[]) {
  return JSON.stringify(
    filters.map((filter, index) => {
      const query = new QueryBuilder();
      const where = condition(query, filter);
      return {
        name: `Filter${index}`,
        expression: { Column: { Expression: { SourceRef: { Entity: filter.target.table } }, Property: filter.target.column } },
        filter: { Version: 2, From: query.from(), Where: [{ Condition: where }] },
        type: filter.filterType === "basic" ? "Categorical" : "Advanced",
        howCreated: 1,
      };
    }),
  );
}

const titleObject = (title: string) =>
  title ? { title: [{ properties: { show: { expr: { Literal: { Value: "true" } } }, text: { expr: { Literal: { Value: `'${title.replace(/'/g, "''")}'` } } } } }] } : {};

function projections(visual: PbiBuilderVisual) {
  const refs = (fields: Array<PbiField | PbiGroupField>) => fields.map((field) => ({ queryRef: queryRef(field), active: true }));
  switch (visual.type) {
    case "card":
    case "table":
      return { Values: refs(visual.values) };
    case "matrix":
      return { Rows: refs(visual.rows), Columns: refs(visual.columns), Values: refs(visual.values) };
    default:
      return { Category: refs(visual.category ? [visual.category] : []), Y: refs(visual.values) };
  }
}

function visualConfig(visual: PbiBuilderVisual) {
  const position = {
    x: ((visual.layout.x - 1) * PAGE.width) / PAGE.columns,
    y: ((visual.layout.y - 1) * PAGE.height) / PAGE.rows,
    z: 0,
    width: (visual.layout.w * PAGE.width) / PAGE.columns,
    height: (visual.layout.h * PAGE.height) / PAGE.rows,
  };

  if (visual.type === "text") {
    return {
      position,
      config: {
        name: visual.name,
        layouts: [{ id: 0, position }],
        singleVisual: {
          visualType: "textbox",
          drillFilterOtherVisuals: true,
          objects: {
            general: [{ properties: { paragraphs: (visual.text ?? "").split("\n").map((line) => ({ textRuns: [{ value: line }] })) } }],
          },
        },
      },
    };
  }

  const query = new QueryBuilder();
  const fields = [...(visual.category ? [visual.category] : []), ...visual.rows, ...visual.columns, ...visual.values];
  const select = fields.map((field) => ({ ...query.field(field), Name: queryRef(field) }));
  const sortField = visual.sort?.by === "category" ? visual.category : visual.values[0];

  return {
    position,
    config: {
      name: visual.name,
      layouts: [{ id: 0, position }],
      singleVisual: {
        visualType: visualTypes[visual.type],
        projections: projections(visual),
        prototypeQuery: {
          Version: 2,
          From: query.from(),
          Select: select,
          ...(visual.sort && sortField
            ? { OrderBy: [{ Direction: visual.sort.direction === "asc" ? 1 : 2, Expression: query.field(sortField) }] }
            : {}),
        },
        drillFilterOtherVisuals: true,
        vcObjects: titleObject(visual.title),
      },
    },
  };
}

export function buildPbixLayout(report: PbiBuilderArtefact) {
  return {
    id: 0,
    filters: filtersJson(report.filters),
    sections: report.pages.map((page, ordinal) => ({
      id: ordinal,
      name: page.name,
      displayName: page.displayName,
      filters: filtersJson(page.filters),
      ordinal,
      visualContainers: page.visuals.map((visual) => {
        const { position, config } = visualConfig(visual);
        return { ...position, config: JSON.stringify(config), filters: filtersJson(visual.filters) };
      }),
      config: "{}",
      displayOption: 1,
      width: PAGE.width,
      height: PAGE.height,
    })),
    config: JSON.stringify({
      version: "5.43",
      themeCollection: {},
      activeSectionIndex: Math.max(0, report.pages.findIndex((page) => page.name === report.activePage)),
      defaultDrillFilterOtherVisuals: true,
      settings: { useNewFilterPaneExperience: true, allowChangeFilterTypes: true, useStylableVisualContainerHeader: true },
    }),
    layoutOptimization: 0,
  };
}
