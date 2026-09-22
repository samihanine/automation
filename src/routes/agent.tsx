import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AgentPage } from "@/features/agent/agent-page";

export const Route = createFileRoute("/agent")({
  ssr: false,
  validateSearch: z.object({ c: z.string().optional() }),
  component: function AgentRoute() {
    const { c } = Route.useSearch();
    return <AgentPage conversationId={c} />;
  },
});
