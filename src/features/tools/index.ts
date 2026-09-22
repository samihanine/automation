import { z } from "zod";
import { answerUserTool } from "./answer-user-tool";
import { runDaxQueryTool } from "./run-dax-query-tool";
import { updateArtefactTool } from "./update-artefact-tool";

export const tools = [runDaxQueryTool, updateArtefactTool, answerUserTool];

export const ANSWER_TOOL = answerUserTool.name;

export function findTool(name: string) {
  return tools.find((tool) => tool.name === name);
}

export function describeTools() {
  return tools
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
