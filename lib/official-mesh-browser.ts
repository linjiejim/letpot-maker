import * as THREE from "three";
import { disposeObject, type ModelDefinition } from "./model-factory";
import {
  parseTripoGlb,
  TRIPO_LOCAL_MESH_FACE_LIMIT,
  type ParsedTripoMesh,
} from "./tripo-mesh";

const MAX_OFFICIAL_GLB_BYTES = 40 * 1024 * 1024;
const OFFICIAL_MESH_ASSET_REVISION = "meshopt-v1";

type OfficialMeshProgress = {
  loaded: number;
  total?: number;
  ratio?: number;
};

type OfficialMeshBufferEntry = {
  loaded: number;
  total?: number;
  listeners: Set<(progress: OfficialMeshProgress) => void>;
  promise: Promise<ArrayBuffer>;
};

const officialMeshBuffers = new Map<string, OfficialMeshBufferEntry>();
const officialMeshSources = new Map<string, Promise<ParsedTripoMesh>>();

function progressSnapshot(entry: OfficialMeshBufferEntry): OfficialMeshProgress {
  return {
    loaded: entry.loaded,
    total: entry.total,
    ratio: entry.total ? Math.min(1, entry.loaded / entry.total) : undefined,
  };
}

function notifyProgress(entry: OfficialMeshBufferEntry) {
  const snapshot = progressSnapshot(entry);
  entry.listeners.forEach((listener) => listener(snapshot));
}

async function readResponseBuffer(response: Response, entry: OfficialMeshBufferEntry) {
  const contentLength = Number(response.headers.get("Content-Length"));
  entry.total = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : undefined;
  if (!response.body) {
    const data = await response.arrayBuffer();
    entry.loaded = data.byteLength;
    entry.total ??= data.byteLength;
    notifyProgress(entry);
    return data;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    entry.loaded += value.byteLength;
    notifyProgress(entry);
    if (entry.loaded > MAX_OFFICIAL_GLB_BYTES) throw new Error("Bundled mesh has an invalid file size.");
  }
  if (!entry.loaded) throw new Error("Bundled mesh has an invalid file size.");
  entry.total ??= entry.loaded;
  notifyProgress(entry);
  const data = new Uint8Array(entry.loaded);
  let offset = 0;
  chunks.forEach((chunk) => {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return data.buffer;
}

function bufferKey(assetPath: string) {
  return `${assetPath}?v=${OFFICIAL_MESH_ASSET_REVISION}`;
}

async function getOfficialMeshBuffer(assetPath: string, onProgress?: (progress: OfficialMeshProgress) => void) {
  const key = bufferKey(assetPath);
  let entry = officialMeshBuffers.get(key);
  if (!entry) {
    entry = { loaded: 0, listeners: new Set(), promise: Promise.resolve(new ArrayBuffer(0)) };
    entry.promise = fetch(key, { cache: "force-cache" }).then(async (response) => {
      if (!response.ok) throw new Error(`Bundled mesh returned HTTP ${response.status}.`);
      const data = await readResponseBuffer(response, entry!);
      if (!data.byteLength || data.byteLength > MAX_OFFICIAL_GLB_BYTES) {
        throw new Error("Bundled mesh has an invalid file size.");
      }
      return data;
    });
    officialMeshBuffers.set(key, entry);
    void entry.promise.catch(() => {
      if (officialMeshBuffers.get(key) === entry) officialMeshBuffers.delete(key);
    });
  }

  if (onProgress) {
    entry.listeners.add(onProgress);
    onProgress(progressSnapshot(entry));
  }
  try {
    return await entry.promise;
  } finally {
    if (onProgress) entry.listeners.delete(onProgress);
  }
}

function cloneParsedMesh(source: ParsedTripoMesh): ParsedTripoMesh {
  const object = source.object.clone(true);
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry = child.geometry.clone();
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
  });
  return { object, meshCount: source.meshCount, faceCount: source.faceCount };
}

async function getOfficialMeshSource(
  definition: Pick<ModelDefinition, "id" | "name" | "officialMesh">,
  onProgress?: (progress: OfficialMeshProgress) => void,
) {
  const asset = definition.officialMesh;
  if (!asset) throw new Error(`${definition.name} has no bundled mesh asset.`);
  const key = bufferKey(asset.assetPath);
  const data = await getOfficialMeshBuffer(asset.assetPath, onProgress);
  let pending = officialMeshSources.get(key);
  if (!pending) {
    pending = parseTripoGlb(data.slice(0), { maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT }).then((parsed) => {
      if (parsed.faceCount !== asset.faceCount) {
        disposeObject(parsed.object);
        throw new Error(
          `Bundled mesh face count changed (${parsed.faceCount.toLocaleString()} instead of ${asset.faceCount.toLocaleString()}).`,
        );
      }
      parsed.object.name = `official_${definition.id}_source`;
      return parsed;
    });
    officialMeshSources.set(key, pending);
    void pending.catch(() => {
      if (officialMeshSources.get(key) === pending) officialMeshSources.delete(key);
    });
  }
  return pending;
}

export async function preloadOfficialMesh(
  definition: Pick<ModelDefinition, "id" | "name" | "officialMesh">,
) {
  if (!definition.officialMesh) return;
  await getOfficialMeshSource(definition);
}

export async function loadOfficialMesh(
  definition: Pick<ModelDefinition, "id" | "name" | "officialMesh">,
  options: { onProgress?: (progress: OfficialMeshProgress) => void } = {},
): Promise<ParsedTripoMesh> {
  return cloneParsedMesh(await getOfficialMeshSource(definition, options.onProgress));
}
