import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/features/workspaces/workspace-page";

export const Route = createFileRoute("/workspaces")({
  ssr: false,
  component: WorkspacePage,
});
