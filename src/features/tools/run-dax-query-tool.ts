import { z } from "zod";
import { DaxError, daxRepairHint, isBlankResult, runDax, timeIntelligenceHint } from "@/lib/dax";
import type { Workspace } from "@/features/workspaces/workspace-schema";
import { defineTool } from "./tool-schema";

const MAX_ROWS = 50;

async function runOne(workspace: Workspace, query: string) {
  try {
    const result = await runDax(workspace.datasetConfig, query);
    const columnNames = result.columns.map((column) => column.name);
    return {
      rowCount: result.rowCount,
      columns: result.columns.map(({ name, type }) => ({ name, type })),
      rows: result.rows.slice(0, MAX_ROWS),
      truncated: result.rowCount > MAX_ROWS,
      note: isBlankResult(result.rows)
        ? "Every value is blank: check filters, relationships and column names."
        : timeIntelligenceHint(columnNames, result.rows.slice(0, 20)),
    };
  } catch (error) {
    if (!(error instanceof DaxError)) throw error;
    return { error: error.message, hint: daxRepairHint(error.message) };
  }
}

export const runDaxQueryTool = defineTool({
  name: "run_dax_query",
  description:
    "Runs 1 to 5 DAX queries on the workspace semantic model and returns, for each, the columns and the first 50 rows. Batch independent queries in one call. Use it to explore values and to get every number you show.",
  input: z.object({
    queries: z.array(z.string().min(1)).min(1).max(5).describe("DAX queries, each starting with EVALUATE or DEFINE"),
  }),
  async run({ queries }, { workspace }) {
    const results = await Promise.all(queries.map((query) => runOne(workspace, query)));
    return results.length === 1 ? results[0] : results;
  },
});
