import { useState } from "react";
import { BracesIcon, DownloadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { Workspace } from "@/features/workspaces/workspace-schema";
import { download, downloadJson, errorMessage } from "@/lib/utils";
import type { ArtefactDefinition } from "./artefact-schema";

export function ArtefactPanel({
  artefact,
  value,
  workspace,
  onChange,
}: {
  artefact: ArtefactDefinition;
  value: unknown;
  workspace: Workspace;
  onChange: (value: unknown) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const parsed = artefact.schema.safeParse(value);
  const Render = artefact.render;

  const downloadFile = async () => {
    if (!artefact.download || !parsed.success) return;
    setDownloading(true);
    try {
      const file = await artefact.download(parsed.data, workspace);
      download(file, file.name);
    } catch (error) {
      toast.add({ title: "Download failed", description: errorMessage(error), type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Badge variant="secondary">
          <artefact.icon />
          {artefact.label}
        </Badge>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
          {parsed.success ? parsed.data.title : "Invalid artefact"}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadJson(value, parsed.success ? parsed.data.title : artefact.type)}
        >
          <BracesIcon />
          JSON
        </Button>
        {artefact.download && (
          <Button size="sm" onClick={downloadFile} disabled={downloading || !parsed.success}>
            <DownloadIcon />
            {downloading ? "Preparing…" : "Download"}
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1">
        {parsed.success ? (
          <Render value={parsed.data} workspace={workspace} onChange={onChange} />
        ) : (
          <pre className="p-4 text-xs text-destructive">{parsed.error.message}</pre>
        )}
      </div>
    </div>
  );
}
