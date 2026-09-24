import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatasetSelector } from "@/features/datasets/dataset-selector";
import { datasets } from "@/features/datasets/dataset-store";
import { errorMessage } from "@/lib/utils";
import { useCreateReport } from "./create-report";

const TEST_URL =
  "https://app.powerbi.com/reportEmbed?reportId=78c107d4-9716-4f46-a4c9-9e5bbf97acf2&autoAuth=true&ctid=70aae3b7-9f3b-484d-8f95-49e8fbb783c0";

export function ReportCreateForm({ onCreated }: { onCreated: () => void }) {
  const { data = [] } = datasets.useList();
  const [url, setUrl] = useState("");
  const [datasetId, setDatasetId] = useState<string | undefined>();
  const selected = datasetId ?? data[0]?.id;
  const create = useCreateReport();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selected) create.mutate({ url: url.trim(), datasetId: selected }, { onSuccess: onCreated });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="report-url">Embedded report URL</FieldLabel>
          <Input id="report-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://app.powerbi.com/reportEmbed?reportId=…" />
          <FieldDescription>Pages and visuals are read with the Power BI client.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Dataset</FieldLabel>
          <DatasetSelector value={selected} onChange={setDatasetId} />
          <FieldDescription>The semantic model the report is built on.</FieldDescription>
        </Field>
        {create.error && <FieldError>{errorMessage(create.error)}</FieldError>}
        <div className="flex justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => setUrl(TEST_URL)}>
            Use test URL
          </Button>
          <Button type="submit" disabled={!url.trim() || !selected || create.isPending}>
            {create.isPending ? "Reading Power BI…" : "Add report"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
