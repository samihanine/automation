import type { z } from "zod";

const prefix = "agent:";

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  const value = localStorage.getItem(prefix + key);
  return value ? (JSON.parse(value) as T) : fallback;
}

export function writeLocal(key: string, value: unknown) {
  localStorage.setItem(prefix + key, JSON.stringify(value));
}

export function localCollection<T extends { id: string }>(
  key: string,
  schema: z.ZodType<T>,
) {
  const list = (): T[] =>
    readLocal<unknown[]>(key, []).flatMap((item) => {
      const parsed = schema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });

  return {
    list,
    get: (id: string) => list().find((item) => item.id === id),
    save(item: T) {
      const items = list();
      const index = items.findIndex((current) => current.id === item.id);
      if (index === -1) items.unshift(item);
      else items[index] = item;
      writeLocal(key, items);
      return item;
    },
    remove(id: string) {
      writeLocal(
        key,
        list().filter((item) => item.id !== id),
      );
    },
  };
}
