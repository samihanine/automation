const prefix = "agent:";

export function readLocal<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(prefix + key);
  return value ? JSON.parse(value) : fallback;
}
export function writeLocal(key: string, value: unknown) {
  localStorage.setItem(prefix + key, JSON.stringify(value));
}

export function download(
  data: BlobPart,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
