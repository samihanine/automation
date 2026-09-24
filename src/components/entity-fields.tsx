import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { downloadJson, downloadText } from "@/lib/utils";

export function ReadOnlyJson({ label, value, name }: { label: string; value: unknown; name: string }) {
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <Button type="button" variant="ghost" size="xs" onClick={() => downloadJson(value, name)}>
          <DownloadIcon />
          .json
        </Button>
      </div>
      <pre className="max-h-48 overflow-auto rounded-md border bg-muted/50 p-2 text-[11px]">{JSON.stringify(value, null, 2)}</pre>
    </Field>
  );
}

export function ContextField({
  value,
  onChange,
  name,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  name: string;
  placeholder: string;
}) {
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor="context">Context</FieldLabel>
        <Button type="button" variant="ghost" size="xs" onClick={() => downloadText(value, name)}>
          <DownloadIcon />
          .txt
        </Button>
      </div>
      <Textarea id="context" rows={8} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </Field>
  );
}
