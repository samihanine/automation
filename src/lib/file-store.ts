import { del, get, set } from "idb-keyval";

export type StoredFile = { id: string; name: string; type: string; size: number; blob: Blob };

export async function saveFile(file: File) {
  const stored: StoredFile = { id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, blob: file };
  await set(`file:${stored.id}`, stored);
  return stored;
}

export const readFile = (id: string) => get<StoredFile>(`file:${id}`);

export const deleteFile = (id: string) => del(`file:${id}`);

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
