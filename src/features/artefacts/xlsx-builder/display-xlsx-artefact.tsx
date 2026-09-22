import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Spinner } from "@/components/ui/spinner";
import { useDaxQuery } from "@/features/workspaces/use-dax-query";
import type { Workspace } from "@/features/workspaces/workspace-schema";
import { cn } from "@/lib/utils";
import type { ArtefactRenderProps } from "../artefact-schema";
import type { XlsxArtefact, XlsxArtefactSheet } from "./xlsx-artefact-schema";
import { resolveXlsxSheet } from "./resolve-xlsx-sheet";

export function DisplayXlsxArtefact({ value, workspace }: ArtefactRenderProps<XlsxArtefact>) {
  const [active, setActive] = useState(0);
  const sheet = value.sheets[Math.min(active, value.sheets.length - 1)];

  return (
    <div className="flex h-full flex-col">
      <SheetView key={sheet.name} sheet={sheet} workspace={workspace} />
      <div className="flex shrink-0 gap-px overflow-x-auto border-t bg-muted">
        {value.sheets.map((item, index) => (
          <button
            key={item.name}
            onClick={() => setActive(index)}
            className={cn(
              "px-4 py-2 text-xs whitespace-nowrap text-muted-foreground hover:text-foreground",
              item === sheet && "bg-background font-medium text-foreground",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function SheetView({ sheet, workspace }: { sheet: XlsxArtefactSheet; workspace: Workspace }) {
  const query = useDaxQuery(workspace, sheet.query);
  if (query.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (query.error) {
    return <p className="flex-1 p-6 text-sm text-destructive">{query.error.message}</p>;
  }
  const resolved = resolveXlsxSheet(sheet, query.data);
  return <DataTable className="flex-1" columns={resolved.columns} rows={resolved.rows} />;
}
