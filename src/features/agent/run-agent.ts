import { useSyncExternalStore } from "react";
import { resolveContext } from "@/features/conversations/conversation-context";
import {
  addConversationEvent,
  getConversation,
  updateConversation,
} from "@/features/conversations/update-conversation";
import { ANSWER_TOOL, availableTools, formatIssues } from "@/features/tools";
import type { ToolContext } from "@/features/tools";
import { createMessage, getLastMessage, uploadFile } from "@/lib/llm";
import { errorMessage } from "@/lib/utils";
import { MAX_STEPS, formatErrorPrompt, toolResultPrompt, userTurnPrompt } from "./agent-prompt";
import { parseToolCall } from "./parse-tool-call";

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

function loadContext(conversationId: string): { conversation: ReturnType<typeof getConversation>; context: ToolContext } {
  const conversation = getConversation(conversationId);
  const { dataset, report, definition } = resolveContext(conversation.datasetId, conversation.artefact);
  if (!dataset) throw new Error("The dataset of this conversation was deleted. Select another one.");
  return {
    conversation,
    context: {
      dataset,
      report,
      artefact: definition,
      getArtefactValue: () => getConversation(conversationId).artefact?.value,
      setArtefactValue: (value) =>
        updateConversation(conversationId, ({ artefact }) => ({ artefact: artefact && { ...artefact, value } })),
    },
  };
}

export async function sendUserMessage(conversationId: string, message: string, files: File[] = []) {
  const { conversation, context } = loadContext(conversationId);
  const firstTurn = conversation.events.every((event) => event.kind !== "user");
  for (const file of files) {
    const stored = await uploadFile(file, conversationId);
    addConversationEvent(conversationId, {
      kind: "file",
      text: file.name,
      file: { id: stored.fileId ?? "", name: file.name, type: file.type },
    });
  }
  addConversationEvent(conversationId, { kind: "user", text: message });
  return runLoop(
    conversationId,
    userTurnPrompt({
      context,
      value: conversation.artefact?.value,
      message,
      firstTurn,
      attachments: files.map((file) => file.name),
    }),
  );
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
      const { conversation, context } = loadContext(conversationId);
      const startedAt = Date.now();
      await createMessage(prompt, conversationId, conversation.model, { signal: run.controller.signal, json: true });
      lastReply = (await getLastMessage(conversationId))?.textContent ?? "";
      const parsed = parseToolCall(lastReply);

      if (!parsed.ok) {
        formatErrors++;
        log({ kind: "system", text: `Unreadable agent reply (${formatErrors}/${MAX_FORMAT_ERRORS}): ${parsed.reason}`, output: lastReply, model: conversation.model });
        if (formatErrors >= MAX_FORMAT_ERRORS) break;
        prompt = formatErrorPrompt(context, parsed.reason);
        continue;
      }

      const { call } = parsed;
      if (parsed.repaired) {
        log({ kind: "system", text: "Agent reply had malformed JSON, repaired automatically", output: lastReply, model: conversation.model });
      }
      const tool = availableTools(context).find((item) => item.name === call.tool);
      if (!tool) {
        formatErrors++;
        log({ kind: "system", text: `Unknown tool "${call.tool}"`, input: call.input, model: conversation.model });
        if (formatErrors >= MAX_FORMAT_ERRORS) break;
        prompt = formatErrorPrompt(context, `unknown or unavailable tool "${call.tool}".`);
        continue;
      }

      const input = tool.input.safeParse(call.input);
      if (!input.success) {
        const errors = formatIssues(input.error);
        log({ kind: "system", text: `Invalid input for ${tool.name}`, tool: tool.name, input: call.input, output: errors, model: conversation.model });
        prompt = toolResultPrompt(context, tool.name, { error: "Invalid input", errors }, ++run.step);
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
              .run(input.data, context)
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
      prompt = toolResultPrompt(context, tool.name, output, run.step);
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
  if (Array.isArray(output)) {
    const failed = output.filter((result: { error?: string }) => result.error).length;
    return `Ran ${output.length} queries${failed ? ` (${failed} failed)` : ""}`;
  }
  const result = output as { error?: string; ok?: boolean; errors?: string[]; rowCount?: number };
  if (result.error) return `${tool} failed: ${result.error}`;
  if (tool === "update_artefact" || tool === "edit_artefact") {
    return result.ok ? (tool === "edit_artefact" ? "Artefact edited" : "Artefact updated") : `Artefact rejected (${result.errors?.length ?? 0} errors)`;
  }
  if (tool === "run_dax_query") return `Query returned ${result.rowCount ?? 0} rows`;
  if (tool === "read_report") return "Read the displayed report";
  return tool;
}
