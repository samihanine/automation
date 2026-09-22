import { localCollection } from "@/lib/local-storage";
import { workspaceSchema } from "./workspace-schema";

export const workspaceStore = localCollection("workspaces", workspaceSchema);
