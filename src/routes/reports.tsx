import { createFileRoute } from "@tanstack/react-router";
import { ReportPage } from "@/features/reports/report-page";

export const Route = createFileRoute("/reports")({
  ssr: false,
  component: ReportPage,
});
