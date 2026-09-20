import { z } from "zod";

export const columnTypes = [
  "text",
  "richText",
  "number",
  "boolean",
  "date",
  "select",
  "relation",
] as const;
export const tableSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(""),
  folderPath: z.string().default(""),
});
export const columnSchema = z.object({
  id: z.string(),
  tableKey: z.string(),
  description: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(columnTypes),
  options: z
    .object({
      choices: z.array(z.string()).optional(),
      colors: z
        .record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/))
        .optional(),
      sourceTableKey: z.string().optional(),
    })
    .optional(),
});
export const relationSchema = z.object({
  id: z.string(),
  columnKey: z.string(),
  sourceTableKey: z.string(),
  targetTableKey: z.string(),
});
export const structureSchema = z
  .object({
    "dataset-table": z.array(tableSchema),
    "dataset-column": z.array(columnSchema),
    "dataset-relation": z.array(relationSchema),
  })
  .superRefine((s, ctx) => {
    const tables = new Set(s["dataset-table"].map((t) => t.id));
    const columns = new Set<string>();
    if (tables.size !== s["dataset-table"].length)
      ctx.addIssue({
        code: "custom",
        message: "Duplicate table IDs.",
      });
    for (const c of s["dataset-column"]) {
      if (
        columns.has(c.id) ||
        !tables.has(c.tableKey) ||
        (c.type === "relation" &&
          c.options?.sourceTableKey &&
          !tables.has(c.options.sourceTableKey))
      )
        ctx.addIssue({
          code: "custom",
          message: "Invalid column or relation.",
        });
      columns.add(c.id);
    }
    for (const r of s["dataset-relation"])
      if (
        !columns.has(r.columnKey) ||
        !tables.has(r.sourceTableKey) ||
        !tables.has(r.targetTableKey)
      )
        ctx.addIssue({ code: "custom", message: "Orphaned relation." });
  });
export const typeNames: Record<(typeof columnTypes)[number], string> = {
  text: "Text",
  richText: "Rich text",
  number: "Number",
  date: "Date",
  boolean: "Yes / no",
  select: "Options",
  relation: "Relation",
};

export type Table = z.infer<typeof tableSchema>;
export type Column = z.infer<typeof columnSchema>;
export type Structure = z.infer<typeof structureSchema>;
export type Row = {
  id: string;
  [key: string]: string | number | boolean | null;
};
export type Folder = { id: string; name: string };
export type ActiveTable = { id: string; schemaId: string; name: string };
export type Binding = { resource: string };
export type Adapter = {
  rename(binding: Binding, name: string, commit: () => void): Promise<void>;
  read(table: Table, columns: Column[], binding: Binding): Promise<Row[]>;
  write(
    table: Table,
    columns: Column[],
    binding: Binding,
    rows: Row[],
  ): Promise<void>;
};
