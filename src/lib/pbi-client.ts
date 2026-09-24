import { z } from "zod";
import type { Report, models, service } from "powerbi-client";
import { getPbiToken } from "./pbi-auth";

export const pbiTargetSchema = z.object({
  table: z.string().describe("Table name, e.g. Store"),
  column: z.string().describe("Column name, e.g. Territory"),
});

const advancedOperatorSchema = z.enum([
  "Is",
  "IsNot",
  "LessThan",
  "LessThanOrEqual",
  "GreaterThan",
  "GreaterThanOrEqual",
  "Contains",
  "DoesNotContain",
  "StartsWith",
]);

type AdvancedOperator = z.infer<typeof advancedOperatorSchema>;

const filterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const pbiFilterSchema = z.discriminatedUnion("filterType", [
  z.object({
    filterType: z.literal("basic"),
    target: pbiTargetSchema,
    operator: z.enum(["In", "NotIn"]),
    values: z.array(filterValueSchema).min(1),
  }),
  z.object({
    filterType: z.literal("advanced"),
    target: pbiTargetSchema,
    logicalOperator: z.enum(["And", "Or"]).default("And"),
    conditions: z
      .array(
        z.object({
          operator: advancedOperatorSchema,
          value: filterValueSchema,
        }),
      )
      .min(1)
      .max(2),
  }),
]);

export type PbiFilter = z.infer<typeof pbiFilterSchema>;

export type ReportPageInfo = {
  name: string;
  displayName: string;
  visuals: Array<{ name: string; title: string; type: string }>;
};

export function toPowerBiFilter(filter: PbiFilter): models.IFilter {
  if (filter.filterType === "basic") {
    return {
      $schema: "http://powerbi.com/product/schema#basic",
      target: filter.target,
      operator: filter.operator,
      values: filter.values,
      filterType: 1,
    } as models.IBasicFilter;
  }
  return {
    $schema: "http://powerbi.com/product/schema#advanced",
    target: filter.target,
    logicalOperator: filter.logicalOperator,
    conditions: filter.conditions,
    filterType: 0,
  } as models.IAdvancedFilter;
}

const advancedOperators = new Set<string>(advancedOperatorSchema.options);

export function fromPowerBiFilter(filter: models.IFilter): PbiFilter | null {
  const target = filter.target as { table?: string; column?: string };
  if (!target.table || !target.column) return null;
  const columnTarget = { table: target.table, column: target.column };
  if (filter.filterType === 1) {
    const basic = filter as models.IBasicFilter;
    if (basic.operator === "All" || basic.values.length === 0) return null;
    return { filterType: "basic", target: columnTarget, operator: basic.operator, values: basic.values };
  }
  if (filter.filterType === 0) {
    const advanced = filter as models.IAdvancedFilter;
    const conditions = advanced.conditions ?? [];
    if (conditions.length === 0 || conditions.some((condition) => !advancedOperators.has(condition.operator))) return null;
    return {
      filterType: "advanced",
      target: columnTarget,
      logicalOperator: advanced.logicalOperator === "Or" ? "Or" : "And",
      conditions: conditions.map((condition) => ({
        operator: condition.operator as AdvancedOperator,
        value: condition.value as string | number | boolean,
      })),
    };
  }
  return null;
}

export function describeFilter(filter: PbiFilter) {
  const target = `${filter.target.table}[${filter.target.column}]`;
  return filter.filterType === "basic"
    ? `${target} ${filter.operator === "In" ? "=" : "≠"} ${filter.values.join(", ")}`
    : `${target} ${filter.conditions.map((condition) => `${condition.operator} ${condition.value}`).join(` ${filter.logicalOperator} `)}`;
}

const embeddedReports = new Map<string, Report>();

export function registerEmbeddedReport(reportId: string, report: Report | null) {
  if (report) embeddedReports.set(reportId, report);
  else embeddedReports.delete(reportId);
}

export const getEmbeddedReport = (reportId: string) => embeddedReports.get(reportId);

const daxLiteral = (value: string | number | boolean) =>
  typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : String(value);

const daxColumn = ({ table, column }: PbiFilter["target"]) =>
  `'${table.replace(/'/g, "''")}'[${column}]`;

export function filterToDax(filter: PbiFilter) {
  const column = daxColumn(filter.target);
  if (filter.filterType === "basic") {
    const values = `{${filter.values.map(daxLiteral).join(", ")}}`;
    return filter.operator === "In"
      ? `TREATAS(${values}, ${column})`
      : `FILTER(ALL(${column}), NOT ${column} IN ${values})`;
  }
  const conditions = filter.conditions.map(({ operator, value }) => {
    const literal = daxLiteral(value);
    switch (operator) {
      case "Is":
        return `${column} = ${literal}`;
      case "IsNot":
        return `${column} <> ${literal}`;
      case "LessThan":
        return `${column} < ${literal}`;
      case "LessThanOrEqual":
        return `${column} <= ${literal}`;
      case "GreaterThan":
        return `${column} > ${literal}`;
      case "GreaterThanOrEqual":
        return `${column} >= ${literal}`;
      case "Contains":
        return `CONTAINSSTRING(${column}, ${literal})`;
      case "DoesNotContain":
        return `NOT CONTAINSSTRING(${column}, ${literal})`;
      case "StartsWith":
        return `LEFT(${column}, ${String(value).length}) = ${literal}`;
    }
  });
  const joiner = filter.logicalOperator === "Or" ? " || " : " && ";
  return `FILTER(ALL(${column}), ${conditions.join(joiner)})`;
}

export function applyFiltersToDax(dax: string, filters: PbiFilter[]) {
  const query = dax.trim();
  if (filters.length === 0) return query;
  const matches = [...query.matchAll(/\bEVALUATE\b/gi)];
  const last = matches.at(-1);
  if (last?.index === undefined) {
    return `EVALUATE CALCULATETABLE(${query}, ${filters.map(filterToDax).join(", ")})`;
  }
  const head = query.slice(0, last.index);
  const tail = query.slice(last.index + last[0].length);
  const orderBy = tail.search(/\bORDER\s+BY\b/i);
  const expression = orderBy === -1 ? tail : tail.slice(0, orderBy);
  const suffix = orderBy === -1 ? "" : tail.slice(orderBy);
  return `${head}EVALUATE CALCULATETABLE(${expression.trim()}, ${filters.map(filterToDax).join(", ")})\n${suffix}`.trim();
}

let powerBi: Promise<{ service: service.Service }> | null = null;

function loadPowerBi() {
  powerBi ??= import("powerbi-client").then((pbi) => ({
    service: new pbi.service.Service(
      pbi.factories.hpmFactory,
      pbi.factories.wpmpFactory,
      pbi.factories.routerFactory,
    ),
  }));
  return powerBi;
}

export async function embedReport(
  container: HTMLElement,
  report: { reportId: string; embedUrl: string },
  options: { pageName?: string; filterPaneVisible?: boolean } = {},
) {
  const [{ service }, accessToken] = await Promise.all([
    loadPowerBi(),
    getPbiToken(),
  ]);
  service.reset(container);
  const embedded = service.embed(container, {
    type: "report",
    id: report.reportId,
    embedUrl: report.embedUrl,
    accessToken,
    tokenType: 0,
    pageName: options.pageName,
    settings: {
      panes: {
        filters: { visible: options.filterPaneVisible ?? false },
        pageNavigation: { visible: true },
      },
    },
  }) as Report;
  await new Promise<void>((resolve, reject) => {
    embedded.on("loaded", () => resolve());
    embedded.on("error", (event) =>
      reject(new Error(JSON.stringify(event.detail))),
    );
  });
  return embedded;
}

export async function resetEmbed(container: HTMLElement) {
  const { service } = await loadPowerBi();
  service.reset(container);
}

export async function describeReport(report: {
  reportId: string;
  embedUrl: string;
}): Promise<ReportPageInfo[]> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1280px;height:720px;";
  document.body.appendChild(container);
  try {
    const embedded = await embedReport(container, report);
    const pages = await embedded.getPages();
    return await Promise.all(
      pages
        .filter((page) => page.visibility !== 1)
        .map(async (page) => ({
          name: page.name,
          displayName: page.displayName,
          visuals: (await page.getVisuals()).map((visual) => ({
            name: visual.name,
            title: visual.title || "",
            type: visual.type,
          })),
        })),
    );
  } finally {
    await resetEmbed(container);
    container.remove();
  }
}
