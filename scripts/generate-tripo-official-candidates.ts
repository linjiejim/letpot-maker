import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TripoClient, type Task } from "@vastai/tripo-sdk";
import {
  CHRISTMAS_TRIPO_CANDIDATES,
  TRIPO_CANDIDATE_CREDITS,
  TRIPO_CANDIDATE_FACE_LIMIT,
  TRIPO_IMAGE_CANDIDATE_CREDITS,
  buildTripoImageCandidateRequest,
  buildTripoCandidateRequest,
  type TripoCandidateInspection,
  type TripoCandidateManifestEntry,
  type TripoCandidateSpec,
} from "../lib/tripo-candidate";
import { TRIPO_BASE_URLS, validateTripoApiKey } from "../lib/tripo-protocol";
import { parseTripoGlb, TRIPO_LOCAL_MESH_FACE_LIMIT } from "../lib/tripo-mesh";
import { createModel, DEFAULT_OPTIONS, disposeObject } from "../lib/model-factory";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";

const DEFAULT_OUTPUT_DIR = path.resolve("tools/tripo-review/public/candidates");
const OUTPUT_DIR = path.resolve(process.env.TRIPO_CANDIDATE_DIR || DEFAULT_OUTPUT_DIR);
const MAX_MODEL_BYTES = 40 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

type Manifest = {
  schema: "letpot-maker/tripo-candidates/v1";
  updatedAt: string;
  candidates: TripoCandidateManifestEntry[];
};

function selectedCandidates() {
  const argument = process.argv.find((value) => value.startsWith("--ids="));
  if (!argument) return [...CHRISTMAS_TRIPO_CANDIDATES];
  const ids = new Set(argument.slice("--ids=".length).split(",").map((value) => value.trim()).filter(Boolean));
  const selected = CHRISTMAS_TRIPO_CANDIDATES.filter(({ id }) => ids.has(id));
  const missing = [...ids].filter((id) => !selected.some((candidate) => candidate.id === id));
  if (missing.length) throw new Error(`Unknown candidate id: ${missing.join(", ")}`);
  if (!selected.length) throw new Error("Choose at least one Tripo candidate id.");
  return selected;
}

function argumentValue(prefix: string) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length).trim();
}

function imageContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  throw new Error("Image candidate must be a PNG, JPEG or WebP file.");
}

function requestedImageFaceLimit() {
  const raw = argumentValue("--face-limit=");
  if (!raw) return TRIPO_CANDIDATE_FACE_LIMIT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1_000 || value > TRIPO_LOCAL_MESH_FACE_LIMIT) {
    throw new Error(`Local image candidate face limit must be between 1,000 and ${TRIPO_LOCAL_MESH_FACE_LIMIT.toLocaleString()}.`);
  }
  return value;
}

async function readManifest(): Promise<Manifest> {
  try {
    const parsed = JSON.parse(await readFile(path.join(OUTPUT_DIR, "manifest.json"), "utf8")) as Manifest;
    if (parsed.schema === "letpot-maker/tripo-candidates/v1" && Array.isArray(parsed.candidates)) return parsed;
  } catch {
    // A missing or incomplete local manifest starts a fresh review collection.
  }
  return { schema: "letpot-maker/tripo-candidates/v1", updatedAt: new Date(0).toISOString(), candidates: [] };
}

async function inspectCandidate(data: ArrayBuffer, spec: TripoCandidateSpec): Promise<TripoCandidateInspection> {
  const parsed = await parseTripoGlb(data, { maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT });
  const build = createModel({
    ...DEFAULT_OPTIONS,
    modelId: "sprout",
    connectionMode: "detachable",
    topperHeight: spec.topperHeight,
    topperWidth: spec.topperWidth,
    primaryColor: spec.color,
    faceted: false,
    externalMesh: parsed.object,
  });
  const topper = build.parts.find((part) => part.id === "topper")?.object;
  const mode = topper?.userData.externalMeshMountMode;
  let solid: Awaited<ReturnType<typeof solidifyObject>> | undefined;
  let manifoldValid = false;
  let manifoldError: string | undefined;
  try {
    if (!topper) throw new Error("The standard topper assembly is missing.");
    const manifold = await loadNodeManifold();
    solid = await solidifyObject(manifold, topper);
    manifoldValid = true;
  } catch (error) {
    manifoldError = error instanceof Error ? error.message.slice(0, 240) : "Unknown Manifold validation error";
  } finally {
    if (solid) disposeObject(solid);
    disposeObject(build.assembly);
    disposeObject(parsed.object);
  }
  return {
    meshCount: parsed.meshCount,
    faceCount: parsed.faceCount,
    mountMode: mode === "direct-socket" || mode === "reinforced-transition" ? mode : "unknown",
    manifoldValid,
    manifoldError,
    width: build.measurements.width,
    height: build.measurements.height,
    topperWidth: build.measurements.topperWidth,
    topperHeight: build.measurements.topperHeight,
  };
}

async function downloadPreview(task: Task, id: string) {
  const url = typeof task.output?.rendered_image_url === "string" ? task.output.rendered_image_url : "";
  if (!url) return undefined;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) return undefined;
  const contentType = response.headers.get("content-type") || "";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `${id}-provider-preview.${extension}`;
  await writeFile(path.join(OUTPUT_DIR, filename), Buffer.from(await response.arrayBuffer()));
  return filename;
}

async function generateCandidate(
  client: TripoClient,
  spec: TripoCandidateSpec,
  imagePath?: string,
  imageFaceLimit = TRIPO_CANDIDATE_FACE_LIMIT,
) {
  let request: ReturnType<typeof buildTripoCandidateRequest> | ReturnType<typeof buildTripoImageCandidateRequest>;
  let taskId: string;
  let inputImage: string | undefined;
  let expectedCredits = TRIPO_CANDIDATE_CREDITS;
  let generationMode: TripoCandidateManifestEntry["generationMode"] = "text-to-3d";
  if (imagePath) {
    const data = await readFile(imagePath);
    if (!data.byteLength || data.byteLength > MAX_IMAGE_BYTES) throw new Error("Image candidate must be between 1 byte and 20 MB.");
    const contentType = imageContentType(imagePath);
    const extension = path.extname(imagePath).toLowerCase();
    inputImage = `${spec.id}-input${extension}`;
    await writeFile(path.join(OUTPUT_DIR, inputImage), data);
    console.log(`[${spec.id}] uploading local image reference`);
    const uploaded = await client.uploadFile(data, { filename: path.basename(inputImage), contentType });
    request = buildTripoImageCandidateRequest(uploaded.file_token, spec.modelSeed, imageFaceLimit);
    expectedCredits = TRIPO_IMAGE_CANDIDATE_CREDITS;
    generationMode = "image-to-3d";
    console.log(`[${spec.id}] submitting Tripo v3.1 no-texture image candidate (${expectedCredits} expected credits)`);
    taskId = await client.imageToModel(request);
  } else {
    const textRequest = buildTripoCandidateRequest(spec);
    request = textRequest;
    console.log(`[${spec.id}] submitting Tripo v3.1 no-texture text candidate (${expectedCredits} expected credits)`);
    taskId = await client.textToModel(textRequest);
  }
  const task = await client.waitForTask(taskId, {
    pollingIntervalMs: 2_000,
    timeoutMs: 10 * 60_000,
    onProgress: (current) => console.log(`[${spec.id}] ${current.status} ${Math.round(current.progress || 0)}%`),
  });
  const downloaded = await client.downloadModel(task);
  if (!downloaded?.data.byteLength) throw new Error(`[${spec.id}] Tripo returned no downloadable mesh.`);
  if (downloaded.data.byteLength > MAX_MODEL_BYTES) throw new Error(`[${spec.id}] GLB exceeds the 40 MB local limit.`);
  const glb = `${spec.id}.glb`;
  await writeFile(path.join(OUTPUT_DIR, glb), Buffer.from(downloaded.data));
  const preview = await downloadPreview(task, spec.id);
  const inspection = await inspectCandidate(downloaded.data, spec);
  return {
    ...spec,
    taskId,
    modelVersion: String(request.model),
    expectedCredits,
    creditsConsumed: typeof task.credits_consumed === "number" ? task.credits_consumed : undefined,
    createdAt: new Date().toISOString(),
    glb,
    preview,
    byteLength: downloaded.data.byteLength,
    generationMode,
    inputImage,
    requestedFaceLimit: request.face_limit,
    inspection,
  } satisfies TripoCandidateManifestEntry;
}

async function main() {
  const apiKey = validateTripoApiKey(process.env.TRIPO_API_KEY || "");
  await mkdir(OUTPUT_DIR, { recursive: true });
  const client = new TripoClient({ apiKey, baseUrl: TRIPO_BASE_URLS.global, retries: 1, timeoutMs: 60_000 });
  const manifest = await readManifest();
  const selected = selectedCandidates();
  const imagePath = argumentValue("--image=");
  const imageFaceLimit = requestedImageFaceLimit();
  if (!imagePath && imageFaceLimit !== TRIPO_CANDIDATE_FACE_LIMIT) throw new Error("--face-limit is supported only together with --image.");
  if (imagePath && selected.length !== 1) throw new Error("Image-to-3D requires exactly one --ids candidate.");
  console.log(`Generating ${selected.length} local candidates in ${OUTPUT_DIR}`);
  for (const selectedSpec of selected) {
    const faceSuffix = imageFaceLimit === TRIPO_CANDIDATE_FACE_LIMIT ? "" : `-${Math.round(imageFaceLimit / 1_000)}k`;
    const spec = imagePath
      ? { ...selectedSpec, id: `${selectedSpec.id}-image${faceSuffix}`, name: `${selectedSpec.name} · image ${Math.round(imageFaceLimit / 1_000)}k` }
      : selectedSpec;
    const entry = await generateCandidate(client, spec, imagePath ? path.resolve(imagePath) : undefined, imageFaceLimit);
    manifest.candidates = [...manifest.candidates.filter(({ id }) => id !== entry.id), entry];
    manifest.updatedAt = new Date().toISOString();
    await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`[${spec.id}] saved ${entry.glb}; ${entry.inspection.faceCount} faces; ${entry.inspection.mountMode}; manifold=${entry.inspection.manifoldValid}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
