import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ActiveTable, Folder, Structure } from "@/schema/tableSchema";
import { emptyStructure, readLocal, writeLocal } from "@/lib/local-storage";

type Workspace = {
  folder: Folder | null;
  schema: Structure;
  tables: ActiveTable[];
  ready: boolean;
  setFolder(folder: Folder): void;
  saveSchema(schema: Structure): void;
  saveWorkspace(schema: Structure, tables: ActiveTable[]): void;
};
const Context = createContext<Workspace | null>(null);
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace unavailable.");
  return value;
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [folder, setFolderState] = useState<Folder | null>(null);
  const [schema, setSchema] = useState(emptyStructure);
  const [tables, setTables] = useState<ActiveTable[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  function setFolder(next: Folder) {
    const legacy = readLocal<Array<ActiveTable & { sourceId?: string }>>(
      "tables",
      [],
    )
      .filter((t) => t.sourceId === next.id)
      .map(({ id, schemaId, name }) => ({ id, schemaId, name }));
    const saved = readLocal(`workspace:${next.id}`, {
      schema: legacy.length
        ? readLocal<Structure>("schema", emptyStructure)
        : emptyStructure,
      tables: legacy,
    });
    writeLocal("workspace-folder", next);
    setFolderState(next);
    setSchema(saved.schema);
    setTables(saved.tables);
  }
  useEffect(() => {
    try {
      const saved = readLocal<Folder | null>("workspace-folder", null);
      if (saved) setFolder(saved);
      setReady(true);
    } catch (e) {
      setError(String(e));
    }
  }, []);
  return (
    <Context.Provider
      value={{
        folder,
        schema,
        tables,
        ready,
        setFolder,
        saveWorkspace(nextSchema, nextTables) {
          if (!folder) return;
          writeLocal(`workspace:${folder.id}`, {
            schema: nextSchema,
            tables: nextTables,
          });
          setSchema(nextSchema);
          setTables(nextTables);
        },
        saveSchema(next) {
          if (!folder) return;
          writeLocal(`workspace:${folder.id}`, { schema: next, tables });
          setSchema(next);
        },
      }}
    >
      {error && (
        <div
          role="alert"
          className="border-b border-[#f1ddd6] bg-[#fff7f5] px-3 py-[7px] text-xs leading-relaxed text-[#a85b46]"
        >
          {error}
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function run(job: () => unknown | Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      return await job();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    run,
    notify: setNotice,
    feedback:
      error || notice ? (
        <div
          role={error ? "alert" : "status"}
          className={`border-b px-3 py-[7px] text-xs leading-relaxed ${error ? "border-[#f1ddd6] bg-[#fff7f5] text-[#a85b46]" : "border-[#eae3d4] bg-[#fbf9f3] text-[#8b774b]"}`}
        >
          {error || notice}
        </div>
      ) : null,
  };
}
