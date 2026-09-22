import { z } from "zod";
import { defineTool, formatIssues } from "./tool-schema";

export const updateArtefactTool = defineTool({
  name: "update_artefact",
  description:
    "Replaces the whole artefact with a new version. The value must match the artefact JSON schema. It is validated, saved and shown to the user immediately. Returns ok or the list of errors to fix.",
  input: z.object({
    artefact: z.record(z.string(), z.unknown()).describe("Complete artefact value matching the artefact JSON schema"),
  }),
  async run({ artefact }, { artefact: definition, workspace, setArtefactValue }) {
    const parsed = definition.schema.safeParse(artefact);
    if (!parsed.success) {
      return { ok: false, errors: formatIssues(parsed.error), note: "Nothing was saved. Fix every error and send the full artefact again." };
    }
    const errors = (await definition.validate?.(parsed.data, workspace)) ?? [];
    if (errors.length) {
      return { ok: false, errors, note: "Nothing was saved. Fix every error and send the full artefact again." };
    }
    setArtefactValue(parsed.data);
    return { ok: true, note: "Saved and displayed to the user." };
  },
});
