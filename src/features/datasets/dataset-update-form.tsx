import { useState } from "react";
import { ContextField, ReadOnlyJson } from "@/components/entity-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Dataset } from "./dataset-schema";
import { useUpdateDataset } from "./update-dataset";

export function DatasetUpdateForm({ dataset, onSaved }: { dataset: Dataset; onSaved: () => void }) {
  const [name, setName] = useState(dataset.name);
  const [context, setContext] = useState(dataset.context);
  const update = useUpdateDataset();

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({ id: dataset.id, name: name.trim() || dataset.name, context }, { onSuccess: onSaved });
      }}
    >
      <FieldGroup className="flex-1 overflow-y-auto px-6">
        <Field>
          <FieldLabel htmlFor="dataset-name">Name</FieldLabel>
          <Input id="dataset-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <ReadOnlyJson label="Config" value={dataset.config} name={`${dataset.name}-config`} />
        <ContextField
          value={context}
          onChange={setContext}
          name={`${dataset.name}-context`}
          placeholder="Business rules, definitions, fiscal year, naming conventions…"
        />
      </FieldGroup>
      <div className="flex justify-end border-t p-4">
        <Button type="submit" disabled={update.isPending}>Save</Button>
      </div>
    </form>
  );
}
