type Directory = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
};
const handles = new Map<string, Directory>();
async function directoryStore<T>(
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("atelier-folders", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("folders");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction("folders", "readwrite");
    const request = action(tx.objectStore("folders"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Could not store the folder handle."));
    };
  });
}
export async function chooseDirectory() {
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (options: {
        mode: "readwrite";
      }) => Promise<Directory>;
    }
  ).showDirectoryPicker;
  if (!picker)
    throw new Error(
      "Folder selection requires desktop Chrome or Edge on localhost or HTTPS.",
    );
  const handle = await picker.call(window, { mode: "readwrite" });
  const keys = await directoryStore((store) => store.getAllKeys());
  let id = "";
  for (const key of keys) {
    const previous = await directoryStore<Directory>((store) => store.get(key));
    if (await previous.isSameEntry(handle)) {
      id = String(key);
      break;
    }
  }
  id ||= crypto.randomUUID();
  await directoryStore((store) => store.put(handle, id));
  handles.set(id, handle);
  return { id, name: handle.name };
}
export async function workspaceDirectory(folderId: string, authorize = false) {
  const handle =
    handles.get(folderId) ??
    (await directoryStore<Directory | undefined>((store) =>
      store.get(folderId),
    ));
  if (!handle) throw new Error("Choose a workspace folder.");
  handles.set(folderId, handle);
  const permission = authorize
    ? await handle.requestPermission({ mode: "readwrite" })
    : await handle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted")
    throw new Error("Use Grant access, then reload the table.");
  return handle;
}
