import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  buildTripoPrompt,
  TRIPO_MODEL_OPTIONS,
  TRIPO_REGION_OPTIONS,
  validateTripoApiKey,
  type TripoModelVersion,
  type TripoRegion,
} from "./tripo-protocol";

export { buildTripoPrompt, TRIPO_MODEL_OPTIONS, TRIPO_REGION_OPTIONS, validateTripoApiKey };
export type { TripoModelVersion, TripoRegion };

export const TRIPO_LOCAL_BRIDGE_URL = "http://127.0.0.1:4318";
export const TRIPO_BROWSER_GENERATION_FACE_LIMIT = 25_000;
export const TRIPO_LOCAL_MESH_FACE_LIMIT = 100_000;

export interface TripoGenerationResult {
  taskId: string;
  modelVersion: TripoModelVersion;
  data: ArrayBuffer;
  contentType: string;
}

export interface ParsedTripoMesh {
  object: THREE.Group;
  meshCount: number;
  faceCount: number;
}

export interface ParseTripoGlbOptions {
  maxFaceCount?: number;
}

function disposeParsedObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

const TERMINAL_ERROR_MESSAGE = "Tripo could not generate this mesh. Try a simpler printable shape.";

export function tripoErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return TERMINAL_ERROR_MESSAGE;
  if (error.name === "AbortError") return "Tripo generation was cancelled.";
  if (/^Enter a valid Tripo API key/i.test(error.message)) return error.message;
  if (/401|unauthor|api key|authentication/i.test(error.message)) return "Tripo rejected this API key. Check the key and its API credits.";
  if (/402|balance|credit|payment/i.test(error.message)) return "The Tripo account does not have enough API credits for this generation.";
  if (/429|limit|busy|rate/i.test(error.message)) return "Tripo is rate-limiting this key. Wait briefly and try again.";
  if (/timeout/i.test(error.message)) return "Tripo generation timed out before the mesh was ready. Try again.";
  if (/local bridge/i.test(error.message)) return error.message;
  if (/network|fetch|cors/i.test(error.message)) return "The local Tripo bridge could not reach Tripo. Check this device's network or proxy.";
  return TERMINAL_ERROR_MESSAGE;
}

type BridgeTaskStatus = {
  taskId: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled" | "banned" | "expired" | "unknown";
  progress: number;
  error?: string;
};

async function bridgeJson<T>(path: string, body: object, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${TRIPO_LOCAL_BRIDGE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Local Tripo bridge is not running. Start `npm run tripo:bridge` on this device, then try again.");
  }
  const result = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(result.error || `Local Tripo bridge returned HTTP ${response.status}.`);
  return result;
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = window.setTimeout(finish, ms);
    const abort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Generation cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function generateTripoMesh({
  apiKey,
  prompt,
  modelVersion,
  region,
  signal,
  onProgress,
}: {
  apiKey: string;
  prompt: string;
  modelVersion: TripoModelVersion;
  region: TripoRegion;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}): Promise<TripoGenerationResult> {
  const request = { apiKey: validateTripoApiKey(apiKey), region };
  const created = await bridgeJson<{ taskId: string }>("/v1/tasks", {
    ...request,
    prompt,
    modelVersion,
  }, signal);
  const taskId = created.taskId;
  if (!taskId) throw new Error("Tripo returned no task identifier.");

  const startedAt = Date.now();
  for (;;) {
    const task = await bridgeJson<BridgeTaskStatus>("/v1/tasks/status", { ...request, taskId }, signal);
    onProgress?.(Math.max(0, Math.min(100, task.progress)));
    if (task.status === "success") break;
    if (["failed", "cancelled", "banned", "expired"].includes(task.status)) {
      throw new Error(task.error || `Tripo task ended with status ${task.status}.`);
    }
    if (Date.now() - startedAt > 10 * 60_000) throw new Error("Tripo generation timed out before the mesh was ready.");
    await wait(2_000, signal);
  }

  let response: Response;
  try {
    response = await fetch(`${TRIPO_LOCAL_BRIDGE_URL}/v1/tasks/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, taskId }),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Local Tripo bridge disconnected before the GLB download finished.");
  }
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(result.error || `Local Tripo bridge returned HTTP ${response.status}.`);
  }
  const data = await response.arrayBuffer();
  if (!data.byteLength) throw new Error("Tripo returned no downloadable mesh.");
  if (data.byteLength > 40 * 1024 * 1024) throw new Error("The generated GLB exceeds the 40 MB local mesh limit.");
  return {
    taskId,
    modelVersion,
    data,
    contentType: response.headers.get("Content-Type") || "model/gltf-binary",
  };
}

export function parseTripoGlb(
  data: ArrayBuffer,
  { maxFaceCount = TRIPO_BROWSER_GENERATION_FACE_LIMIT }: ParseTripoGlbOptions = {},
): Promise<ParsedTripoMesh> {
  if (!Number.isInteger(maxFaceCount) || maxFaceCount < 1) {
    return Promise.reject(new Error("The GLB face limit must be a positive integer."));
  }
  const signature = new TextDecoder().decode(new Uint8Array(data, 0, Math.min(4, data.byteLength)));
  if (signature !== "glTF") return Promise.reject(new Error("Tripo returned a model that is not a binary GLB."));

  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(data, "", (gltf) => {
      const object = gltf.scene;
      let meshCount = 0;
      let faceCount = 0;
      object.updateMatrixWorld(true);
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || !child.visible) return;
        const position = child.geometry.getAttribute("position");
        if (!position) return;
        meshCount += 1;
        faceCount += Math.floor((child.geometry.index?.count ?? position.count) / 3);
      });
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      if (!meshCount || !faceCount || bounds.isEmpty()) {
        disposeParsedObject(object);
        reject(new Error("The downloaded GLB contains no usable triangle mesh."));
        return;
      }
      if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 1e-6)) {
        disposeParsedObject(object);
        reject(new Error("The downloaded mesh has invalid dimensions."));
        return;
      }
      if (faceCount > maxFaceCount) {
        disposeParsedObject(object);
        reject(new Error("The downloaded mesh is too dense for the printable browser pipeline."));
        return;
      }
      object.name = "tripo_generated_source";
      resolve({ object, meshCount, faceCount });
    }, (error) => reject(error instanceof Error ? error : new Error("The generated GLB could not be parsed.")));
  });
}
