import { NativeSelect } from "@/components/ui/native-select";
import { datasets } from "./dataset-store";

export function DatasetSelector({ value, onChange }: { value: string | undefined; onChange: (id: string) => void }) {
  const { data = [] } = datasets.useList();
  return (
    <NativeSelect size="sm" aria-label="Dataset" value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
      <option value="" disabled>
        {data.length ? "Select a dataset" : "No dataset"}
      </option>
      {data.map((dataset) => (
        <option key={dataset.id} value={dataset.id}>
          {dataset.name}
        </option>
      ))}
    </NativeSelect>
  );
}
