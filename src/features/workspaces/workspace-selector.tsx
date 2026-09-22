import { NativeSelect } from "@/components/ui/native-select";
import { useWorkspaces } from "./get-workspaces";

export function WorkspaceSelector({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const { data: workspaces = [] } = useWorkspaces();
  return (
    <NativeSelect
      aria-label="Workspace"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      className="w-full"
    >
      <option value="" disabled>
        Select a workspace
      </option>
      {workspaces.map((workspace) => (
        <option key={workspace.id} value={workspace.id}>
          {workspace.title}
        </option>
      ))}
    </NativeSelect>
  );
}
