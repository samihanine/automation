import { z } from "zod";
import { saveArtefact } from "./save-artefact";
import { defineTool } from "./tool-schema";

export const updateArtefactTool = defineTool({
  name: "update_artefact",
  available: (context) => Boolean(context.artefact),
  description:
    "Replaces the whole artefact. \"input\" IS the complete artefact object matching the artefact JSON schema (no wrapper). Use it to create the artefact or for large rewrites. Returns ok or the errors to fix.",
  input: z.record(z.string(), z.unknown()).describe("The complete artefact"),
  run: (input, context) => {
    const keys = Object.keys(input);
    const wrapped = keys.length === 1 && keys[0] === "artefact" && typeof input.artefact === "object";
    return saveArtefact(wrapped ? input.artefact : input, context);
  },
});
