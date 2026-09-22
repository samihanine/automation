import { useMemo } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { DownloadIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadJson, downloadText, truncate } from "@/lib/utils";
import { useDeleteWorkspace } from "./delete-workspace";
import type { Workspace } from "./workspace-schema";

function Download({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="ghost" size="xs" onClick={onClick}>
      <DownloadIcon />
      {label}
    </Button>
  );
}

export function WorkspaceTable({ workspaces, onEdit }: { workspaces: Workspace[]; onEdit: (workspace: Workspace) => void }) {
  const deleteWorkspace = useDeleteWorkspace();
  const columns = useMemo<ColumnDef<Workspace>[]>(
    () => [
      { header: "Title", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
      {
        header: "Dataset config",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{row.original.datasetConfig.name}</span>
            <Download label="json" onClick={() => downloadJson(row.original.datasetConfig, `${row.original.title}-dataset-config`)} />
          </div>
        ),
      },
      {
        header: "Dataset context",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{truncate(row.original.datasetContext, 60) || "—"}</span>
            {row.original.datasetContext && (
              <Download label="txt" onClick={() => downloadText(row.original.datasetContext, `${row.original.title}-dataset-context`)} />
            )}
          </div>
        ),
      },
      {
        header: "Report config",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {row.original.reportConfig.name} · {row.original.reportConfig.pages.length} pages
            </span>
            <Download label="json" onClick={() => downloadJson(row.original.reportConfig, `${row.original.title}-report-config`)} />
          </div>
        ),
      },
      {
        header: "Report context",
        cell: ({ row }) => <span className="text-muted-foreground">{truncate(row.original.reportContext, 60) || "—"}</span>,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(row.original)} aria-label="Edit">
              <PencilIcon />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => deleteWorkspace.mutate(row.original.id)} aria-label="Delete">
              <Trash2Icon />
            </Button>
          </div>
        ),
      },
    ],
    [deleteWorkspace, onEdit],
  );
  const table = useReactTable({ data: workspaces, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {workspaces.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                No workspace yet. Add one to start.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
