import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/utils";
import { useCreateDataset } from "./create-dataset";

const TEST_URL = "https://app.powerbi.com/groups/me/datasets/9ddfa07e-594d-4230-8a16-e1fb4af0611d/details?experience=power-bi";

export function DatasetCreateForm({ onCreated }: { onCreated: () => void }) {
  const [url, setUrl] = useState("");
  const create = useCreateDataset();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(url.trim(), { onSuccess: onCreated });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dataset-url">Semantic model URL</FieldLabel>
          <Input id="dataset-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://app.powerbi.com/groups/…/datasets/…" />
          <FieldDescription>The connection config and the model structure are generated from Power BI.</FieldDescription>
        </Field>
        {create.error && <FieldError>{errorMessage(create.error)}</FieldError>}
        <div className="flex justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => setUrl(TEST_URL)}>
            Use test URL
          </Button>
          <Button type="submit" disabled={!url.trim() || create.isPending}>
            {create.isPending ? "Reading Power BI…" : "Add dataset"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
