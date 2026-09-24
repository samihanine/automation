import { z } from "zod";
import { answerUserTool } from "./answer-user-tool";
import { editArtefactTool } from "./edit-artefact-tool";
import { readReportTool } from "./read-report-tool";
import { runDaxQueryTool } from "./run-dax-query-tool";
import type { ToolContext } from "./tool-schema";
import { updateArtefactTool } from "./update-artefact-tool";

const allTools = [runDaxQueryTool, readReportTool, updateArtefactTool, editArtefactTool, answerUserTool];

export const ANSWER_TOOL = answerUserTool.name;

export const availableTools = (context: ToolContext) => allTools.filter((tool) => tool.available?.(context) ?? true);

export function describeTools(context: ToolContext) {
  return availableTools(context)
    .map((tool) =>
      [
        `## ${tool.name}`,
        tool.description,
        `Input JSON schema: ${JSON.stringify(z.toJSONSchema(tool.input, { io: "input", unrepresentable: "any" }))}`,
      ].join("\n"),
    )
    .join("\n\n");
}

export * from "./tool-schema";
