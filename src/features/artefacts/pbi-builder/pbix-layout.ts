import type { PbiFilter } from "@/lib/pbi-client";
import type { PbiBuilderArtefact, PbiBuilderVisual, PbiField } from "./pbi-builder-artefact-schema";

const PAGE = { width: 1280, height: 720, columns: 12, rows: 9 };

const visualTypes: Record<Exclude<PbiBuilderVisual["type"], "text">, { type: string; category?: string; values: string }> = {
  card: { type: "card", values: "Values" },
  bar: { type: "clusteredBarChart", category: "Category", values: "Y" },
  column: { type: "clusteredColumnChart", category: "Category", values: "Y" },
  line: { type: "lineChart", category: "Category", values: "Y" },
  area: { type: "areaChart", category: "Category", values: "Y" },
  pie: { type: "pieChart", category: "Category", values: "Y" },
  doughnut: { type: "donutChart", category: "Category", values: "Y" },
  table: { type: "tableEx", values: "Values" },
};

const aggregationCodes = { Sum: 0, Average: 1, DistinctCount: 2, Min: 3, Max: 4, Count: 5 } as const;

function literal(value: string | number | boolean) {
  if (typeof value === "string") return { Literal: { Value: `'${value.replace(/'/g, "''")}'` } };
  if (typeof value === "boolean") return { Literal: { Value: String(value) } };
  return { Literal: { Value: Number.isInteger(value) ? `${value}L` : `${value}D` } };
}

class QueryBuilder {
  private sources = new Map<string, { Name: string; Entity: string; Schema?: string; Type: 0 }>();

  constructor(private extensionMeasures: Set<string>) {}

  source(table: string, extension = false) {
    const key = `${extension ? "ext:" : ""}${table}`;
    let source = this.sources.get(key);
    if (!source) {
      source = {
        Name: `s${this.sources.size}`,
        Entity: table,
        ...(extension ? { Schema: "extension" } : {}),
        Type: 0,
      };
      this.sources.set(key, source);
    }
    return { SourceRef: { Source: source.Name } };
  }

  column(table: string, column: string) {
    return { Column: { Expression: this.source(table), Property: column } };
  }

  field(field: PbiField) {
    if (field.kind === "measure") {
      const extension = this.extensionMeasures.has(`${field.table}[${field.measure}]`);
      return { Measure: { Expression: this.source(field.table, extension), Property: field.measure } };
    }
    const column = this.column(field.table, field.column);
    return field.aggregation
      ? { Aggregation: { Expression: column, Function: aggregationCodes[field.aggregation] } }
      : column;
  }

  from() {
    return [...this.sources.values()];
  }
}

export function queryRef(field: PbiField) {
  if (field.kind === "measure") return `${field.table}.${field.measure}`;
  const ref = `${field.table}.${field.column}`;
  return field.aggregation ? `${field.aggregation}(${ref})` : ref;
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

function filtersJson(filters: PbiFilter[], extensionMeasures: Set<string>) {
  return JSON.stringify(
    filters.map((filter, index) => {
      const query = new QueryBuilder(extensionMeasures);
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

function visualConfig(visual: PbiBuilderVisual, extensionMeasures: Set<string>) {
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

  const mapping = visualTypes[visual.type];
  const query = new QueryBuilder(extensionMeasures);
  const fields = [...(visual.category ? [visual.category] : []), ...visual.values];
  const select = fields.map((field) => ({ ...query.field(field), Name: queryRef(field) }));
  const sortField = visual.sort?.by === "category" ? visual.category : visual.values[0];

  return {
    position,
    config: {
      name: visual.name,
      layouts: [{ id: 0, position }],
      singleVisual: {
        visualType: mapping.type,
        projections: {
          ...(mapping.category && visual.category ? { [mapping.category]: [{ queryRef: queryRef(visual.category), active: true }] } : {}),
          [mapping.values]: visual.values.map((field) => ({ queryRef: queryRef(field) })),
        },
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
  const extensionMeasures = new Set(report.measures.map((measure) => `${measure.table}[${measure.name}]`));
  const tables = [...new Set(report.measures.map((measure) => measure.table))];
  const modelExtensions = report.measures.length
    ? [
        {
          name: "extension",
          entities: tables.map((table) => ({
            name: table,
            extends: table,
            measures: report.measures
              .filter((measure) => measure.table === table)
              .map((measure) => ({
                name: measure.name,
                dataType: 3,
                expression: measure.expression,
                errorMessage: null,
                hidden: false,
                formulaOverride: null,
                formatInformation: { formatString: "G", format: "General", thousandSeparator: false, currencyFormat: null, dateTimeCustomFormat: null },
              })),
          })),
        },
      ]
    : [];

  return {
    id: 0,
    filters: filtersJson(report.filters, extensionMeasures),
    sections: report.pages.map((page, ordinal) => ({
      id: ordinal,
      name: page.name,
      displayName: page.displayName,
      filters: filtersJson(page.filters, extensionMeasures),
      ordinal,
      visualContainers: page.visuals.map((visual) => {
        const { position, config } = visualConfig(visual, extensionMeasures);
        return { ...position, config: JSON.stringify(config), filters: filtersJson(visual.filters, extensionMeasures) };
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
      modelExtensions,
      defaultDrillFilterOtherVisuals: true,
      settings: { useNewFilterPaneExperience: true, allowChangeFilterTypes: true, useStylableVisualContainerHeader: true },
    }),
    layoutOptimization: 0,
  };
}
