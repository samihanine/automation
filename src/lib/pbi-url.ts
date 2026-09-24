export const GUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function groupFromPath(path: string) {
  const group = new RegExp(`/groups/(${GUID}|me)`, "i").exec(path)?.[1];
  return group && group.toLowerCase() !== "me" ? group : null;
}
