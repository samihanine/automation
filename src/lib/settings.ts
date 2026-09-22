import { z } from "zod";
import { readLocal, writeLocal } from "./local-storage";
import { defaultModel, modelIds } from "./models";

export const settingsSchema = z.object({
  aiToken: z.string().default(""),
  defaultModel: z.enum(modelIds).default(defaultModel),
});

export type Settings = z.infer<typeof settingsSchema>;

export function readSettings(): Settings {
  return settingsSchema.parse(readLocal("settings", {}));
}

export function writeSettings(patch: Partial<Settings>) {
  const next = settingsSchema.parse({ ...readSettings(), ...patch });
  writeLocal("settings", next);
  return next;
}
