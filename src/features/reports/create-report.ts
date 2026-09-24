import { powerBiRequest } from "@/lib/dax";
import { describeReport } from "@/lib/pbi-client";
import { groupFromPath, GUID } from "@/lib/pbi-url";
import { reports } from "./report-store";

export function parseReportUrl(url: string) {
  const parsed = new URL(url);
  const reportId = parsed.searchParams.get("reportId") ?? new RegExp(`/reports/(${GUID})`, "i").exec(parsed.pathname)?.[1];
  if (!reportId) throw new Error("No report ID found in the URL.");
  const groupId = parsed.searchParams.get("groupId") ?? groupFromPath(parsed.pathname);
  const ctid = parsed.searchParams.get("ctid");
  const embedUrl = new URL("https://app.powerbi.com/reportEmbed");
  embedUrl.searchParams.set("reportId", reportId);
  if (groupId) embedUrl.searchParams.set("groupId", groupId);
  if (ctid) embedUrl.searchParams.set("ctid", ctid);
  return { reportId, groupId, embedUrl: embedUrl.toString() };
}

export async function createReport({ url, datasetId }: { url: string; datasetId: string }) {
  const parsed = parseReportUrl(url);
  const endpoint = parsed.groupId ? `/groups/${parsed.groupId}/reports/${parsed.reportId}` : `/reports/${parsed.reportId}`;
  const info = await powerBiRequest<{ name: string; embedUrl: string; datasetId?: string }>(endpoint).catch(() => null);
  const embedUrl = info?.embedUrl ?? parsed.embedUrl;
  const pages = await describeReport({ reportId: parsed.reportId, embedUrl });
  const now = new Date().toISOString();
  return reports.save({
    id: crypto.randomUUID(),
    name: info?.name ?? "Power BI report",
    config: {
      url,
      reportId: parsed.reportId,
      groupId: parsed.groupId,
      embedUrl,
      pbiDatasetId: info?.datasetId ?? null,
      pages,
      generatedAt: now,
    },
    context: "",
    datasetId,
    createdAt: now,
    updatedAt: now,
  });
}

export const useCreateReport = () => reports.useMutate(createReport);
