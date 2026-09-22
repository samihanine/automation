import ReactMarkdown from "react-markdown";
import { DataTable } from "@/components/data-table";
import { SimpleChart } from "@/components/simple-chart";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useDaxQuery } from "@/features/workspaces/use-dax-query";
import type { Workspace } from "@/features/workspaces/workspace-schema";
import type { PbiFilter } from "@/lib/pbi-client";
import { cn, formatValue } from "@/lib/utils";
import type { ArtefactRenderProps } from "../artefact-schema";
import type { PbiBuilderArtefact, PbiBuilderPage, PbiBuilderVisual } from "./pbi-builder-artefact-schema";
import { fieldLabel, visualQuery } from "./visual-query";

const COLORS = ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#D64550"];

function filterLabel(filter: PbiFilter) {
  const target = `${filter.target.table}[${filter.target.column}]`;
  return filter.filterType === "basic"
    ? `${target} ${filter.operator === "In" ? "=" : "≠"} ${filter.values.join(", ")}`
    : `${target} ${filter.conditions.map((condition) => `${condition.operator} ${condition.value}`).join(` ${filter.logicalOperator} `)}`;
}

export function DisplayPbiBuilderArtefact({ value, workspace, onChange }: ArtefactRenderProps<PbiBuilderArtefact>) {
  const page = value.pages.find((item) => item.name === value.activePage) ?? value.pages[0];
  const filters = [...value.filters, ...page.filters];

  return (
    <div className="flex h-full flex-col bg-[#EAEAEA]">
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b bg-background px-4 py-2">
          {filters.map((filter, index) => (
            <Badge key={index} variant="outline">{filterLabel(filter)}</Badge>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto grid aspect-video w-full max-w-6xl grid-cols-12 grid-rows-9 gap-2">
          {page.visuals.map((visual) => (
            <div
              key={visual.name}
              className="flex min-w-0 flex-col overflow-hidden rounded-sm bg-white p-3 shadow-sm"
              style={{
                gridColumn: `${visual.layout.x} / span ${visual.layout.w}`,
                gridRow: `${visual.layout.y} / span ${visual.layout.h}`,
              }}
            >
              {visual.title && <div className="mb-1 truncate text-sm font-medium">{visual.title}</div>}
              <div className="min-h-0 flex-1">
                <Visual report={value} page={page} visual={visual} workspace={workspace} />
              </div>
            </div>
          ))}
        </div>
        {page.visuals.length === 0 && (
          <p className="-mt-[30%] text-center text-sm text-muted-foreground">This page has no visuals yet.</p>
        )}
      </div>
      <div className="flex shrink-0 gap-px overflow-x-auto border-t bg-background">
        {value.pages.map((item) => (
          <button
            key={item.name}
            onClick={() => onChange({ ...value, activePage: item.name })}
            className={cn(
              "border-t-2 border-transparent px-4 py-2 text-xs whitespace-nowrap text-muted-foreground hover:text-foreground",
              item.name === page.name && "border-[#F2C811] font-medium text-foreground",
            )}
          >
            {item.displayName}
          </button>
        ))}
      </div>
    </div>
  );
}

function Visual({
  report,
  page,
  visual,
  workspace,
}: {
  report: PbiBuilderArtefact;
  page: PbiBuilderPage;
  visual: PbiBuilderVisual;
  workspace: Workspace;
}) {
  const query = useDaxQuery(workspace, visualQuery(report, page, visual));

  if (visual.type === "text") {
    return (
      <div className="markdown h-full overflow-auto text-sm">
        <ReactMarkdown>{visual.text ?? ""}</ReactMarkdown>
      </div>
    );
  }
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

  const category = visual.category ? fieldLabel(visual.category) : "";
  const metrics = visual.values.map(fieldLabel).filter((key) => key !== category);

  if (visual.type === "card") {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-3xl font-semibold tabular-nums">{formatValue(result.rows[0][metrics[0]], visual.format)}</div>
        <div className="mt-1 text-xs text-muted-foreground">{metrics[0]}</div>
      </div>
    );
  }

  if (visual.type === "table") {
    const columns = result.columns.map((column) => ({
      key: column.name,
      header: column.name,
      format: column.role === "metric" ? visual.format : "text",
    }));
    return <DataTable className="h-full text-xs" columns={columns} rows={result.rows} />;
  }

  return (
    <SimpleChart
      type={visual.type}
      data={result.rows}
      category={category}
      series={metrics}
      colors={COLORS}
      textColor="#605E5C"
      fontSize={11}
    />
  );
}
