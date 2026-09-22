import { z } from "zod";
import { DaxError, daxRepairHint, isBlankResult, runDax, timeIntelligenceHint } from "@/lib/dax";
import { defineTool } from "./tool-schema";

const MAX_ROWS = 50;

export const runDaxQueryTool = defineTool({
  name: "run_dax_query",
  description:
    "Runs a DAX query on the workspace semantic model and returns columns and the first 50 rows. Use it to explore values and to get every number you show.",
  input: z.object({
    query: z.string().min(1).describe("DAX query, starting with EVALUATE or DEFINE"),
  }),
  async run({ query }, { workspace }) {
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
  },
});
