import { PieChart, Pie, ResponsiveContainer, Tooltip } from "recharts";
import type { Column, Row } from "@/schema/tableSchema";
import { richPlain } from "@/lib/rich-text";
import { OptionTag, RowTags } from "./table-ui";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

type Props = {
  view: "kanban" | "dashboard";
  columns: Column[];
  rows: Row[];
  groupColumnId: string;
  onGroupColumn(id: string): void;
  selection: Set<string>;
  onSelect(id: string, checked: boolean): void;
  onOpen(id: string): void;
  onMove(id: string, columnId: string, value: string): void;
  disabled: boolean;
};

function groups(column: Column, rows: Row[]) {
  const choices = [
    ...new Set(
      (column.options?.choices ?? []).map((v) => v.trim()).filter(Boolean),
    ),
  ];
  const buckets = new Map<string, Row[]>(
    [...choices, ""].map((value) => [value, []]),
  );
  for (const row of rows) {
    const value = String(row[column.id] ?? "");
    if (!buckets.has(value)) buckets.set(value, []);
    buckets.get(value)!.push(row);
  }
  return [...buckets].map(([value, items]) => ({
    value,
    label: value
      ? choices.includes(value)
        ? value
        : `${value} (unavailable)`
      : "Unassigned",
    rows: items,
    count: items.length,
    allowed: !value || choices.includes(value),
    fill: value ? (column.options?.colors?.[value] ?? "#b49a62") : "#c7c7c7",
  }));
}

export default function TableViews({
  view,
  columns,
  rows,
  groupColumnId,
  onGroupColumn,
  selection,
  onSelect,
  onOpen,
  onMove,
  disabled,
}: Props) {
  const options = columns.filter((column) => column.type === "select");
  const grouping =
    options.find((column) => column.id === groupColumnId) ?? options[0];
  if (!grouping)
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-neutral-400">
        Add an Options column to use this view.
      </div>
    );
  if (view === "dashboard")
    return (
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <p className="mb-4 text-xs text-neutral-500">
          {rows.length} filtered rows
        </p>
        <div className="grid gap-4 xl:grid-cols-2">
          {options.map((column) => {
            const data = groups(column, rows);
            return (
              <section
                key={column.id}
                className="min-w-0 rounded-lg border border-border bg-white p-4"
              >
                <h2 className="text-sm font-medium">{column.name}</h2>
                {column.description && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {column.description}
                  </p>
                )}
                <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {data.map((group) => (
                    <div
                      key={group.value}
                      className="min-w-0 rounded-md border border-border p-3"
                    >
                      {group.value ? (
                        <OptionTag
                          column={column}
                          value={group.value}
                          label={group.label}
                        />
                      ) : (
                        <span className="text-xs text-neutral-500">
                          Unassigned
                        </span>
                      )}
                      <div className="mt-2 text-2xl font-medium tabular-nums">
                        {group.count}
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        {rows.length
                          ? Math.round((group.count / rows.length) * 100)
                          : 0}
                        % of filtered rows
                      </span>
                    </div>
                  ))}
                </div>
                {rows.length ? (
                  <div
                    className="h-56 min-w-0"
                    role="img"
                    aria-label={`${column.name}: distribution of ${rows.length} filtered rows. Counts are listed above.`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart accessibilityLayer>
                        <Pie
                          data={data.filter((group) => group.count)}
                          dataKey="count"
                          nameKey="label"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          isAnimationActive={false}
                        />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs text-neutral-400">
                    No rows match these filters.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  const lanes = groups(grouping, rows);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs text-neutral-500">Group by</span>
        <Select
          value={grouping.id}
          disabled={disabled}
          onValueChange={(value) => {
            if (value) onGroupColumn(value);
          }}
        >
          <SelectTrigger
            className="h-8 min-w-40 rounded-md text-xs"
            aria-label="Kanban grouping column"
          >
            <SelectValue>{grouping.name}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {options.map((column) => (
              <SelectItem key={column.id} value={column.id}>
                {column.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-[11px] text-neutral-400">
          Drag cards or use Move to. Save to update Excel.
        </span>
      </div>
      <div className="flex min-h-0 flex-1 items-start gap-3 overflow-auto p-3">
        {lanes.map((lane) => (
          <section
            key={lane.value}
            className="flex max-h-full flex-1 shrink-0 flex-col rounded-lg border border-border bg-neutral-50/60"
            aria-label={lane.label}
            onDragOver={(e) => {
              if (
                !disabled &&
                lane.allowed &&
                e.dataTransfer.types.includes("application/x-atelier-row")
              ) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!disabled && lane.allowed)
                onMove(
                  e.dataTransfer.getData("application/x-atelier-row"),
                  grouping.id,
                  lane.value,
                );
            }}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border p-3">
              {lane.value ? (
                <OptionTag
                  column={grouping}
                  value={lane.value}
                  label={lane.label}
                />
              ) : (
                <span className="text-xs text-neutral-500">Unassigned</span>
              )}
              <span className="text-xs text-neutral-400">{lane.count}</span>
            </header>
            <div className="min-h-16 overflow-y-auto p-2">
              {lane.rows.map((row) => (
                <article
                  key={row.id}
                  draggable={!disabled}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-atelier-row", row.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="mb-2 rounded-md border border-border bg-white p-3 last:mb-0"
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      className="mt-0.5"
                      disabled={disabled}
                      checked={selection.has(row.id)}
                      onCheckedChange={(checked) => onSelect(row.id, checked)}
                      aria-label="Select record"
                    />
                    <button
                      disabled={disabled}
                      className="min-w-0 flex-1 text-left text-[13px] font-medium wrap-anywhere"
                      onClick={() => onOpen(row.id)}
                    >
                      {columns[0]?.type === "richText"
                        ? richPlain(row[columns[0].id]) || "Untitled record"
                        : String(row[columns[0]?.id] ?? "Untitled record") ||
                          "Untitled record"}
                    </button>
                  </div>
                  <RowTags columns={columns} row={row} />
                  <Select
                    value={lane.value}
                    disabled={disabled}
                    onValueChange={(value) =>
                      onMove(row.id, grouping.id, value ?? "")
                    }
                  >
                    <SelectTrigger
                      aria-label="Move record to"
                      className="mt-3 h-7 w-full rounded text-[11px] text-neutral-500"
                    >
                      <SelectValue>Move to…</SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {lanes.map((target) => (
                        <SelectItem
                          key={target.value}
                          value={target.value}
                          disabled={!target.allowed}
                        >
                          {target.value ? (
                            <OptionTag
                              column={grouping}
                              value={target.value}
                              label={target.label}
                            />
                          ) : (
                            "Unassigned"
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </article>
              ))}
              {!lane.count && (
                <p className="px-1 py-4 text-center text-xs text-neutral-400">
                  No records
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
