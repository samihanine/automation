import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { artefactTypes, artefacts } from "@/features/artefacts";
import type { ArtefactType } from "@/features/artefacts";
import { useWorkspaces } from "@/features/workspaces/get-workspaces";
import { WorkspaceSelector } from "@/features/workspaces/workspace-selector";
import { readSettings } from "@/lib/settings";
import { errorMessage } from "@/lib/utils";
import { createConversation } from "./create-conversation";

export function CreateConversationPage({ onCreated }: { onCreated?: () => void }) {
  const navigate = useNavigate();
  const { data: workspaces = [] } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();
  const selected = workspaceId ?? workspaces[0]?.id;

  const create = async (artefactType: ArtefactType) => {
    if (!selected) return;
    try {
      const conversation = await createConversation({
        workspaceId: selected,
        artefactType,
        model: readSettings().defaultModel,
      });
      onCreated?.();
      await navigate({ to: "/agent", search: { c: conversation.id } });
    } catch (error) {
      toast.add({ title: "Could not create the conversation", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">New conversation</h2>
        <p className="text-sm text-muted-foreground">Pick a workspace and what you want to build.</p>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          You need a workspace first.
          <Button nativeButton={false} render={<Link to="/workspaces" />}>Add a workspace</Button>
        </div>
      ) : (
        <>
          <div className="mx-auto w-full max-w-sm">
            <WorkspaceSelector value={selected} onChange={setWorkspaceId} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {artefactTypes.map((type) => {
              const { icon: Icon, label, description } = artefacts[type];
              return (
                <button
                  key={type}
                  onClick={() => create(type)}
                  className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
                >
                  <Icon className="size-5 text-primary" />
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </button>
              );
            })}
            <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-4 text-muted-foreground">
              <SparklesIcon className="size-5" />
              <span className="font-medium">More soon</span>
              <span className="text-xs">New artefacts plug into the same schema.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
