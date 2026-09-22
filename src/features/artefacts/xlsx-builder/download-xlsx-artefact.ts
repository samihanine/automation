import { runDax } from "@/lib/dax";
import { sheetsToXlsx } from "@/lib/xlsx";
import { slugify } from "@/lib/utils";
import type { Workspace } from "@/features/workspaces/workspace-schema";
import type { XlsxArtefact } from "./xlsx-artefact-schema";
import { resolveXlsxSheet } from "./resolve-xlsx-sheet";

export async function downloadXlsxArtefact(value: XlsxArtefact, workspace: Workspace) {
  const sheets = await Promise.all(
    value.sheets.map(async (sheet) =>
      resolveXlsxSheet(
        sheet,
        sheet.query ? await runDax(workspace.datasetConfig, sheet.query) : undefined,
      ),
    ),
  );
  const blob = await sheetsToXlsx(sheets);
  return new File([blob], `${slugify(value.title)}.xlsx`, { type: blob.type });
}
