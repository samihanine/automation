import { SheetIcon } from "lucide-react";
import { defineArtefact } from "../artefact-schema";
import { DisplayXlsxArtefact } from "./display-xlsx-artefact";
import { downloadXlsxArtefact } from "./download-xlsx-artefact";
import { xlsxArtefactPrompt } from "./xlsx-artefact-prompt";
import { xlsxArtefactSchema } from "./xlsx-artefact-schema";

export const xlsxBuilderArtefact = defineArtefact({
  type: "xlsx-builder",
  label: "Excel Builder",
  description: "Build workbooks from dataset queries or custom tables",
  icon: SheetIcon,
  schema: xlsxArtefactSchema,
  prompt: xlsxArtefactPrompt,
  initial: (workspace) => ({
    title: `${workspace.title} workbook`,
    sheets: [{ name: "Sheet1", columns: [], rows: [] }],
  }),
  render: DisplayXlsxArtefact,
  download: downloadXlsxArtefact,
});
