import { z } from "zod";
import { saveArtefact } from "./save-artefact";
import { defineTool } from "./tool-schema";

const operationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set"), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("insert"), path: z.string(), value: z.unknown(), index: z.number().int().optional() }),
  z.object({ op: z.literal("remove"), path: z.string() }),
]);

type Container = Record<string, unknown> | unknown[];

function resolve(root: unknown, path: string) {
  const keys = path.split(".").filter(Boolean);
  const last = keys.pop();
  if (last === undefined) throw new Error("path cannot be empty");
  let parent = root;
  for (const key of keys) {
    if (typeof parent !== "object" || parent === null) throw new Error(`"${path}": "${key}" does not exist`);
    parent = (parent as Record<string, unknown>)[key];
  }
  if (typeof parent !== "object" || parent === null) throw new Error(`"${path}": parent does not exist`);
  return { parent: parent as Container, key: last };
}

function apply(root: unknown, operation: z.infer<typeof operationSchema>) {
  const { parent, key } = resolve(root, operation.path);
  if (operation.op === "set") {
    if (Array.isArray(parent)) parent[Number(key)] = operation.value;
    else parent[key] = operation.value;
    return;
  }
  if (operation.op === "remove") {
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else delete parent[key];
    return;
  }
  const list = Array.isArray(parent) ? parent[Number(key)] : parent[key];
  if (!Array.isArray(list)) throw new Error(`"${operation.path}" is not an array`);
  list.splice(operation.index ?? list.length, 0, operation.value);
}

export const editArtefactTool = defineTool({
  name: "edit_artefact",
  description:
    "Applies small changes to the current artefact without resending it. Paths use dots and array indexes, e.g. \"pages.0.visuals.2.title\". Ops: set (replace a value), insert (add \"value\" to the array at \"path\", at \"index\" or at the end), remove (delete a key or array item). The result is validated like update_artefact. Prefer it over update_artefact for edits.",
  input: z.object({ operations: z.array(operationSchema).min(1).max(20) }),
  async run({ operations }, context) {
    const draft = structuredClone(context.getArtefactValue());
    for (const [index, operation] of operations.entries()) {
      try {
        apply(draft, operation);
      } catch (error) {
        return { ok: false, errors: [`operation ${index}: ${error instanceof Error ? error.message : String(error)}`], note: "Nothing was saved." };
      }
    }
    return saveArtefact(draft, context);
  },
});
