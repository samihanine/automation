export const modelIds = ["gpt-6-luna", "gpt-6-terra", "gpt-6-sol"] as const;
export type ModelId = (typeof modelIds)[number];
export const defaultModel: ModelId = "gpt-6-luna";

export const models: Record<ModelId, { label: string; description: string }> = {
  "gpt-6-luna": { label: "GPT-6 Luna", description: "Fast and light" },
  "gpt-6-terra": { label: "GPT-6 Terra", description: "Balanced" },
  "gpt-6-sol": { label: "GPT-6 Sol", description: "Most capable" },
};
