import { useMutation, useQueryClient } from "@tanstack/react-query";
import { datasetPath, fetchSemanticModelStructure, powerBiRequest } from "@/lib/dax";
import { describeReport } from "@/lib/pbi-client";
import type {
  CreateWorkspaceInput,
  DatasetConfig,
  ReportConfig,
} from "./workspace-schema";
import { workspaceStore } from "./workspace-store";
import { workspacesQueryKey } from "./get-workspaces";

const GUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

function groupFromPath(path: string) {
  const group = new RegExp(`/groups/(${GUID}|me)`, "i").exec(path)?.[1];
  return group && group.toLowerCase() !== "me" ? group : null;
}

export function parseDatasetUrl(url: string) {
  const { pathname } = new URL(url);
  const datasetId = new RegExp(`/(?:datasets|semanticmodels)/(${GUID})`, "i").exec(
    pathname,
  )?.[1];
  if (!datasetId) throw new Error("No semantic model ID found in the URL.");
  return { datasetId, groupId: groupFromPath(pathname) };
}

export function parseReportUrl(url: string) {
  const parsed = new URL(url);
  const reportId =
    parsed.searchParams.get("reportId") ??
    new RegExp(`/reports/(${GUID})`, "i").exec(parsed.pathname)?.[1];
  if (!reportId) throw new Error("No report ID found in the URL.");
  const groupId = parsed.searchParams.get("groupId") ?? groupFromPath(parsed.pathname);
  const ctid = parsed.searchParams.get("ctid");
  const embedUrl = new URL("https://app.powerbi.com/reportEmbed");
  embedUrl.searchParams.set("reportId", reportId);
  if (groupId) embedUrl.searchParams.set("groupId", groupId);
  if (ctid) embedUrl.searchParams.set("ctid", ctid);
  return { reportId, groupId, embedUrl: embedUrl.toString() };
}

export async function buildDatasetConfig(url: string): Promise<DatasetConfig> {
  const target = parseDatasetUrl(url);
  const [dataset, structure] = await Promise.all([
    powerBiRequest<{ name: string; webUrl?: string; configuredBy?: string }>(
      datasetPath(target),
    ),
    fetchSemanticModelStructure(target),
  ]);
  return {
    url,
    ...target,
    name: dataset.name,
    webUrl: dataset.webUrl,
    configuredBy: dataset.configuredBy,
    structure,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildReportConfig(url: string): Promise<ReportConfig> {
  const parsed = parseReportUrl(url);
  const endpoint = parsed.groupId
    ? `/groups/${parsed.groupId}/reports/${parsed.reportId}`
    : `/reports/${parsed.reportId}`;
  const report = await powerBiRequest<{
    name: string;
    embedUrl: string;
    datasetId?: string;
  }>(endpoint).catch(() => null);
  const embedUrl = report?.embedUrl ?? parsed.embedUrl;
  const pages = await describeReport({ reportId: parsed.reportId, embedUrl });
  return {
    url,
    reportId: parsed.reportId,
    groupId: parsed.groupId,
    name: report?.name ?? "Power BI report",
    embedUrl,
    datasetId: report?.datasetId ?? null,
    pages,
    generatedAt: new Date().toISOString(),
  };
}

export async function createWorkspace(input: CreateWorkspaceInput) {
  const [datasetConfig, reportConfig] = await Promise.all([
    buildDatasetConfig(input.datasetUrl),
    buildReportConfig(input.reportUrl),
  ]);
  const now = new Date().toISOString();
  return workspaceStore.save({
    id: crypto.randomUUID(),
    title: datasetConfig.name,
    datasetConfig,
    datasetContext: "",
    reportConfig,
    reportContext: "",
    createdAt: now,
    updatedAt: now,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}
