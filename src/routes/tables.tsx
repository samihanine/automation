import { createFileRoute } from "@tanstack/react-router";
import { TablesWorkspace } from "@/components/tables-workspace";
export const Route = createFileRoute("/tables")({
  component: () => (
    <div className="h-dvh bg-white font-sans text-sm text-[#333] [&_button]:cursor-pointer [&_button:disabled]:cursor-default [&_select]:cursor-pointer">
      <main className="flex h-full min-h-0 min-w-0 flex-col">
        <TablesWorkspace />
      </main>
    </div>
  ),
  head: () => ({ meta: [{ title: "Atelier · Tables" }] }),
});
