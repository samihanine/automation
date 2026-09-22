import { z } from "zod";
import type { ArtefactDefinition } from "@/features/artefacts";
import { ANSWER_TOOL, describeTools, tools } from "@/features/tools";
import { describeReportPages } from "@/features/artefacts/pbi-viewer/pbi-artefact-context";
import type { Workspace } from "@/features/workspaces/workspace-schema";

export const MAX_STEPS = 12;
const MAX_RESULT_CHARS = 12000;

const json = (value: unknown) => JSON.stringify(value);

const protocol = `You are an analytics agent inside a web app. You work in a loop: each reply you send is exactly ONE tool call. The app runs it and answers with a TOOL_RESULT message, then you send the next call. Your turn ends only when you call "${ANSWER_TOOL}".

RESPONSE FORMAT (mandatory)
- Reply with ONE JSON object and nothing else: no text before or after, no markdown fences, no comments.
- Shape: {"thought": "<one short sentence: why this call>", "tool": "<tool name>", "input": { <tool input> }}
- The JSON must be valid: double quotes, escaped quotes (\\") and newlines (\\n) inside strings, no trailing commas.
- Example: {"thought": "Check territories before filtering", "tool": "run_dax_query", "input": {"query": "EVALUATE VALUES('Store'[Territory])"}}

WORKFLOW
1. Understand the request. If it is ambiguous in a way that changes the result, ask a short question with ${ANSWER_TOOL}.
2. Explore with run_dax_query. Use the exact table, column and measure names of the dataset structure. Check values before filtering. Never invent numbers.
3. Change the artefact with update_artefact, always sending the COMPLETE artefact (everything you keep + your changes). If it returns errors, fix all of them and send it again.
4. Finish with ${ANSWER_TOOL}: a concise summary of what you did and the key insights, in the user's language. Do not paste the artefact JSON.

RULES
- One tool call per reply. Never repeat an identical call: reuse the previous result.
- At most ${MAX_STEPS} tool calls per user message: combine queries, do not over-explore.
- The current artefact state may contain manual changes from the user: keep them unless asked otherwise.
- If a tool keeps failing after 2 attempts, explain the problem with ${ANSWER_TOOL} instead of looping.
- DAX: start with EVALUATE (or DEFINE … EVALUATE), write 'Table'[Column], aggregate with SUMMARIZECOLUMNS, rank with TOPN, sort with ORDER BY, use existing measures when they exist.`;

export function workspaceContext(workspace: Workspace) {
  const { datasetConfig } = workspace;
  return `# WORKSPACE "${workspace.title}"

## Semantic model "${datasetConfig.name}" (id ${datasetConfig.datasetId})
${datasetConfig.structure || "(structure unavailable)"}

## Dataset business context (written by the user)
${workspace.datasetContext.trim() || "(none)"}

## Power BI report
${describeReportPages(workspace)}

## Report business context (written by the user)
${workspace.reportContext.trim() || "(none)"}`;
}

function artefactSection(artefact: ArtefactDefinition, workspace: Workspace, value: unknown) {
  return `# ARTEFACT: ${artefact.label} (${artefact.type})
${artefact.description}.

${artefact.prompt}
${artefact.context ? `\n${artefact.context(workspace)}\n` : ""}
## Artefact JSON schema (update_artefact input.artefact must match it)
${json(z.toJSONSchema(artefact.schema, { io: "input", unrepresentable: "any" }))}

# CURRENT ARTEFACT STATE
${json(value)}`;
}

function instructions(artefact: ArtefactDefinition, workspace: Workspace, value: unknown) {
  return `# INSTRUCTIONS
${protocol}

# TOOLS
${describeTools()}

${artefactSection(artefact, workspace, value)}`;
}

export function sessionStartPrompt(artefact: ArtefactDefinition, workspace: Workspace, value: unknown) {
  return `SESSION_START
This conversation is about the artefact "${artefact.label}". Everything below is the context you will rely on for the whole conversation.

${workspaceContext(workspace)}

${instructions(artefact, workspace, value)}

# TASK
The user has not written yet. Call ${ANSWER_TOOL} now (no other tool) with a short welcome in English: one sentence on what the dataset covers, then 3 concrete suggestions of what you can build with this artefact, as a bullet list.`;
}

export function userTurnPrompt(
  artefact: ArtefactDefinition,
  workspace: Workspace,
  value: unknown,
  message: string,
) {
  return `USER_TURN
${instructions(artefact, workspace, value)}

# USER MESSAGE
${message}

Reply with your first JSON tool call.`;
}

export function toolResultPrompt(tool: string, output: unknown, step: number) {
  const serialized = json(output);
  const body =
    serialized.length > MAX_RESULT_CHARS
      ? `${serialized.slice(0, MAX_RESULT_CHARS)}… [truncated, ${serialized.length} chars]`
      : serialized;
  const remaining = MAX_STEPS - step;
  return `TOOL_RESULT ${tool} (step ${step}/${MAX_STEPS})
${body}

${
  remaining <= 0
    ? `STEP_LIMIT reached: call ${ANSWER_TOOL} now with what you have and explain what is left.`
    : remaining <= 2
      ? `Only ${remaining} tool call(s) left: finish the artefact and call ${ANSWER_TOOL}.`
      : `Reply with your next JSON tool call, or ${ANSWER_TOOL} when the request is done.`
}`;
}

export function formatErrorPrompt(reason: string) {
  return `FORMAT_ERROR: ${reason}
Your reply must be ONLY one JSON object: {"thought": "...", "tool": "<name>", "input": {...}}.
Available tools: ${tools.map((tool) => tool.name).join(", ")}. Reply again now.`;
}
