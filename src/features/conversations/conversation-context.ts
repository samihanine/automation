import { artefacts } from "@/features/artefacts";
import { datasets } from "@/features/datasets/dataset-store";
import { reports } from "@/features/reports/report-store";
import type { ConversationArtefact } from "./conversation-schema";

export function resolveContext(datasetId: string | undefined, artefact: ConversationArtefact | null) {
  const dataset = datasetId ? datasets.get(datasetId) : undefined;
  const report = artefact?.reportId ? reports.get(artefact.reportId) : undefined;
  return { dataset, report, definition: artefact ? artefacts[artefact.type] : undefined };
}
