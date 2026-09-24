import { createCollection } from "@/lib/collection";
import { datasetSchema } from "./dataset-schema";

export const datasets = createCollection("datasets", datasetSchema);
