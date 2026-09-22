import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatValue } from "@/lib/utils";

export type DataTableColumn = { key: string; header: string; format?: string };

export function DataTable({
  columns,
  rows,
  className,
}: {
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  className?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const numeric = new Set(
    columns
      .filter((column) => ["integer", "number", "currency", "percent"].includes(column.format ?? ""))
      .map((column) => column.key),
  );
  const columnDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        header: column.header,
        accessorFn: (row) => row[column.key] ?? null,
        cell: ({ getValue }) => formatValue(getValue(), column.format),
      })),
    [columns],
  );
  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={cn("overflow-auto", className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && <ArrowUpIcon className="size-3" />}
                    {header.column.getIsSorted() === "desc" && <ArrowDownIcon className="size-3" />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn("whitespace-nowrap", numeric.has(cell.column.id) && "text-right tabular-nums")}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length || 1} className="text-center text-muted-foreground">
                No rows
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
