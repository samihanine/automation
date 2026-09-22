import { useSyncExternalStore } from "react";
import { artefacts } from "@/features/artefacts";
import {
  addConversationEvent,
  getConversation,
  updateConversation,
} from "@/features/conversations/update-conversation";
import { ANSWER_TOOL, findTool, formatIssues, toolCallSchema } from "@/features/tools";
import type { ToolCall } from "@/features/tools";
import { workspaceStore } from "@/features/workspaces/workspace-store";
import { createMessage, getLastMessage } from "@/lib/llm";
import { errorMessage } from "@/lib/utils";
import {
  MAX_STEPS,
  formatErrorPrompt,
  sessionStartPrompt,
  toolResultPrompt,
  userTurnPrompt,
} from "./agent-prompt";

const MAX_FORMAT_ERRORS = 3;

const runs = new Map<string, { controller: AbortController; step: number }>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function useAgentRun(conversationId: string | undefined) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (conversationId ? (runs.get(conversationId)?.step ?? null) : null),
    () => null,
  );
}

export function stopAgent(conversationId: string) {
  runs.get(conversationId)?.controller.abort();
}

function loadContext(conversationId: string) {
  const conversation = getConversation(conversationId);
  const workspace = workspaceStore.get(conversation.workspaceId);
  if (!workspace) throw new Error("The workspace of this conversation was deleted.");
  return { conversation, workspace, artefact: artefacts[conversation.artefactType] };
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return text.slice(start, index + 1);
  }
  return null;
}

export function parseToolCall(text: string): { ok: true; call: ToolCall } | { ok: false; reason: string } {
  const raw = extractJsonObject(text.replace(/```(?:json)?/gi, ""));
  if (!raw) return { ok: false, reason: "no JSON object found in your reply." };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    return { ok: false, reason: `invalid JSON (${errorMessage(error)}).` };
  }
  const parsed = toolCallSchema.safeParse(value);
  return parsed.success
    ? { ok: true, call: parsed.data }
    : { ok: false, reason: `wrong shape: ${formatIssues(parsed.error).join("; ")}.` };
}

export function startConversationAgent(conversationId: string) {
  const { conversation, workspace, artefact } = loadContext(conversationId);
  return runLoop(conversationId, sessionStartPrompt(artefact, workspace, conversation.artefact));
}

export function sendUserMessage(conversationId: string, message: string) {
  const { conversation, workspace, artefact } = loadContext(conversationId);
  addConversationEvent(conversationId, { kind: "user", text: message });
  if (conversation.events.every((event) => event.kind !== "user")) {
    updateConversation(conversationId, () => ({ title: message.slice(0, 60) }));
  }
  return runLoop(conversationId, userTurnPrompt(artefact, workspace, conversation.artefact, message));
}

async function runLoop(conversationId: string, firstPrompt: string) {
  if (runs.has(conversationId)) return;
  const run = { controller: new AbortController(), step: 0 };
  runs.set(conversationId, run);
  notify();

  const log = (event: Parameters<typeof addConversationEvent>[1]) => addConversationEvent(conversationId, event);
  let prompt = firstPrompt;
  let formatErrors = 0;
  let lastSignature = "";
  let lastReply = "";

  try {
    for (let attempt = 0; attempt < MAX_STEPS + MAX_FORMAT_ERRORS + 2; attempt++) {
      const { conversation, workspace, artefact } = loadContext(conversationId);
      const startedAt = Date.now();
      await createMessage(prompt, conversationId, conversation.model, run.controller.signal);
      lastReply = (await getLastMessage(conversationId))?.textContent ?? "";
      const parsed = parseToolCall(lastReply);

      if (!parsed.ok) {
        formatErrors++;
        log({ kind: "system", text: `Unreadable agent reply (${formatErrors}/${MAX_FORMAT_ERRORS}): ${parsed.reason}`, output: lastReply, model: conversation.model });
        if (formatErrors >= MAX_FORMAT_ERRORS) break;
        prompt = formatErrorPrompt(parsed.reason);
        continue;
      }

      const { call } = parsed;
      const tool = findTool(call.tool);
      if (!tool) {
        formatErrors++;
        log({ kind: "system", text: `Unknown tool "${call.tool}"`, input: call.input, model: conversation.model });
        if (formatErrors >= MAX_FORMAT_ERRORS) break;
        prompt = formatErrorPrompt(`unknown tool "${call.tool}".`);
        continue;
      }

      const input = tool.input.safeParse(call.input);
      if (!input.success) {
        const errors = formatIssues(input.error);
        log({ kind: "system", text: `Invalid input for ${tool.name}`, tool: tool.name, input: call.input, output: errors, model: conversation.model });
        prompt = toolResultPrompt(tool.name, { error: "Invalid input", errors }, ++run.step);
        notify();
        continue;
      }

      if (tool.name === ANSWER_TOOL) {
        const { message } = input.data as { message: string };
        log({ kind: "assistant", text: message, thought: call.thought, model: conversation.model, durationMs: Date.now() - startedAt });
        return;
      }

      run.step++;
      notify();
      const signature = `${tool.name}:${JSON.stringify(input.data)}`;
      const output =
        run.step > MAX_STEPS
          ? { error: `STEP_LIMIT reached: this call was not executed. Call ${ANSWER_TOOL} now.` }
          : signature === lastSignature
          ? { error: "Identical to your previous call. Use its result, change the input or answer the user." }
          : await tool
              .run(input.data, {
                workspace,
                artefact,
                getArtefactValue: () => getConversation(conversationId).artefact,
                setArtefactValue: (value) => updateConversation(conversationId, () => ({ artefact: value })),
              })
              .catch((error: unknown) => ({ error: errorMessage(error) }));
      lastSignature = signature;

      log({
        kind: "tool",
        text: summarize(tool.name, output),
        tool: tool.name,
        thought: call.thought,
        input: input.data,
        output,
        model: conversation.model,
        durationMs: Date.now() - startedAt,
      });

      if (run.controller.signal.aborted) throw new DOMException("Stopped", "AbortError");
      prompt = toolResultPrompt(tool.name, output, run.step);
    }

    log({
      kind: "assistant",
      text:
        formatErrors >= MAX_FORMAT_ERRORS && lastReply.trim() && !lastReply.trim().startsWith("{")
          ? lastReply
          : "I could not finish this request within the step limit. The artefact keeps its latest valid version — try rephrasing or splitting the request.",
    });
  } catch (error) {
    if (run.controller.signal.aborted) log({ kind: "system", text: "Stopped by the user." });
    else log({ kind: "error", text: errorMessage(error) });
  } finally {
    runs.delete(conversationId);
    notify();
  }
}

function summarize(tool: string, output: unknown) {
  const result = output as { error?: string; ok?: boolean; errors?: string[]; rowCount?: number };
  if (result.error) return `${tool} failed: ${result.error}`;
  if (tool === "update_artefact") {
    return result.ok ? "Artefact updated" : `Artefact rejected (${result.errors?.length ?? 0} errors)`;
  }
  if (tool === "run_dax_query") return `Query returned ${result.rowCount ?? 0} rows`;
  return tool;
}
