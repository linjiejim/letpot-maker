export const TRIPO_MESH_SCHEMA = "letpot-maker/tripo-mesh/v1" as const;
const DATABASE_NAME = "letpot-maker-local-meshes";
const DATABASE_VERSION = 1;
const STORE_NAME = "tripo-meshes";
const MAX_LOCAL_MESHES = 12;

export interface LocalTripoMeshMetadata {
  schema: typeof TRIPO_MESH_SCHEMA;
  id: string;
  createdAt: string;
  name: string;
  prompt: string;
  taskId: string;
  modelVersion: string;
  topperHeight: number;
  topperWidth: number;
  byteLength: number;
  meshCount: number;
  faceCount: number;
}

export interface LocalTripoMeshRecord extends LocalTripoMeshMetadata {
  glb: ArrayBuffer;
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local mesh database request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Local mesh database transaction was aborted."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Local mesh database transaction failed."));
  });
}

function openDatabase() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser does not support local mesh storage."));
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The local mesh database could not be opened."));
  });
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function finite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeLocalTripoMeshMetadata(value: unknown): LocalTripoMeshMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid local Tripo mesh metadata.");
  const input = value as Partial<LocalTripoMeshMetadata>;
  const id = text(input.id, 80);
  const createdAt = text(input.createdAt, 40);
  const taskId = text(input.taskId, 100);
  if (!id || !createdAt || !taskId || Number.isNaN(Date.parse(createdAt))) throw new Error("Incomplete local Tripo mesh metadata.");
  return {
    schema: TRIPO_MESH_SCHEMA,
    id,
    createdAt,
    name: text(input.name, 42) || "Tripo mesh",
    prompt: text(input.prompt, 640),
    taskId,
    modelVersion: text(input.modelVersion, 40),
    topperHeight: Math.min(100, Math.max(25, finite(input.topperHeight, 55))),
    topperWidth: Math.min(80, Math.max(20, finite(input.topperWidth, 45))),
    byteLength: Math.max(0, Math.round(finite(input.byteLength, 0))),
    meshCount: Math.max(1, Math.round(finite(input.meshCount, 1))),
    faceCount: Math.max(1, Math.round(finite(input.faceCount, 1))),
  };
}

export async function listLocalTripoMeshes(): Promise<LocalTripoMeshMetadata[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const records = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as LocalTripoMeshRecord[];
    await transactionDone(transaction);
    return records.flatMap((record) => {
      try {
        return [normalizeLocalTripoMeshMetadata(record)];
      } catch {
        return [];
      }
    }).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  } finally {
    database.close();
  }
}

export async function getLocalTripoMesh(id: string): Promise<LocalTripoMeshRecord | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(id)) as LocalTripoMeshRecord | undefined;
    await transactionDone(transaction);
    if (!record?.glb) return null;
    return { ...normalizeLocalTripoMeshMetadata(record), glb: record.glb };
  } finally {
    database.close();
  }
}

export async function putLocalTripoMesh(record: LocalTripoMeshRecord) {
  const metadata = normalizeLocalTripoMeshMetadata(record);
  if (!(record.glb instanceof ArrayBuffer) || !record.glb.byteLength) throw new Error("The generated GLB is empty.");
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({ ...metadata, byteLength: record.glb.byteLength, glb: record.glb });
    const all = await requestResult(store.getAll()) as LocalTripoMeshRecord[];
    all.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    for (const stale of all.slice(MAX_LOCAL_MESHES)) store.delete(stale.id);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function deleteLocalTripoMesh(id: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
