import { getEmbeddedReport } from "@/lib/pbi-client";
import { errorMessage } from "@/lib/utils";

const NO_DATA_TYPES = new Set(["textbox", "image", "shape", "basicShape", "actionButton", "pageNavigator", "bookmarkNavigator"]);
const MAX_LINES = 40;

export async function readReportData(reportId: string) {
  const report = getEmbeddedReport(reportId);
  if (!report) return { error: "The report is not displayed yet. Wait for it to load and try again." };
  const page = await report.getActivePage();
  const visuals = await page.getVisuals();
  const results = [];
  for (const visual of visuals) {
    if (NO_DATA_TYPES.has(visual.type) || visual.layout.displayState?.mode === 1) continue;
    try {
      const { data } = await visual.exportData(0, 200);
      const lines = data.trim().split(/\r?\n/);
      results.push({
        name: visual.name,
        title: visual.title,
        type: visual.type,
        data: lines.slice(0, MAX_LINES).join("\n"),
        ...(lines.length > MAX_LINES ? { truncated: `${lines.length - 1} rows, first ${MAX_LINES - 1} shown` } : {}),
      });
    } catch (error) {
      results.push({ name: visual.name, title: visual.title, type: visual.type, error: errorMessage(error) });
    }
  }
  return { page: { name: page.name, displayName: page.displayName }, visuals: results };
}
