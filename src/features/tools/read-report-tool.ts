import { z } from "zod";
import { readReportData } from "@/features/artefacts/pbi-viewer/read-report";
import { defineTool } from "./tool-schema";

export const readReportTool = defineTool({
  name: "read_report",
  description:
    "Reads what the embedded report displays right now on its active page: for each visual, the data it shows as CSV (with every filter and slicer applied). Use it to verify the report state and to quote real figures.",
  available: (context) => context.artefact?.type === "pbi-viewer" && Boolean(context.report),
  input: z.object({}),
  run: async (_input, { report }) => (report ? readReportData(report.config.reportId) : { error: "No report open." }),
});
