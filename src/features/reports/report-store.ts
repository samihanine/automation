import { createCollection } from "@/lib/collection";
import { reportSchema } from "./report-schema";

export const reports = createCollection("reports", reportSchema);
