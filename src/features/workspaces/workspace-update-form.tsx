import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadJson, downloadText } from "@/lib/utils";
import { useUpdateWorkspace } from "./update-workspace";
import type { Workspace } from "./workspace-schema";

export function WorkspaceUpdateForm({ workspace, onSaved }: { workspace: Workspace; onSaved: () => void }) {
  const [title, setTitle] = useState(workspace.title);
  const [datasetContext, setDatasetContext] = useState(workspace.datasetContext);
  const [reportContext, setReportContext] = useState(workspace.reportContext);
  const update = useUpdateWorkspace();

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(
          { id: workspace.id, title: title.trim() || workspace.datasetConfig.name, datasetContext, reportContext },
          { onSuccess: onSaved },
        );
      }}
    >
      <FieldGroup className="flex-1 overflow-y-auto px-6">
        <Field>
          <FieldLabel htmlFor="workspace-title">Title</FieldLabel>
          <Input id="workspace-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <ReadOnlyJson label="Dataset config" value={workspace.datasetConfig} name={`${workspace.title}-dataset-config`} />
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="dataset-context">Dataset context</FieldLabel>
            <Button type="button" variant="ghost" size="xs" onClick={() => downloadText(datasetContext, `${workspace.title}-dataset-context`)}>
              <DownloadIcon />
              .txt
            </Button>
          </div>
          <Textarea
            id="dataset-context"
            rows={6}
            value={datasetContext}
            onChange={(event) => setDatasetContext(event.target.value)}
            placeholder="Business rules, definitions, fiscal year, naming conventions…"
          />
        </Field>
        <ReadOnlyJson label="Report config" value={workspace.reportConfig} name={`${workspace.title}-report-config`} />
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="report-context">Report context</FieldLabel>
            <Button type="button" variant="ghost" size="xs" onClick={() => downloadText(reportContext, `${workspace.title}-report-context`)}>
              <DownloadIcon />
              .txt
            </Button>
          </div>
          <Textarea
            id="report-context"
            rows={4}
            value={reportContext}
            onChange={(event) => setReportContext(event.target.value)}
            placeholder="What each page is for, who reads it…"
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end border-t p-4">
        <Button type="submit" disabled={update.isPending}>Save</Button>
      </div>
    </form>
  );
}

function ReadOnlyJson({ label, value, name }: { label: string; value: unknown; name: string }) {
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <Button type="button" variant="ghost" size="xs" onClick={() => downloadJson(value, name)}>
          <DownloadIcon />
          .json
        </Button>
      </div>
      <pre className="max-h-48 overflow-auto rounded-md border bg-muted/50 p-2 text-[11px]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </Field>
  );
}
