import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/utils";
import { useCreateWorkspace } from "./create-workspace";
import { createWorkspaceInputSchema } from "./workspace-schema";

const TEST_DATASET_URL =
  "https://app.powerbi.com/groups/me/datasets/9ddfa07e-594d-4230-8a16-e1fb4af0611d/details?experience=power-bi";
const TEST_REPORT_URL =
  "https://app.powerbi.com/reportEmbed?reportId=78c107d4-9716-4f46-a4c9-9e5bbf97acf2&autoAuth=true&ctid=70aae3b7-9f3b-484d-8f95-49e8fbb783c0";

export function WorkspaceCreateForm({ onCreated }: { onCreated: () => void }) {
  const [datasetUrl, setDatasetUrl] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateWorkspace();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const input = createWorkspaceInputSchema.safeParse({ datasetUrl, reportUrl });
        if (!input.success) return setError(input.error.issues[0].message);
        create.mutate(input.data, {
          onSuccess: onCreated,
          onError: (reason) => setError(errorMessage(reason)),
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dataset-url">Semantic model URL</FieldLabel>
          <Input
            id="dataset-url"
            value={datasetUrl}
            onChange={(event) => setDatasetUrl(event.target.value)}
            placeholder="https://app.powerbi.com/groups/…/datasets/…"
          />
          <FieldDescription>Used to query the dataset and read its structure.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="report-url">Embedded report URL</FieldLabel>
          <Input
            id="report-url"
            value={reportUrl}
            onChange={(event) => setReportUrl(event.target.value)}
            placeholder="https://app.powerbi.com/reportEmbed?reportId=…"
          />
          <FieldDescription>Pages and visuals are read with the Power BI client.</FieldDescription>
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDatasetUrl(TEST_DATASET_URL);
              setReportUrl(TEST_REPORT_URL);
            }}
          >
            Use test URLs
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Reading Power BI…" : "Create workspace"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
