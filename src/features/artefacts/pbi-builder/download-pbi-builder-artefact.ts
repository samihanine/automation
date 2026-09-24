import { buildThinPbix } from "@/lib/pbix";
import { slugify } from "@/lib/utils";
import type { ArtefactContext } from "../artefact-schema";
import type { PbiBuilderArtefact } from "./pbi-builder-artefact-schema";
import { buildPbixLayout } from "./pbix-layout";

export async function downloadPbiBuilderArtefact(value: PbiBuilderArtefact, { dataset }: ArtefactContext) {
  const blob = buildThinPbix(buildPbixLayout(value), dataset.config.datasetId);
  return new File([blob], `${slugify(value.title)}.pbix`, { type: blob.type });
}
