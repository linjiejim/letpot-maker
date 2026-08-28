import { ModelVersion, TripoClient, type Task } from "@vastai/tripo-sdk";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const TRIPO_BASE_URL = "https://openapi.tripo3d.ai/v3";
export const TRIPO_MODEL_OPTIONS = [
  { id: ModelVersion.H3_1, label: "Tripo v3.1 · balanced" },
  { id: ModelVersion.P1, label: "Tripo P1 · latest" },
] as const;

export type TripoModelVersion = typeof TRIPO_MODEL_OPTIONS[number]["id"];

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

const PRINTABLE_PROMPT_SUFFIX = [
  "Design this as a compact FDM-printable hydroponic pod topper.",
  "Use one connected watertight solid with a sturdy centered flat base, no floating pieces, no text, and no thin fragile details.",
  "Keep the object upright and centered; the mounting socket and adapter will be added separately.",
].join(" ");

const TERMINAL_ERROR_MESSAGE = "Tripo could not generate this mesh. Try a simpler printable shape.";

function cleanText(value: string, maxLength: number) {
  return value.replace(/[^\x20-\x7e\u00c0-\uffff]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function buildTripoPrompt(prompt: string) {
  const clean = cleanText(prompt, 640);
  if (clean.length < 3) throw new Error("Describe the mesh with at least three characters.");
  return `${clean}. ${PRINTABLE_PROMPT_SUFFIX}`.slice(0, 1024);
}

export function validateTripoApiKey(apiKey: string) {
  const clean = apiKey.trim();
  if (!/^tsk_[A-Za-z0-9_-]{8,}$/.test(clean)) {
    throw new Error("Enter a valid Tripo API key beginning with tsk_.");
  }
  return clean;
}

export function tripoErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return TERMINAL_ERROR_MESSAGE;
  if (error.name === "AbortError") return "Tripo generation was cancelled.";
  if (/^Enter a valid Tripo API key/i.test(error.message)) return error.message;
  if (/401|unauthor|api key|authentication/i.test(error.message)) return "Tripo rejected this API key. Check the key and its API credits.";
  if (/402|balance|credit|payment/i.test(error.message)) return "The Tripo account does not have enough API credits for this generation.";
  if (/429|limit|busy|rate/i.test(error.message)) return "Tripo is rate-limiting this key. Wait briefly and try again.";
  if (/timeout/i.test(error.message)) return "Tripo generation timed out before the mesh was ready. Try again.";
  if (/network|fetch|cors/i.test(error.message)) return "The browser could not reach Tripo directly. Check the network and Tripo API access for this key.";
  return TERMINAL_ERROR_MESSAGE;
}

export async function generateTripoMesh({
  apiKey,
  prompt,
  modelVersion,
  signal,
  onProgress,
}: {
  apiKey: string;
  prompt: string;
  modelVersion: TripoModelVersion;
  signal?: AbortSignal;
  onProgress?: (progress: number, task: Task) => void;
}): Promise<TripoGenerationResult> {
  const client = new TripoClient({
    apiKey: validateTripoApiKey(apiKey),
    baseUrl: TRIPO_BASE_URL,
    retries: 1,
    timeoutMs: 60_000,
  });
  const taskId = await client.textToModel({
    prompt: buildTripoPrompt(prompt),
    model: modelVersion,
    face_limit: 10_000,
    texture: false,
    pbr: false,
    quad: false,
    generate_parts: false,
  });
  if (!taskId) throw new Error("Tripo returned no task identifier.");

  const task = await client.waitForTask(taskId, {
    pollingIntervalMs: 2_000,
    timeoutMs: 10 * 60_000,
    signal,
    onProgress: (snapshot) => onProgress?.(Math.max(0, Math.min(100, snapshot.progress ?? 0)), snapshot),
  });
  const downloaded = await client.downloadModel(task);
  if (!downloaded?.data.byteLength) throw new Error("Tripo returned no downloadable mesh.");
  if (downloaded.data.byteLength > 40 * 1024 * 1024) throw new Error("The generated GLB exceeds the 40 MB local mesh limit.");
  return {
    taskId,
    modelVersion,
    data: downloaded.data,
    contentType: downloaded.contentType || "model/gltf-binary",
  };
}

export function parseTripoGlb(data: ArrayBuffer): Promise<ParsedTripoMesh> {
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
        reject(new Error("The downloaded GLB contains no usable triangle mesh."));
        return;
      }
      if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 1e-6)) {
        reject(new Error("The downloaded mesh has invalid dimensions."));
        return;
      }
      if (faceCount > 25_000) {
        reject(new Error("The downloaded mesh is too dense for the printable browser pipeline."));
        return;
      }
      object.name = "tripo_generated_source";
      resolve({ object, meshCount, faceCount });
    }, (error) => reject(error instanceof Error ? error : new Error("The generated GLB could not be parsed.")));
  });
}
