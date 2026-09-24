import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";
import { RichMarkdown } from "@/components/rich-markdown";
import { SimpleChart } from "@/components/simple-chart";
import { Spinner } from "@/components/ui/spinner";
import type { Dataset } from "@/features/datasets/dataset-schema";
import { useDaxQuery } from "@/features/datasets/use-dax-query";
import type { DataRow } from "@/lib/dax";
import { describeFilter } from "@/lib/pbi-client";
import { cn, formatValue } from "@/lib/utils";
import type { ArtefactRenderProps } from "../artefact-schema";
import type { PbiBuilderArtefact, PbiBuilderPage, PbiBuilderVisual, PbiField, PbiGroupField } from "./pbi-builder-artefact-schema";
import { fieldLabel, valueFields, visualQuery } from "./visual-query";

const COLORS = ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#D64550"];

export function DisplayPbiBuilderArtefact({ value, context, onChange }: ArtefactRenderProps<PbiBuilderArtefact>) {
  const page = value.pages.find((item) => item.name === value.activePage) ?? value.pages[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-px overflow-x-auto border-b">
        {value.pages.map((item) => (
          <button
            key={item.name}
            onClick={() => onChange({ ...value, activePage: item.name })}
            className={cn(
              "border-b-2 border-transparent px-4 py-2 text-xs whitespace-nowrap text-muted-foreground hover:text-foreground",
              item.name === page.name && "border-[#F2C811] font-medium text-foreground",
            )}
          >
            {item.displayName}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-3 overflow-auto bg-muted/40 p-4">
        {[...value.filters, ...page.filters].length > 0 && (
          <Section title="Report & page filters">
            <List items={[...value.filters, ...page.filters].map(describeFilter)} />
          </Section>
        )}
        {page.visuals.map((visual) => (
          <div key={visual.name} className="grid overflow-hidden rounded-md border bg-background md:grid-cols-[1fr_16rem]">
            <div className="flex min-w-0 flex-col p-4">
              <div className="mb-2 truncate text-sm font-medium">{visual.title || visual.name}</div>
              <div className="h-64">
                <Visual report={value} page={page} visual={visual} dataset={context.dataset} />
              </div>
            </div>
            <VisualConfig visual={visual} />
          </div>
        ))}
        {page.visuals.length === 0 && <p className="py-20 text-center text-sm text-muted-foreground">This page has no visuals yet.</p>}
      </div>
    </div>
  );
}

function VisualConfig({ visual }: { visual: PbiBuilderVisual }) {
  const fields = (items: Array<PbiField | PbiGroupField>) =>
    items.map((field) => `${field.table}[${field.kind === "measure" ? field.measure : field.column}]${"aggregation" in field && field.aggregation ? ` · ${field.aggregation}` : ""}`);
  const rows: Array<[string, string[]]> = [
    ["Type", [visual.type]],
    ["Category", fields(visual.category ? [visual.category] : [])],
    ["Rows", fields(visual.rows)],
    ["Columns", fields(visual.columns)],
    ["Values", fields(visual.values)],
    ["Sort", visual.sort ? [`${visual.sort.by} ${visual.sort.direction}`] : []],
    ["Filters", visual.filters.map(describeFilter)],
    ["Layout", [`x ${visual.layout.x} · y ${visual.layout.y} · ${visual.layout.w}×${visual.layout.h}`]],
  ];
  return (
    <dl className="space-y-2 border-t bg-muted/30 p-4 text-xs md:border-t-0 md:border-l">
      {rows
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => (
          <div key={label}>
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <List items={items} />
          </div>
        ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-3 text-xs">
      <div className="mb-1 font-medium text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <dd>
      {items.map((item) => (
        <div key={item} className="break-words">
          {item}
        </div>
      ))}
    </dd>
  );
}

function pivot(visual: PbiBuilderVisual, rows: DataRow[]) {
  const rowKeys = visual.rows.map(fieldLabel);
  const columnKeys = visual.columns.map(fieldLabel);
  const values = valueFields(visual).map(fieldLabel);
  const headers = [...new Set(rows.map((row) => columnKeys.map((key) => row[key]).join(" · ")))];
  const cells = headers.flatMap((header) =>
    values.map((label) => ({ key: `${header}|${label}`, header: [header, values.length > 1 || !header ? label : ""].filter(Boolean).join(" · "), label })),
  );
  const grouped = new Map<string, DataRow>();
  for (const row of rows) {
    const id = rowKeys.map((key) => row[key]).join("|");
    const target = grouped.get(id) ?? Object.fromEntries(rowKeys.map((key) => [key, row[key]]));
    const header = columnKeys.map((key) => row[key]).join(" · ");
    for (const label of values) target[`${header}|${label}`] = row[label];
    grouped.set(id, target);
  }
  return {
    columns: [
      ...rowKeys.map((key) => ({ key, header: key })),
      ...cells.map((cell) => ({ key: cell.key, header: cell.header, format: visual.format })),
    ],
    rows: [...grouped.values()],
  };
}

function Visual({ report, page, visual, dataset }: { report: PbiBuilderArtefact; page: PbiBuilderPage; visual: PbiBuilderVisual; dataset: Dataset }) {
  const query = useDaxQuery(dataset, visualQuery(report, page, visual));

  if (visual.type === "text") return <RichMarkdown className="h-full overflow-auto text-sm">{visual.text ?? ""}</RichMarkdown>;
  if (query.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (query.error) return <p className="text-xs text-destructive">{query.error.message}</p>;
  const result = query.data;
  if (!result || result.rowCount === 0) {
    return <p className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</p>;
  }

  const metrics = valueFields(visual).map(fieldLabel);

  if (visual.type === "card") {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-3xl font-semibold tabular-nums">{formatValue(result.rows[0][metrics[0]], visual.format)}</div>
        <div className="mt-1 text-xs text-muted-foreground">{metrics[0]}</div>
      </div>
    );
  }
  if (visual.type === "matrix") {
    const table = pivot(visual, result.rows);
    return <DataTable className="h-full text-xs" columns={table.columns} rows={table.rows} />;
  }
  if (visual.type === "table") {
    const columns = result.columns.map((column) => ({
      key: column.name,
      header: column.name,
      format: metrics.includes(column.name) ? visual.format : "text",
    }));
    return <DataTable className="h-full text-xs" columns={columns} rows={result.rows} />;
  }
  return (
    <SimpleChart
      type={visual.type}
      data={result.rows}
      category={visual.category ? fieldLabel(visual.category) : result.columns[0].name}
      series={metrics}
      colors={COLORS}
      textColor="#605E5C"
      fontSize={11}
    />
  );
}
