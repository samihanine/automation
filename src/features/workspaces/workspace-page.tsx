import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWorkspaces } from "./get-workspaces";
import { WorkspaceCreateForm } from "./workspace-create-form";
import type { Workspace } from "./workspace-schema";
import { WorkspaceTable } from "./workspace-table";
import { WorkspaceUpdateForm } from "./workspace-update-form";

export function WorkspacePage() {
  const { data: workspaces = [] } = useWorkspaces();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="grid grid-cols-3 items-center">
        <Button variant="outline" className="justify-self-start" nativeButton={false} render={<Link to="/agent" />}>
          <ArrowLeftIcon />
          Back
        </Button>
        <h1 className="text-center text-lg font-semibold">Workspaces</h1>
        <Button className="justify-self-end" onClick={() => setCreating(true)}>
          <PlusIcon />
          Add
        </Button>
      </header>

      <WorkspaceTable workspaces={workspaces} onEdit={setEditing} />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a workspace</DialogTitle>
            <DialogDescription>
              Connection and report configs are generated from Power BI. Sign in from Settings first.
            </DialogDescription>
          </DialogHeader>
          <WorkspaceCreateForm onCreated={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit workspace</SheetTitle>
          </SheetHeader>
          {editing && <WorkspaceUpdateForm key={editing.id} workspace={editing} onSaved={() => setEditing(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
