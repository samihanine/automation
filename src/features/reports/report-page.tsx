import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DownloadButton, SimpleTable } from "@/components/simple-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { downloadJson, downloadText, truncate } from "@/lib/utils";
import { ReportCreateForm } from "./report-create-form";
import type { Report } from "./report-schema";
import { reports } from "./report-store";
import { datasets } from "@/features/datasets/dataset-store";
import { ReportUpdateForm } from "./report-update-form";

export function ReportPage() {
  const { data = [] } = reports.useList();
  const remove = reports.useRemove();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);

  const columns = useMemo<ColumnDef<Report>[]>(
    () => [
      { header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { header: "Dataset", cell: ({ row }) => <DatasetName id={row.original.datasetId} /> },
      {
        header: "Pages",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.config.pages.length}</span>,
      },
      {
        header: "Config",
        cell: ({ row }) => <DownloadButton label="json" onClick={() => downloadJson(row.original.config, `${row.original.name}-config`)} />,
      },
      {
        header: "Context",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{truncate(row.original.context, 60) || "—"}</span>
            {row.original.context && (
              <DownloadButton label="txt" onClick={() => downloadText(row.original.context, `${row.original.name}-context`)} />
            )}
          </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(row.original)} aria-label="Edit">
              <PencilIcon />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(row.original.id)} aria-label="Delete">
              <Trash2Icon />
            </Button>
          </div>
        ),
      },
    ],
    [remove],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <PageHeader
        title="Reports"
        action={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            Add
          </Button>
        }
      />
      <SimpleTable data={data} columns={columns} empty="No report yet. Add an embedded report to use the PBI Viewer." />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a report</DialogTitle>
          </DialogHeader>
          <ReportCreateForm onCreated={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit report</SheetTitle>
          </SheetHeader>
          {editing && <ReportUpdateForm key={editing.id} report={editing} onSaved={() => setEditing(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DatasetName({ id }: { id: string }) {
  return <span className="text-muted-foreground">{datasets.useItem(id)?.name ?? "Deleted dataset"}</span>;
}
