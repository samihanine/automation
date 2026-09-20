import {
  Field,
  OptionTag,
  RowTags,
  TableOptions,
  fieldClassName,
  fileButtonClassName,
  dialogClassName,
  emptyClassName,
  compactButtonsClassName,
} from "./table-ui";
import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useBlocker } from "@tanstack/react-router";
import {
  Plus,
  Table2,
  PanelLeft,
  Copy,
  Download,
  Trash2,
  Save,
  Settings2,
  FolderOpen,
  RefreshCw,
  Upload,
  Type,
  Hash,
  Calendar,
  Link2,
  CircleCheck,
  ListFilter,
  Columns3,
  ChartPie,
  Pencil,
} from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import { richPlain } from "@/lib/rich-text";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useAction, useWorkspace } from "./table-context";
import { ColumnSettings } from "./column-settings";
import { structureSchema, typeNames } from "@/schema/tableSchema";
import type { ImportSheet } from "@/lib/xlsx";
import { chooseDirectory, workspaceDirectory } from "@/lib/workspace";
import { download } from "@/lib/local-storage";
import type { ActiveTable, Adapter, Column, Row } from "@/schema/tableSchema";
const TableViews = lazy(() => import("./table-views"));

const icons = {
  text: Type,
  richText: Type,
  number: Hash,
  date: Calendar,
  boolean: CircleCheck,
  select: ListFilter,
  relation: Link2,
};

export function TablesWorkspace() {
  const {
    folder,
    setFolder,
    schema,
    tables,
    ready,
    saveWorkspace,
    saveSchema,
  } = useWorkspace();
  const action = useAction();
  const [tableId, setTableId] = useState("");
  const [dirty, setDirty] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [sheets, setSheets] = useState<ImportSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [template, setTemplate] = useState("");
  const table = tables.find((t) => t.id === tableId) ?? tables[0];
  useBlocker({
    shouldBlockFn: () =>
      dirty && !window.confirm("Leave without saving your changes?"),
    enableBeforeUnload: dirty,
  });
  function change(job: () => void) {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDirty(false);
    job();
  }
  function create() {
    setName("New table");
    setSheets([]);
    setSheetIndex(0);
    setTemplate("");
    setCreating(true);
  }
  const schemaActions = (
    <>
      <Button
        variant="ghost"
        onClick={() =>
          download(JSON.stringify(schema, null, 2), "workspace-schema.json")
        }
      >
        <Download />
        Download schema
      </Button>
      <label className={fileButtonClassName}>
        <Upload size={15} />
        Import schema
        <input
          type="file"
          accept=".json"
          disabled={dirty || action.busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file)
              void action.run(async () => {
                const imported = structureSchema.parse(
                  JSON.parse(await file.text()),
                );
                const ids = new Set(imported["dataset-table"].map((t) => t.id));
                const next = structureSchema.parse({
                  "dataset-table": [
                    ...schema["dataset-table"].filter((t) => !ids.has(t.id)),
                    ...imported["dataset-table"],
                  ],
                  "dataset-column": [
                    ...schema["dataset-column"].filter(
                      (c) => !ids.has(c.tableKey),
                    ),
                    ...imported["dataset-column"],
                  ],
                  "dataset-relation": [
                    ...schema["dataset-relation"].filter(
                      (r) => !ids.has(r.sourceTableKey),
                    ),
                    ...imported["dataset-relation"],
                  ],
                });
                if (
                  tables.some((t) => ids.has(t.schemaId)) &&
                  !window.confirm(
                    "Apply this schema to existing tables? Data is not written until you save each table.",
                  )
                )
                  return;
                saveSchema(next);
                action.notify(
                  "Schema imported. Existing values are matched by column ID. Imported schemas are available when creating a table.",
                );
              });
          }}
        />
      </label>
    </>
  );
  return (
    <>
      <header
        className={`flex h-11 min-h-11 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-border px-3 max-[760px]:gap-1.5 max-[760px]:px-2 ${compactButtonsClassName} [&>div:last-child]:flex-nowrap [&>div:last-child]:gap-0.5`}
      >
        <div className="flex shrink-0 items-center gap-[7px] text-[13px] font-medium [&>svg]:text-neutral-500 [&>svg]:stroke-[1.7] [&>span]:max-w-40 [&>span]:truncate max-[760px]:[&>span]:max-w-[85px]">
          <FolderOpen size={18} />
          <span title={folder?.name}>{folder?.name ?? "Workspace folder"}</span>
        </div>
        {folder && (
          <div
            className="flex h-11 min-w-[100px] flex-1 items-stretch gap-0.5 overflow-x-auto max-[760px]:min-w-[120px] max-[760px]:shrink-0 [&>[data-slot=button]]:mr-1 [&>[data-slot=button]]:self-center [&>[data-slot=button]]:text-neutral-400"
            role="tablist"
            aria-label="Workspace tables"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              title="Add table"
              onClick={create}
            >
              <Plus />
            </Button>
            {tables.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === table?.id}
                className="flex items-center gap-1.5 border-b-2 border-transparent px-2.5 text-xs whitespace-nowrap text-neutral-500 aria-selected:border-[#ac904e] aria-selected:text-[#3c3932] [&>svg]:text-neutral-400 [&>svg]:stroke-[1.6]"
                onClick={() => {
                  if (t.id !== table?.id) change(() => setTableId(t.id));
                }}
              >
                <Table2 size={15} />
                {t.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex shrink-0 flex-wrap items-center gap-[7px]">
          {folder && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Grant folder access"
              aria-label="Grant folder access"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await workspaceDirectory(folder.id, true);
                  action.notify(
                    "Folder access granted. Reload your table if needed.",
                  );
                })
              }
            >
              <RefreshCw />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title={folder ? "Change folder" : "Choose folder"}
            aria-label={folder ? "Change folder" : "Choose folder"}
            disabled={!ready || action.busy}
            onClick={() =>
              change(() => {
                void action.run(async () => {
                  setFolder(await chooseDirectory());
                  setTableId("");
                });
              })
            }
          >
            <FolderOpen />
          </Button>
        </div>
      </header>
      {action.feedback}
      {!folder ? (
        <div className={emptyClassName}>
          <FolderOpen size={32} />
          <h2>Choose your workspace folder</h2>
          <p>Your tables will be saved as Excel files in this folder.</p>
          <Button
            disabled={!ready || action.busy}
            onClick={() =>
              void action.run(async () => setFolder(await chooseDirectory()))
            }
          >
            Choose folder
          </Button>
        </div>
      ) : (
        <>
          {table ? (
            <TableEditor
              key={`${folder.id}:${table.id}`}
              table={table}
              folderId={folder.id}
              onDirty={setDirty}
              schemaActions={schemaActions}
            />
          ) : (
            <div className={emptyClassName}>
              <TableOptions>{schemaActions}</TableOptions>
              <Table2 />
              <h2>Create your first table</h2>
              <p>Upload a CSV or Excel file, or start with an empty table.</p>
              <Button onClick={create}>
                <Plus />
                Add table
              </Button>
            </div>
          )}
        </>
      )}
      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!action.busy) setCreating(open);
        }}
      >
        <DialogContent className={dialogClassName}>
          <DialogTitle>New table</DialogTitle>
          <DialogDescription>
            Upload a file to create its table and schema automatically.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                if (!folder || !name.trim())
                  throw new Error("Choose a folder and enter a table name.");
                if (
                  tables.some(
                    (t) => t.name.toLowerCase() === name.trim().toLowerCase(),
                  )
                )
                  throw new Error("A table already uses this name.");
                const { xlsxAdapter, inferColumns, mapImport, fileName } =
                  await import("@/lib/xlsx");
                const dir = await workspaceDirectory(folder.id);
                let exists = false;
                try {
                  await dir.getFileHandle(fileName(name.trim()));
                  exists = true;
                } catch (e) {
                  if (!(
                    e instanceof DOMException && e.name === "NotFoundError"
                  ))
                    throw e;
                }
                if (exists)
                  throw new Error(
                    "A file already uses this name. Rename the new table to keep the existing file.",
                  );
                const id = crypto.randomUUID();
                const model = {
                  id,
                  name: name.trim(),
                  description: "",
                  folderPath: "",
                };
                const sheet = sheets[sheetIndex];
                if (sheet && !sheet.headers.length)
                  throw new Error("The selected worksheet has no columns.");
                const columns: Column[] = sheet
                  ? inferColumns(sheet, id)
                  : template
                    ? schema["dataset-column"]
                        .filter((c) => c.tableKey === template)
                        .map((c) => ({
                          ...c,
                          id: crypto.randomUUID(),
                          tableKey: id,
                          options:
                            c.options?.sourceTableKey === template
                              ? { ...c.options, sourceTableKey: id }
                              : c.options,
                        }))
                    : [
                        {
                          id: crypto.randomUUID(),
                          tableKey: id,
                          name: "Name",
                          type: "text",
                        },
                      ];
                const rows = sheet
                  ? mapImport(
                      sheet,
                      Object.fromEntries(
                        columns.map((c, i) => [c.id, String(i)]),
                      ),
                      columns,
                    )
                  : [];
                const nextTable = { id, schemaId: id, name: name.trim() };
                await xlsxAdapter(folder.id).write(
                  model,
                  columns,
                  { resource: name.trim() },
                  rows,
                );
                saveWorkspace(
                  {
                    "dataset-table": [...schema["dataset-table"], model],
                    "dataset-column": [...schema["dataset-column"], ...columns],
                    "dataset-relation": [
                      ...schema["dataset-relation"],
                      ...columns
                        .filter((c) => c.options?.sourceTableKey)
                        .map((c) => ({
                          id: c.id,
                          columnKey: c.id,
                          sourceTableKey: id,
                          targetTableKey: c.options!.sourceTableKey!,
                        })),
                    ],
                  },
                  [...tables, nextTable],
                );
                change(() => setTableId(id));
                setCreating(false);
              });
            }}
          >
            <Field label="Table name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <label className={fileButtonClassName}>
              <Upload size={16} />
              Upload CSV or Excel
              <input
                type="file"
                accept=".csv,.xlsx"
                disabled={action.busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file)
                    void action.run(async () => {
                      const next = await (
                        await import("@/lib/xlsx")
                      ).readImport(file);
                      if (!next.length) throw new Error("No worksheets found.");
                      setSheets(next);
                      setSheetIndex(0);
                      setName(file.name.replace(/\.(csv|xlsx)$/i, ""));
                    });
                }}
              />
            </label>
            {sheets.length ? (
              <Field label="Worksheet">
                <select
                  value={sheetIndex}
                  onChange={(e) => setSheetIndex(Number(e.target.value))}
                >
                  {sheets.map((s, i) => (
                    <option key={i} value={i}>
                      {s.name} · {s.rows.length} rows
                    </option>
                  ))}
                </select>
                <small>
                  {sheets[sheetIndex].headers.length} columns will be created
                  automatically.
                </small>
              </Field>
            ) : (
              <Field label="Optional schema">
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <option value="">Start empty</option>
                  {schema["dataset-table"].map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {action.feedback}
            <Button type="submit" disabled={action.busy || !name.trim()}>
              Create table
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

type Choice = { value: string; label: string };
type Filters = Record<string, string | string[]>;
function TableEditor({
  table,
  folderId,
  onDirty,
  schemaActions,
}: {
  table: ActiveTable;
  folderId: string;
  onDirty(value: boolean): void;
  schemaActions: ReactNode;
}) {
  const { schema, tables, saveSchema, saveWorkspace } = useWorkspace();
  const { busy, run, notify, feedback } = useAction();
  const model = schema["dataset-table"].find((s) => s.id === table.schemaId);
  const columns = schema["dataset-column"].filter(
    (c) => c.tableKey === table.schemaId,
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [driver, setDriver] = useState<Adapter>();
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"grid" | "side" | "kanban" | "dashboard">(
    "grid",
  );
  const [groupColumnId, setGroupColumnId] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(table.name);
  const [focused, setFocused] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({});
  const [reload, setReload] = useState(0);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [linked, setLinked] = useState<Record<string, Choice[]>>({});
  const storageTable = { ...model!, id: table.id, name: table.name };
  const binding = { resource: table.name };
  useEffect(() => {
    let active = true;
    setLoaded(false);
    void run(async () => {
      if (!model)
        throw new Error("The schema for this table could not be found.");
      const a = (await import("@/lib/xlsx")).xlsxAdapter(folderId);
      const data = await a.read(storageTable, columns, binding);
      if (active) {
        setDriver(a);
        setRows(data);
        setSelection(new Set());
        setLoaded(true);
        setDirty(false);
        onDirty(false);
      }
    });
    return () => {
      active = false;
    };
  }, [table.id, reload]);
  const relationSignature = JSON.stringify(
    columns
      .filter((c) => c.type === "relation")
      .map((c) => [c.id, c.options?.sourceTableKey]),
  );
  useEffect(() => {
    if (!loaded) return;
    let active = true;
    void run(async () => {
      const choices: Record<string, Choice[]> = {};
      await Promise.all(
        [
          ...new Set(
            columns
              .filter((c) => c.type === "relation")
              .map((c) => c.options?.sourceTableKey)
              .filter(Boolean),
          ),
        ].map(async (key) => {
          const related = tables.filter(
            (t) => t.schemaId === key && t.id !== table.id,
          );
          choices[key!] = (
            await Promise.all(
              related.map(async (t) => {
                const definition = schema["dataset-table"].find(
                  (m) => m.id === t.schemaId,
                )!;
                const cols = schema["dataset-column"].filter(
                  (c) => c.tableKey === t.schemaId,
                );
                const values = await (
                  await import("@/lib/xlsx")
                )
                  .xlsxAdapter(folderId)
                  .read({ ...definition, id: t.id, name: t.name }, cols, {
                    resource: t.name,
                  });
                return values.map((r) => ({
                  value: r.id,
                  label: `${t.name} · ${String(r[cols[0]?.id] ?? r.id)}`,
                }));
              }),
            )
          ).flat();
        }),
      );
      if (active) setLinked(choices);
    });
    return () => {
      active = false;
    };
  }, [loaded, relationSignature, tables.length]);
  useEffect(() => {
    if (loaded) {
      setDirty(true);
      onDirty(true);
    }
  }, [schema]);
  function edit(next: Row[]) {
    setRows(next);
    setDirty(true);
    onDirty(true);
  }
  function options(c: Column): Choice[] {
    if (c.type === "boolean")
      return [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ];
    if (c.type === "select")
      return [
        ...new Set(
          (c.options?.choices ?? []).map((s) => s.trim()).filter(Boolean),
        ),
      ].map((value) => ({ value, label: value }));
    return [
      ...(linked[c.options?.sourceTableKey ?? ""] ?? []),
      ...(c.options?.sourceTableKey === table.schemaId
        ? rows.map((r) => ({
            value: r.id,
            label: `${table.name} · ${r[columns[0]?.id] ?? r.id}`,
          }))
        : []),
    ];
  }
  const visible = rows.filter((row) =>
    columns.every((c) => {
      const filter = filters[c.id];
      if (!filter || !filter.length) return true;
      const value = row[c.id];
      if (Array.isArray(filter)) return filter.includes(String(value ?? ""));
      if (c.type === "number")
        return (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          Number(value) === Number(filter)
        );
      if (c.type === "date") return String(value ?? "") === filter;
      return (c.type === "richText" ? richPlain(value) : String(value ?? ""))
        .toLocaleLowerCase()
        .includes(filter.toLocaleLowerCase());
    }),
  );
  const picked = rows.filter((r) => selection.has(r.id));
  const current = visible.find((r) => r.id === focused) ?? visible[0];
  const allVisible =
    visible.length > 0 && visible.every((r) => selection.has(r.id));
  function toggle(id: string, checked: boolean) {
    setSelection((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }
  function addRow() {
    const row = { id: crypto.randomUUID() };
    edit([...rows, row]);
    setFilters({});
    setFocused(row.id);
  }
  function input(row: Row, c: Column) {
    const change = (value: Row[string]) =>
      edit(rows.map((r) => (r.id === row.id ? { ...r, [c.id]: value } : r)));
    if (c.type === "richText")
      return view === "side" ? (
        <RichTextEditor
          key={`${row.id}:${c.id}`}
          label={c.name}
          value={String(row[c.id] ?? "")}
          disabled={!loaded || busy}
          onChange={change}
        />
      ) : (
        <button
          className="block w-full max-w-80 truncate px-3 py-2 text-left text-xs"
          title="Edit rich text in detail view"
          onClick={() => {
            setFocused(row.id);
            setView("side");
          }}
        >
          {richPlain(row[c.id]) || "Edit rich text…"}
        </button>
      );
    if (c.type === "boolean")
      return (
        <Checkbox
          aria-label={c.name}
          checked={row[c.id] === true}
          onCheckedChange={change}
        />
      );
    if (c.type === "select" || c.type === "relation") {
      const values = options(c);
      const value = String(row[c.id] ?? "");
      return (
        <Select
          value={value}
          disabled={!loaded || busy}
          onValueChange={(next) => change(next || null)}
        >
          <SelectTrigger
            className="w-full min-w-0 rounded-[5px] bg-white px-2 py-1 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:overflow-hidden"
            aria-label={c.name}
          >
            <SelectValue>
              <OptionTag
                column={c}
                value={value}
                label={values.find((o) => o.value === value)?.label ?? value}
              />
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            className="rounded-[7px] p-1 [&_[data-slot=select-item]]:rounded"
            alignItemWithTrigger={false}
          >
            <SelectItem value="">None</SelectItem>
            {value && !values.some((o) => o.value === value) && (
              <SelectItem value={value}>
                <OptionTag
                  column={c}
                  value={value}
                  label={`${value} (unavailable)`}
                />
              </SelectItem>
            )}
            {values.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <OptionTag column={c} value={o.value} label={o.label} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <input
        aria-label={c.name}
        type={
          c.type === "date" ? "date" : c.type === "number" ? "number" : "text"
        }
        step="any"
        value={String(row[c.id] ?? "")}
        onChange={(e) =>
          change(
            e.target.value === ""
              ? null
              : c.type === "number"
                ? Number(e.target.value)
                : e.target.value,
          )
        }
      />
    );
  }
  function filterInput(c: Column) {
    const value = filters[c.id] ?? "";
    if (!["select", "relation", "boolean"].includes(c.type))
      return (
        <input
          aria-label={`Filter ${c.name}`}
          placeholder={c.name}
          title={c.name}
          type={
            c.type === "date" && value
              ? "date"
              : c.type === "number"
                ? "number"
                : "text"
          }
          onFocus={(e) => {
            if (c.type === "date") e.currentTarget.type = "date";
          }}
          onBlur={(e) => {
            if (c.type === "date" && !e.currentTarget.value)
              e.currentTarget.type = "text";
          }}
          step="any"
          value={Array.isArray(value) ? "" : value}
          onChange={(e) => setFilters({ ...filters, [c.id]: e.target.value })}
        />
      );
    return (
      <Popover>
        <PopoverTrigger
          className="flex min-h-7 flex-wrap items-center gap-1 rounded-[5px] border border-input bg-white px-[7px] py-1 text-left text-xs text-neutral-500"
          aria-label={`Filter ${c.name}`}
        >
          {Array.isArray(value) && value.length
            ? value.map((v) => (
                <OptionTag
                  key={v}
                  column={c}
                  value={v}
                  label={options(c).find((o) => o.value === v)?.label ?? v}
                />
              ))
            : c.name}
        </PopoverTrigger>
        <PopoverContent className="max-h-[350px] overflow-auto rounded-[7px] bg-white font-sans shadow-[0_5px_28px_#00000015] [&>strong]:text-[13px] [&>strong]:font-medium [&>label]:flex [&>label]:items-center [&>label]:gap-2.5 [&>label]:text-[13px] [&>label]:text-neutral-500 [&>button:last-child]:text-left [&>button:last-child]:text-xs [&>button:last-child]:text-primary">
          <strong>{c.name}</strong>
          {options(c).map((o) => (
            <label key={o.value}>
              <Checkbox
                checked={Array.isArray(value) && value.includes(o.value)}
                onCheckedChange={(checked) =>
                  setFilters({
                    ...filters,
                    [c.id]: checked
                      ? [...(Array.isArray(value) ? value : []), o.value]
                      : (Array.isArray(value) ? value : []).filter(
                          (v) => v !== o.value,
                        ),
                  })
                }
              />
              <OptionTag column={c} value={o.value} label={o.label} />
            </label>
          ))}
          <Button
            variant="ghost"
            onClick={() => setFilters({ ...filters, [c.id]: "" })}
          >
            Clear filter
          </Button>
        </PopoverContent>
      </Popover>
    );
  }
  async function exportSelection(format: "xlsx" | "clipboard") {
    const { exportRows, delimitedRows } = await import("@/lib/xlsx");
    if (format === "xlsx") await exportRows(columns, picked, table.name);
    else {
      await navigator.clipboard.writeText(delimitedRows(columns, picked, "\t"));
      notify(`${picked.length} row(s) copied.`);
    }
  }
  return (
    <>
      <div
        className={`flex h-[39px] min-h-[39px] shrink-0 items-center justify-between gap-2.5 overflow-x-auto border-b border-border px-3 py-[3px] max-[760px]:px-2 ${compactButtonsClassName} [&>div]:flex-nowrap [&>div]:gap-1 [&>div:last-child]:ml-auto [&_label]:h-7 [&_label]:min-h-7 [&_label]:whitespace-nowrap [&_label]:px-[7px] [&_label]:py-1 [&_label]:text-xs`}
      >
        <div className="flex shrink-0 items-center gap-1">
          {(
            [
              ["grid", "Grid", Table2],
              ["side", "Detail", PanelLeft],
              ["kanban", "Kanban", Columns3],
              ["dashboard", "Dashboard", ChartPie],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              aria-pressed={view === key}
              className="flex items-center gap-[7px] rounded-[5px] border border-transparent bg-white px-[7px] py-1 text-xs whitespace-nowrap text-neutral-500 aria-pressed:border-border aria-pressed:bg-[#fafafa] aria-pressed:text-neutral-600"
              onClick={() => setView(key)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-[7px]">
          <ImportData
            columns={columns}
            disabled={!loaded || busy}
            onImport={(incoming) => {
              edit([...rows, ...incoming]);
              setFilters({});
              notify(
                `${incoming.length} rows imported. Save to write them to the workbook.`,
              );
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Download selected rows as Excel"
            title="Download selected rows as Excel"
            disabled={!picked.length || busy}
            onClick={() => void run(() => exportSelection("xlsx"))}
          >
            <Download />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy selected rows"
            title="Copy selected rows"
            disabled={!picked.length || busy}
            onClick={() => void run(() => exportSelection("clipboard"))}
          >
            <Copy />
          </Button>
          <span className="mx-[3px] h-4 w-px shrink-0 bg-neutral-200" />
          <Button
            variant="ghost"
            size="icon-sm"
            title="Reload data"
            disabled={busy}
            onClick={() => {
              if (!dirty || window.confirm("Reload and discard your changes?"))
                setReload(reload + 1);
            }}
          >
            <RefreshCw />
          </Button>
          <Button
            variant="outline"
            disabled={!loaded || busy || !columns.length}
            onClick={addRow}
          >
            <Plus />
            Row
          </Button>
          <Button
            disabled={!dirty || !loaded || busy}
            onClick={() =>
              void run(async () => {
                await driver!.write(storageTable, columns, binding, rows);
                setDirty(false);
                onDirty(false);
                notify("Changes saved.");
              })
            }
          >
            <Save />
            Save
          </Button>
          <TableOptions>
            <Button
              variant="ghost"
              disabled={!loaded || busy}
              onClick={() =>
                setEditingColumn({
                  id: crypto.randomUUID(),
                  tableKey: table.schemaId,
                  name: "New column",
                  type: "text",
                })
              }
            >
              <Plus />
              Add column
            </Button>
            <Button
              variant="ghost"
              disabled={!loaded || busy}
              onClick={() => {
                setNewName(table.name);
                setRenaming(true);
              }}
            >
              <Pencil />
              Rename table
            </Button>
            {schemaActions}
          </TableOptions>
        </div>
      </div>
      {feedback}
      <div className="flex shrink-0 items-start border-b border-border">
        <span
          className="flex h-10 w-11 shrink-0 items-center justify-center"
          title="Select all filtered rows"
        >
          <Checkbox
            aria-label="Select all filtered rows"
            disabled={!loaded || busy || !visible.length}
            checked={allVisible}
            indeterminate={
              !allVisible && visible.some((r) => selection.has(r.id))
            }
            onCheckedChange={(checked) =>
              setSelection((prev) => {
                const next = new Set(prev);
                visible.forEach((r) =>
                  checked ? next.add(r.id) : next.delete(r.id),
                );
                return next;
              })
            }
          />
        </span>
        <div className="flex min-w-0 flex-1 items-start gap-2.5 overflow-x-auto px-3 py-1.5 [&>div]:min-w-[150px] [&>div]:max-w-[250px] [&>div]:flex-1 [&>div]:gap-[3px]! [&>div]:text-[10px] [&_input]:min-h-7! [&_input]:px-[7px]! [&_input]:py-1! [&_input]:text-xs">
          {columns.map((c) => (
            <div key={c.id} className={fieldClassName}>
              {filterInput(c)}
            </div>
          ))}
        </div>
      </div>
      <Dialog
        open={renaming}
        onOpenChange={(open) => {
          if (!busy) setRenaming(open);
        }}
      >
        <DialogContent className={dialogClassName}>
          <DialogTitle>Rename table</DialogTitle>
          <DialogDescription>
            The Excel workbook in your workspace folder will be renamed too.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const name = newName.trim();
                if (
                  tables.some(
                    (t) =>
                      t.id !== table.id &&
                      t.name.toLowerCase() === name.toLowerCase(),
                  )
                )
                  throw new Error("A table already uses this name.");
                await driver!.rename(binding, name, () =>
                  saveWorkspace(
                    schema,
                    tables.map((t) => (t.id === table.id ? { ...t, name } : t)),
                  ),
                );
                setRenaming(false);
                notify("Table and workbook renamed.");
              });
            }}
          >
            <Field label="Table name">
              <input
                required
                value={newName}
                disabled={busy}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>
            {feedback}
            <Button
              type="submit"
              disabled={
                busy || !newName.trim() || newName.trim() === table.name
              }
            >
              Rename table
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {editingColumn && (
        <ColumnSettings
          key={editingColumn.id}
          column={editingColumn}
          columns={columns}
          close={() => setEditingColumn(null)}
          save={async (nextColumns) => {
            let nextRows = rows;
            for (const next of nextColumns) {
              const previous = columns.find((c) => c.id === next.id);
              if (previous && previous.type !== next.type) {
                const converted = (await import("@/lib/xlsx")).mapImport(
                  {
                    name: table.name,
                    headers: [next.name],
                    rows: nextRows.map((r) => [
                      previous.type === "richText"
                        ? richPlain(r[next.id])
                        : (r[next.id] ?? null),
                    ]),
                  },
                  { [next.id]: "0" },
                  [next],
                );
                nextRows = nextRows.map((r, i) => ({
                  ...r,
                  [next.id]: converted[i][next.id],
                }));
              }
            }
            const allColumns = [
              ...schema["dataset-column"].filter(
                (c) => c.tableKey !== table.schemaId,
              ),
              ...nextColumns,
            ];
            saveSchema({
              ...schema,
              "dataset-column": allColumns,
              "dataset-relation": allColumns
                .filter(
                  (c) => c.type === "relation" && c.options?.sourceTableKey,
                )
                .map((c) => ({
                  id: c.id,
                  columnKey: c.id,
                  sourceTableKey: c.tableKey,
                  targetTableKey: c.options!.sourceTableKey!,
                })),
            });
            setFilters({});
            edit(nextRows);
          }}
        />
      )}
      <fieldset
        disabled={!loaded || busy}
        className="m-0 flex min-h-0 min-w-0 flex-1 flex-col border-0 p-0 disabled:opacity-65"
      >
        {view === "kanban" || view === "dashboard" ? (
          <Suspense
            fallback={
              <p className="p-6 text-sm text-neutral-400">Loading view…</p>
            }
          >
            <TableViews
              view={view}
              columns={columns}
              rows={visible}
              groupColumnId={groupColumnId}
              onGroupColumn={setGroupColumnId}
              selection={selection}
              onSelect={toggle}
              disabled={!loaded || busy}
              onOpen={(id) => {
                setFocused(id);
                setView("side");
              }}
              onMove={(id, columnId, value) => {
                const column = columns.find(
                  (c) => c.id === columnId && c.type === "select",
                );
                if (
                  busy ||
                  !loaded ||
                  !column ||
                  !rows.some((r) => r.id === id) ||
                  (value &&
                    !column.options?.choices?.some(
                      (choice) => choice.trim() === value,
                    ))
                )
                  return;
                edit(
                  rows.map((r) =>
                    r.id === id ? { ...r, [columnId]: value || null } : r,
                  ),
                );
              }}
            />
          </Suspense>
        ) : view === "grid" ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full table-auto border-separate border-spacing-0 text-left [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-1 [&_th]:h-11 [&_th]:min-w-[185px] [&_th]:border-r [&_th]:border-b [&_th]:border-border [&_th]:bg-white [&_th]:px-[15px] [&_th]:text-[13px] [&_th]:font-[450] [&_th]:text-neutral-600 max-[760px]:[&_th]:min-w-40 [&_th>span]:flex [&_th>span]:items-center [&_th>span]:gap-[9px] [&_th_svg]:text-neutral-400 [&_th_svg]:stroke-[1.6] [&_th_[data-slot=button]]:ml-auto [&_td]:h-[43px] min-[1600px]:[&_td]:h-[47px] [&_td]:border-r [&_td]:border-b [&_td]:border-border [&_td]:bg-white [&_td]:px-3 [&_td]:align-middle [&_td]:text-sm [&_tr:hover_td]:bg-[#fcfcfc] [&_tr[data-selected=true]_td]:bg-[#fbf8f0] [&_td_input]:min-h-[34px] [&_td_input]:w-full [&_td_input]:min-w-[140px] [&_td_input]:rounded-[3px] [&_td_input]:border [&_td_input]:border-transparent [&_td_input]:bg-transparent [&_td_input]:px-[3px] [&_td_input]:py-[5px] [&_td_input]:text-[#414141] [&_td_input]:outline-none [&_td_input:hover]:border-[#e4e0d5] [&_td_input:focus]:border-ring [&_td_input:focus]:bg-white [&_td_input:focus]:ring-2 [&_td_input:focus]:ring-primary/5 [&_[data-slot=select-trigger]]:h-[39px] [&_[data-slot=select-trigger]]:rounded-none [&_[data-slot=select-trigger]]:border-0 [&_[data-slot=select-trigger]]:shadow-none">
              <thead>
                <tr>
                  <th className="w-11! min-w-11! border-r-0! px-3.5!">
                    <span className="sr-only">Selection</span>
                  </th>
                  {columns.map((c) => {
                    const Icon = icons[c.type];
                    return (
                      <th key={c.id} title={c.description}>
                        <span>
                          <Icon size={15} />
                          {c.name}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Settings for ${c.name}`}
                            title={`Settings for ${c.name}`}
                            onClick={() => setEditingColumn(c)}
                          >
                            <Settings2 size={14} />
                          </Button>
                        </span>
                      </th>
                    );
                  })}
                  <th className="w-12! min-w-12! border-r-0! text-center text-[11px]! text-neutral-400!">
                    #
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id} data-selected={selection.has(r.id)}>
                    <td className="w-11! min-w-11! border-r-0! px-3.5!">
                      <Checkbox
                        aria-label={`Select row ${i + 1}`}
                        checked={selection.has(r.id)}
                        onCheckedChange={(checked) => toggle(r.id, checked)}
                      />
                    </td>
                    {columns.map((c) => (
                      <td key={c.id}>{input(r, c)}</td>
                    ))}
                    <td className="w-12! min-w-12! border-r-0! text-center text-[11px]! text-neutral-400!">
                      {i + 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <div
                className={`${emptyClassName} py-[60px]! max-[760px]:py-10!`}
              >
                <Table2 />
                <p>
                  {!loaded
                    ? "Load the table or grant access to its folder."
                    : !columns.length
                      ? "Add columns to the schema."
                      : rows.length
                        ? "No rows match these filters."
                        : "No rows yet. Add your first record."}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] max-[760px]:grid-cols-[150px_minmax(0,1fr)]">
              <aside className="overflow-auto border-r border-border p-1 [&>p]:p-5">
                {visible.map((r, i) => (
                  <div
                    key={r.id}
                    data-active={current?.id === r.id}
                    className="mx-0.5 mt-1 mb-[7px] flex items-start gap-[9px] rounded-[7px] border border-border px-2.5 py-0.5 data-[active=true]:border-[#cbb989] data-[active=true]:bg-[#f8f6f0] [&>[data-slot=checkbox]]:mt-3"
                  >
                    <Checkbox
                      aria-label={`Select row ${i + 1}`}
                      checked={selection.has(r.id)}
                      onCheckedChange={(checked) => toggle(r.id, checked)}
                    />
                    <button
                      className="min-w-0 flex-1 py-[9px] text-left [&>strong]:block [&>strong]:truncate [&>strong]:text-[13px] [&>strong]:font-[450]"
                      onClick={() => setFocused(r.id)}
                    >
                      <strong>
                        {columns[0]?.type === "richText"
                          ? richPlain(r[columns[0].id])
                          : String(r[columns[0]?.id] ?? `Row ${i + 1}`)}
                      </strong>
                      <RowTags columns={columns} row={r} />
                    </button>
                  </div>
                ))}
                {!visible.length && (
                  <p className="text-[13px] text-neutral-400">No records</p>
                )}
              </aside>
              {current ? (
                <div className="overflow-auto px-6 py-[18px] max-[760px]:p-3.5">
                  <div className="mx-auto mb-4 flex w-full max-w-2xl flex-wrap items-center justify-between gap-2.5 border-b border-neutral-100 pb-3 [&>h1]:text-[19px] [&>h1]:leading-[1.3] [&>h1]:font-[550] [&>h1]:tracking-[-0.4px] [&>h1]:wrap-anywhere [&>span]:mt-0 [&>span]:ml-auto [&>span]:justify-end">
                    <h1>
                      {columns[0]?.type === "richText"
                        ? richPlain(current[columns[0].id])
                        : String(current[columns[0]?.id] ?? "New record")}
                    </h1>
                    <RowTags columns={columns} row={current} />
                  </div>
                  <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-x-5 gap-y-3.5 max-[1100px]:grid-cols-1 [&>div]:gap-[5px]! [&_input]:min-h-[34px]! [&_input]:px-[9px]! [&_input]:py-1.5">
                    {columns.map((c) => (
                      <div
                        key={c.id}
                        className={`${fieldClassName} ${c.type === "richText" ? "col-span-full min-w-0" : ""}`}
                      >
                        <span>{c.name}</span>
                        {input(current, c)}
                        {c.description && <small>{c.description}</small>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={emptyClassName}>
                  <PanelLeft />
                  <p>Select a row to view its details.</p>
                </div>
              )}
            </div>
          </>
        )}
      </fieldset>
      <footer className="flex min-h-8 shrink-0 flex-wrap items-center gap-2.5 border-t border-border bg-[#fcfcfc] px-3 py-1.5 text-xs text-neutral-400 max-[760px]:text-[10px]">
        <span>
          {visible.length} / {rows.length} rows
          <span className="px-[9px] text-neutral-300">·</span>
          {picked.length} selected
          {picked.some((r) => !visible.some((v) => v.id === r.id)) &&
            " (including hidden rows)"}
        </span>
        {picked.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              edit(rows.filter((r) => !selection.has(r.id)));
              setSelection(new Set());
            }}
          >
            <Trash2 />
            Delete selection
          </Button>
        )}
        <span className="ml-auto text-[11px] text-[#9c927b] max-[760px]:m-0 max-[760px]:w-full">
          {dirty ? "Unsaved changes" : model?.name}
          {` · ${table.name}.xlsx`}
        </span>
      </footer>
    </>
  );
}

function ImportData({
  columns,
  disabled,
  onImport,
}: {
  columns: Column[];
  disabled: boolean;
  onImport(rows: Row[]): void;
}) {
  const [sheets, setSheets] = useState<ImportSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const { run, busy, feedback } = useAction();
  const sheet = sheets[sheetIndex];
  function chooseSheet(index: number, available = sheets) {
    setSheetIndex(index);
    setMapping(
      Object.fromEntries(
        columns.map((c) => {
          const match = available[index].headers.findIndex(
            (h) => h.trim().toLowerCase() === c.name.trim().toLowerCase(),
          );
          return [c.id, match < 0 ? "" : String(match)];
        }),
      ),
    );
  }
  return (
    <>
      <label className={fileButtonClassName}>
        <Upload size={15} />
        Import data
        <input
          type="file"
          accept=".xlsx,.csv"
          disabled={disabled || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file)
              void run(async () => {
                const next = await (
                  await import("@/lib/xlsx")
                ).readImport(file);
                if (!next.length)
                  throw new Error("No visible worksheets found.");
                setSheets(next);
                chooseSheet(0, next);
              });
          }}
        />
      </label>
      {!sheets.length && feedback}
      <Dialog
        open={sheets.length > 0}
        onOpenChange={(open) => {
          if (!open && !busy) setSheets([]);
        }}
      >
        <DialogContent
          className={`${dialogClassName} max-h-[90dvh] max-w-[min(700px,calc(100vw-32px))]! overflow-auto`}
        >
          <DialogTitle>Import data</DialogTitle>
          <DialogDescription>
            Match file columns to table columns. Imported rows will be appended;
            save the table to write them to the workbook.
          </DialogDescription>
          {sheet && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const incoming = (await import("@/lib/xlsx")).mapImport(
                    sheet,
                    mapping,
                    columns,
                  );
                  onImport(incoming);
                  setSheets([]);
                });
              }}
            >
              <Field label="Worksheet">
                <select
                  value={sheetIndex}
                  onChange={(e) => chooseSheet(Number(e.target.value))}
                >
                  {sheets.map((s, i) => (
                    <option value={i} key={i}>
                      {s.name} · {s.rows.length} rows
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
                {columns.map((c) => (
                  <Field key={c.id} label={`${c.name} · ${typeNames[c.type]}`}>
                    <select
                      value={mapping[c.id] ?? ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [c.id]: e.target.value })
                      }
                    >
                      <option value="">Do not import</option>
                      {sheet.headers.map((h, i) => (
                        <option value={i} key={i}>
                          {i + 1}. {h}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <p className="mt-[22px] text-[11px] leading-relaxed text-neutral-400">
                Dates: YYYY-MM-DD. Relations: existing row IDs. Unmapped cells
                are left empty.
              </p>
              <div className="max-h-[190px] overflow-auto [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:whitespace-nowrap [&_td]:border [&_td]:border-border [&_td]:p-[9px] [&_td]:text-left [&_th]:border [&_th]:border-border [&_th]:p-[9px] [&_th]:text-left">
                <table>
                  <thead>
                    <tr>
                      {sheet.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        {row.map((v, j) => (
                          <td key={j}>{String(v ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {feedback}
              <Button
                type="submit"
                disabled={
                  busy ||
                  !sheet.rows.length ||
                  !Object.values(mapping).some((v) => v !== "")
                }
              >
                <Upload />
                Import {sheet.rows.length} rows
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
