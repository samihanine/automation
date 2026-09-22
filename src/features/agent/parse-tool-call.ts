import { formatIssues, toolCallSchema } from "@/features/tools";
import type { ToolCall } from "@/features/tools";
import { errorMessage } from "@/lib/utils";

const closers: Record<string, string> = { "{": "}", "[": "]" };

function extractJson(text: string) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const stack: string[] = [];
  let inString = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{" || char === "[") stack.push(closers[char]);
    else if (char === "}" || char === "]") {
      stack.pop();
      if (stack.length === 0) return { json: text.slice(start, index + 1), repaired: false };
    }
  }
  return { json: `${text.slice(start)}${inString ? '"' : ""}${stack.reverse().join("")}`, repaired: true };
}

const removeTrailingCommas = (json: string) => json.replace(/,(\s*[}\]])/g, "$1");

function normalize(value: unknown) {
  if (typeof value !== "object" || value === null) return value;
  const call = value as Record<string, unknown>;
  let input = call.input ?? call.arguments ?? call.parameters ?? call.args;
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      input = undefined;
    }
  }
  return { thought: call.thought, tool: call.tool ?? call.name ?? call.function, input };
}

export type ParsedToolCall = { ok: true; call: ToolCall; repaired: boolean } | { ok: false; reason: string };

export function parseToolCall(text: string): ParsedToolCall {
  const extracted = extractJson(text.replace(/```(?:json)?/gi, ""));
  if (!extracted) return { ok: false, reason: "no JSON object found in your reply." };

  let value: unknown;
  let repaired = extracted.repaired;
  try {
    value = JSON.parse(extracted.json);
  } catch (error) {
    try {
      value = JSON.parse(removeTrailingCommas(extracted.json));
      repaired = true;
    } catch {
      return { ok: false, reason: `invalid JSON (${errorMessage(error)}).` };
    }
  }

  const parsed = toolCallSchema.safeParse(normalize(value));
  return parsed.success
    ? { ok: true, call: parsed.data, repaired }
    : { ok: false, reason: `wrong shape: ${formatIssues(parsed.error).join("; ")}.` };
}
