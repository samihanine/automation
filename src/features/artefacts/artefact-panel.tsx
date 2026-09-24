import { useRef, useState } from "react";
import { BracesIcon, DownloadIcon, UploadIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { ConversationArtefact } from "@/features/conversations/conversation-schema";
import { resolveContext } from "@/features/conversations/conversation-context";
import { datasets } from "@/features/datasets/dataset-store";
import { reports } from "@/features/reports/report-store";
import { download, downloadJson, errorMessage } from "@/lib/utils";
import { artefactTypes, artefacts } from ".";
import type { ArtefactContext, ArtefactDefinition, ArtefactDownload, ArtefactType } from ".";

type PanelProps = {
  artefact: ConversationArtefact | null;
  datasetId: string | undefined;
  onChange: (artefact: ConversationArtefact | null) => void;
};

export function ArtefactPanel({ artefact, datasetId, onChange }: PanelProps) {
  reports.useList();
  const dataset = datasets.useItem(datasetId);
  const { report, definition } = resolveContext(datasetId, artefact);

  if (!dataset) {
    return <Empty>Select a dataset in the chat to start.</Empty>;
  }
  if (!artefact || !definition) {
    return <ArtefactPicker context={{ dataset }} onPick={onChange} />;
  }
  return (
    <ActiveArtefact
      definition={definition}
      value={artefact.value}
      context={{ dataset, report }}
      onChange={(value) => onChange({ ...artefact, value })}
      onClose={() => onChange(null)}
    />
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">{children}</div>;
}

function ArtefactPicker({ context, onPick }: { context: ArtefactContext; onPick: (artefact: ConversationArtefact) => void }) {
  const [selected, setSelected] = useState<ArtefactType | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const datasetReports = (reports.useList().data ?? []).filter((report) => report.datasetId === context.dataset.id);
  const definition = selected ? artefacts[selected] : null;

  const upload = async (file: File | undefined) => {
    if (!file || !definition?.upload) return;
    try {
      onPick({ type: definition.type, value: await definition.upload.read(file) });
    } catch (error) {
      toast.add({ title: "Could not read the file", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-auto p-6">
      <div className="text-center">
        <h2 className="font-semibold">Work on an artefact</h2>
        <p className="text-sm text-muted-foreground">Optional: the agent can also just answer questions about the data.</p>
      </div>
      <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {artefactTypes.map((type) => {
          const { icon: Icon, label, description } = artefacts[type];
          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={`flex flex-col items-start gap-1.5 rounded-lg border bg-card p-4 text-left transition hover:border-primary ${selected === type ? "border-primary ring-2 ring-primary/20" : ""}`}
            >
              <Icon className="size-5 text-primary" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </button>
          );
        })}
      </div>

      {definition && !definition.requiresReport && (
        <div className="flex gap-2">
          <Button onClick={() => onPick({ type: definition.type, value: definition.initial(context) })}>Start from scratch</Button>
          {definition.upload && (
            <>
              <Button variant="outline" onClick={() => input.current?.click()}>
                <UploadIcon />
                Upload a file
              </Button>
              <input
                ref={input}
                type="file"
                hidden
                accept={definition.upload.accept}
                onChange={(event) => void upload(event.target.files?.[0])}
              />
            </>
          )}
        </div>
      )}

      {definition?.requiresReport && (
        <div className="flex w-full max-w-md flex-col gap-2">
          <p className="text-sm font-medium">Choose a report</p>
          {datasetReports.length === 0 && (
            <p className="text-sm text-muted-foreground">No report linked to this dataset. Add one from the Reports page.</p>
          )}
          {datasetReports.map((report) => (
            <button
              key={report.id}
              onClick={() => onPick({ type: definition.type, reportId: report.id, value: definition.initial({ ...context, report }) })}
              className="rounded-md border px-3 py-2 text-left text-sm hover:border-primary"
            >
              {report.name}
              <span className="ml-2 text-xs text-muted-foreground">{report.config.pages.length} pages</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveArtefact({
  definition,
  value,
  context,
  onChange,
  onClose,
}: {
  definition: ArtefactDefinition;
  value: unknown;
  context: ArtefactContext;
  onChange: (value: unknown) => void;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const parsed = definition.schema.safeParse(value);
  const Render = definition.render;
  const title = parsed.success ? parsed.data.title : definition.label;

  const run = async ({ label, run: build }: ArtefactDownload<{ title: string }>) => {
    if (!parsed.success) return;
    setDownloading(label);
    try {
      const file = await build(parsed.data, context);
      download(file, file.name);
    } catch (error) {
      toast.add({ title: "Download failed", description: errorMessage(error), type: "error" });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Badge variant="secondary">
          <definition.icon />
          {definition.label}
        </Badge>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h2>
        <Button variant="ghost" size="sm" onClick={() => downloadJson(value, title)}>
          <BracesIcon />
          JSON
        </Button>
        {definition.downloads.map((item) => (
          <Button key={item.label} size="sm" onClick={() => void run(item)} disabled={Boolean(downloading) || !parsed.success}>
            <DownloadIcon />
            {downloading === item.label ? "Preparing…" : item.label}
          </Button>
        ))}
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close artefact">
          <XIcon />
        </Button>
      </header>
      <div className="min-h-0 flex-1">
        {parsed.success ? (
          <Render value={parsed.data} context={context} onChange={onChange} />
        ) : (
          <pre className="p-4 text-xs text-destructive">{parsed.error.message}</pre>
        )}
      </div>
    </div>
  );
}
