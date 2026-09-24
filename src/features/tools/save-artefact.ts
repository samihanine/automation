import type { ToolContext } from "./tool-schema";
import { formatIssues } from "./tool-schema";

const NOT_SAVED = "Nothing was saved. Fix every error and try again.";

export async function saveArtefact(value: unknown, { artefact, setArtefactValue, ...context }: ToolContext) {
  if (!artefact) return { ok: false, errors: ["No artefact is open."], note: NOT_SAVED };
  const parsed = artefact.schema.safeParse(value);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error), note: NOT_SAVED };
  const errors = (await artefact.validate?.(parsed.data, context)) ?? [];
  if (errors.length) return { ok: false, errors, note: NOT_SAVED };
  setArtefactValue(parsed.data);
  return { ok: true, note: "Saved and displayed to the user." };
}
