import type { ToolContext } from "./tool-schema";
import { formatIssues } from "./tool-schema";

const NOT_SAVED = "Nothing was saved. Fix every error and try again.";

export async function saveArtefact(value: unknown, { artefact, workspace, setArtefactValue }: ToolContext) {
  const parsed = artefact.schema.safeParse(value);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error), note: NOT_SAVED };
  const errors = (await artefact.validate?.(parsed.data, workspace)) ?? [];
  if (errors.length) return { ok: false, errors, note: NOT_SAVED };
  setArtefactValue(parsed.data);
  return { ok: true, note: "Saved and displayed to the user." };
}
