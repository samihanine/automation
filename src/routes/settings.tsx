import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SettingsPage } from "@/features/settings/settings-page";

export const Route = createFileRoute("/settings")({
  ssr: false,
  validateSearch: z.object({ error: z.enum(["ai-token"]).optional() }),
  component: function SettingsRoute() {
    const { error } = Route.useSearch();
    return <SettingsPage tokenError={error === "ai-token"} />;
  },
});
