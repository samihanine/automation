import { useState } from "react";
import { ContextField, ReadOnlyJson } from "@/components/entity-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatasetSelector } from "@/features/datasets/dataset-selector";
import type { Report } from "./report-schema";
import { useUpdateReport } from "./update-report";

export function ReportUpdateForm({ report, onSaved }: { report: Report; onSaved: () => void }) {
  const [name, setName] = useState(report.name);
  const [context, setContext] = useState(report.context);
  const [datasetId, setDatasetId] = useState(report.datasetId);
  const update = useUpdateReport();

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({ id: report.id, name: name.trim() || report.name, context, datasetId }, { onSuccess: onSaved });
      }}
    >
      <FieldGroup className="flex-1 overflow-y-auto px-6">
        <Field>
          <FieldLabel htmlFor="report-name">Name</FieldLabel>
          <Input id="report-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Dataset</FieldLabel>
          <DatasetSelector value={datasetId} onChange={setDatasetId} />
        </Field>
        <ReadOnlyJson label="Config" value={report.config} name={`${report.name}-config`} />
        <ContextField value={context} onChange={setContext} name={`${report.name}-context`} placeholder="What each page is for, who reads it…" />
      </FieldGroup>
      <div className="flex justify-end border-t p-4">
        <Button type="submit" disabled={update.isPending}>Save</Button>
      </div>
    </form>
  );
}
