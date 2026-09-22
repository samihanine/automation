import { z } from "zod";
import type { ArtefactDefinition } from "@/features/artefacts";
import { ANSWER_TOOL, describeTools, tools } from "@/features/tools";
import { describeReportPages } from "@/features/artefacts/pbi-viewer/pbi-artefact-context";
import type { Workspace } from "@/features/workspaces/workspace-schema";

export const MAX_STEPS = 12;
const MAX_RESULT_CHARS = 12000;

const json = (value: unknown) => JSON.stringify(value);
const toolNames = tools.map((tool) => tool.name).join(" | ");

const replyFormat = `REPLY FORMAT: one JSON object only, starting with { and ending with }, nothing before or after:
{"thought": "<max 20 words>", "tool": "<${toolNames}>", "input": { ... }}`;

const protocol = `You are an analytics agent inside a web app. You work in a loop: each reply is exactly ONE tool call as a JSON object. The app runs the tool and sends back a TOOL_RESULT message, then you send the next call. Your turn ends only when you call "${ANSWER_TOOL}".

JSON RULES
- Output one JSON object and nothing else: no prose, no markdown fences, no comments.
- Double quotes everywhere. Escape " as \\" and line breaks as \\n inside strings. No trailing commas.
- Count your braces: every { and [ must be closed. Big objects are where mistakes happen: prefer several small edit_artefact calls to one huge update_artefact.
- Examples:
  {"thought": "Check the years available", "tool": "run_dax_query", "input": {"queries": ["EVALUATE VALUES('Time'[Year])"]}}
  {"thought": "Rename the chart", "tool": "edit_artefact", "input": {"operations": [{"op": "set", "path": "pages.0.visuals.1.title", "value": "Sales by region"}]}}
  {"thought": "Done", "tool": "${ANSWER_TOOL}", "input": {"message": "The report is ready: …"}}

WORKFLOW
1. If the request is ambiguous in a way that changes the result, ask one short question with ${ANSWER_TOOL}.
2. Explore with run_dax_query. Batch independent queries (up to 5) in one call. Use the exact table, column and measure names of the dataset structure. Check values before filtering. Never invent numbers.
3. Build the artefact: update_artefact to create it or rewrite it (input = the complete artefact), edit_artefact for targeted changes. If a tool returns errors, fix all of them in the next call.
4. Finish with ${ANSWER_TOOL}: a concise summary of what you built and the key figures, in the language of the user. Never paste the artefact JSON.

RULES
- One tool call per reply. Never repeat an identical call: reuse previous results.
- At most ${MAX_STEPS} tool calls per user message.
- The current artefact state may contain manual changes by the user: keep them unless asked otherwise.
- If a tool keeps failing after 2 attempts, explain the problem with ${ANSWER_TOOL}.
- DAX: start with EVALUATE (or DEFINE … EVALUATE), write 'Table'[Column], aggregate with SUMMARIZECOLUMNS, rank with TOPN, sort with ORDER BY, prefer existing measures.`;

function workspaceContext(workspace: Workspace) {
  const { datasetConfig } = workspace;
  return `# WORKSPACE "${workspace.title}"

## Semantic model "${datasetConfig.name}"
${datasetConfig.structure || "(structure unavailable)"}

## Dataset business context (written by the user)
${workspace.datasetContext.trim() || "(none)"}

## Power BI report
${describeReportPages(workspace)}

## Report business context (written by the user)
${workspace.reportContext.trim() || "(none)"}`;
}

function instructions(artefact: ArtefactDefinition, workspace: Workspace, value: unknown) {
  return `# INSTRUCTIONS
${protocol}

# TOOLS
${describeTools()}

# ARTEFACT: ${artefact.label}
${artefact.description}.

${artefact.prompt}
${artefact.context ? `\n${artefact.context(workspace)}\n` : ""}
## Artefact JSON schema (update_artefact input must match it)
${json(z.toJSONSchema(artefact.schema, { io: "input", unrepresentable: "any" }))}

# CURRENT ARTEFACT STATE
${json(value)}`;
}

export function userTurnPrompt({
  artefact,
  workspace,
  value,
  message,
  firstTurn,
}: {
  artefact: ArtefactDefinition;
  workspace: Workspace;
  value: unknown;
  message: string;
  firstTurn: boolean;
}) {
  return `${firstTurn ? `CONVERSATION START: the context below stays valid for the whole conversation.\n\n${workspaceContext(workspace)}\n\n` : "NEW USER MESSAGE: instructions and artefact state are refreshed below.\n\n"}${instructions(artefact, workspace, value)}

# USER MESSAGE
${message}

${replyFormat}`;
}

export function toolResultPrompt(tool: string, output: unknown, step: number) {
  const serialized = json(output);
  const body =
    serialized.length > MAX_RESULT_CHARS
      ? `${serialized.slice(0, MAX_RESULT_CHARS)}… [truncated, ${serialized.length} chars]`
      : serialized;
  const remaining = MAX_STEPS - step;
  const next =
    remaining <= 0
      ? `STEP_LIMIT reached: call ${ANSWER_TOOL} now with what you have and say what is left.`
      : remaining <= 2
        ? `Only ${remaining} tool call(s) left: finish and call ${ANSWER_TOOL}.`
        : `Next call, or ${ANSWER_TOOL} when the request is done.`;
  return `TOOL_RESULT ${tool} (step ${step}/${MAX_STEPS})
${body}

${next}
${replyFormat}`;
}

export function formatErrorPrompt(reason: string) {
  return `FORMAT_ERROR: your last reply could not be read: ${reason}
Nothing was executed. Send the call again as valid JSON. If it was large, split it: update_artefact with a smaller artefact first, then edit_artefact to add the rest.
${replyFormat}`;
}
