import { createFileRoute } from "@tanstack/react-router";
import { DatasetPage } from "@/features/datasets/dataset-page";

export const Route = createFileRoute("/datasets")({
  ssr: false,
  component: DatasetPage,
});
