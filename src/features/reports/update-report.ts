import { reports } from "./report-store";

type ReportPatch = { name: string; context: string; datasetId: string };

export function updateReport(id: string, patch: ReportPatch) {
  const report = reports.get(id);
  if (!report) throw new Error("Report not found");
  return reports.save({ ...report, ...patch, updatedAt: new Date().toISOString() });
}

export const useUpdateReport = () =>
  reports.useMutate(async ({ id, ...patch }: ReportPatch & { id: string }) => updateReport(id, patch));
