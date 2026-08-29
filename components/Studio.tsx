"use client";

import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import JSZip from "jszip";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import {
  ADAPTER_STANDARD,
  buildAdapterStackCoupon,
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  getDefaultShapeParameters,
  getManufacturingProfile,
  MODEL_LIBRARY,
  MODEL_TAGS,
  STACK_TRIAL_GAPS,
  TOPPER_SIZE_LIMITS,
  type ModelBuild,
  type ModelDefinition,
  type ModelId,
  type ModelOptions,
  type ModelTag,
  type ManufacturingProfile,
  type ShapeParameterKey,
} from "../lib/model-factory";
import { loadBrowserManifold, solidifyObject } from "../lib/solidify";
import {
  BAMBU_PRINTERS,
  buildBambuThreeMf,
  type BambuPrinterId,
  type ThreeMfPart,
} from "../lib/three-mf";
import { normalizeAiRecipe, type AiDesignRecipe } from "../lib/ai-design";
import { AI_SCULPTURE_EXAMPLES } from "../lib/ai-shape-examples";
import {
  deleteLocalTripoMesh,
  getLocalTripoMesh,
  listLocalTripoMeshes,
  putLocalTripoMesh,
  TRIPO_MESH_SCHEMA,
  type LocalTripoMeshMetadata,
  type LocalTripoMeshRecord,
} from "../lib/local-mesh-cache";
import {
  generateTripoMesh,
  parseTripoGlb,
  TRIPO_LOCAL_MESH_FACE_LIMIT,
  TRIPO_MODEL_OPTIONS,
  TRIPO_REGION_OPTIONS,
  tripoErrorMessage,
  type ParsedTripoMesh,
  type TripoModelVersion,
  type TripoRegion,
} from "../lib/tripo-mesh";
import { loadOfficialMesh } from "../lib/official-mesh-browser";

type ViewName = "orbit" | "front" | "top";
type PanelName = "library" | "inspector";
type PanelWidths = Record<PanelName, number>;
type ViewportPalette = {
  background: string;
  fog: string;
  ground: string;
  hemisphereGround: string;
  fill: string;
};

const COLORS = ["#769567", "#294e35", "#a75f46", "#d3c5a5", "#d66c45"];
const DEFAULT_PANEL_WIDTHS = { library: 264, inspector: 336 } as const;
const PANEL_WIDTH_BOUNDS = {
  library: { min: 220, max: 380 },
  inspector: { min: 300, max: 440 },
} as const;
const MIN_STAGE_WIDTH = 420;
const MAX_LOCAL_GLB_BYTES = 40 * 1024 * 1024;
const DEFAULT_IMPORTED_TOPPER_SIZE = { width: 70, height: 100 } as const;
const ADAPTIVE_ENVIRONMENT_STORAGE_KEY = "letpot-maker:adaptive-environment:v1";
const DEFAULT_VIEWPORT_PALETTE: ViewportPalette = {
  background: "#f4f8f1",
  fog: "#f4f8f1",
  ground: "#3f4f42",
  hemisphereGround: "#5c6d5e",
  fill: "#c7ddd0",
};
const previewPaletteCache = new Map<string, Promise<ViewportPalette>>();
const TAG_LABELS: Record<ModelTag, string> = {
  lowpoly: "Low poly",
  realistic: "Realistic",
  veggie: "Veggie",
  herbs: "Herbs",
  tree: "Tree",
  fruit: "Fruit",
  flower: "Flower",
  animal: "Animal",
  christmas: "Christmas",
  plant: "Plant",
  space: "Space",
  insect: "Insect",
  ocean: "Ocean",
  holiday: "Holiday",
  pet: "Pet",
  other: "Other",
};

function modelPreviewPath(definition: ModelDefinition) {
  if (definition.officialMesh) return definition.officialMesh.previewPath;
  const collection = definition.style === "lowpoly" ? "lowpoly" : "procedural";
  return `/models/previews/${collection}/${definition.id}.jpg`;
}

function mixHex(first: string, second: string, amount: number) {
  return `#${new THREE.Color(first).lerp(new THREE.Color(second), amount).getHexString()}`;
}

function paletteFromColor(color: string): ViewportPalette {
  return {
    background: mixHex(color, "#ffffff", 0.86),
    fog: mixHex(color, "#ffffff", 0.8),
    ground: mixHex(color, "#26302a", 0.62),
    hemisphereGround: mixHex(color, "#3f4d43", 0.55),
    fill: mixHex(color, "#ffffff", 0.62),
  };
}

async function samplePreviewPalette(path: string, fallback: string) {
  let pending = previewPaletteCache.get(path);
  if (!pending) {
    pending = (async () => {
      const image = new Image();
      image.decoding = "async";
      image.src = path;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 40;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return paletteFromColor(fallback);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const cornerIndexes = [0, 39, 1560, 1599];
      const background = cornerIndexes.reduce((sum, pixel) => {
        const offset = pixel * 4;
        sum[0] += pixels[offset];
        sum[1] += pixels[offset + 1];
        sum[2] += pixels[offset + 2];
        return sum;
      }, [0, 0, 0]).map((value) => value / cornerIndexes.length);
      let red = 0;
      let green = 0;
      let blue = 0;
      let weight = 0;
      for (let pixel = 0; pixel < canvas.width * canvas.height; pixel += 1) {
        const offset = pixel * 4;
        if (pixels[offset + 3] < 32) continue;
        const distance = Math.hypot(
          pixels[offset] - background[0],
          pixels[offset + 1] - background[1],
          pixels[offset + 2] - background[2],
        );
        if (distance < 18) continue;
        const sampleWeight = Math.min(3, 0.5 + distance / 48);
        red += pixels[offset] * sampleWeight;
        green += pixels[offset + 1] * sampleWeight;
        blue += pixels[offset + 2] * sampleWeight;
        weight += sampleWeight;
      }
      if (weight < 24) return paletteFromColor(fallback);
      const sampled = new THREE.Color(red / weight / 255, green / weight / 255, blue / weight / 255);
      return paletteFromColor(`#${sampled.getHexString()}`);
    })().catch(() => paletteFromColor(fallback));
    previewPaletteCache.set(path, pending);
  }
  return pending;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function serializableModelOptions(options: ModelOptions) {
  const result = { ...options };
  delete result.externalMesh;
  return result;
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stlBlob(object: THREE.Object3D) {
  const result = new STLExporter().parse(object, { binary: true });
  const view = result as DataView;
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  return new Blob([Uint8Array.from(bytes).buffer], { type: "model/stl" });
}

function objBlob(object: THREE.Object3D) {
  return new Blob([new OBJExporter().parse(object)], { type: "text/plain" });
}

function ModelViewport({ build, view, modelKey, palette }: {
  build: ModelBuild;
  view: { name: ViewName; nonce: number };
  modelKey: string;
  palette: ViewportPalette;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const framedModelRef = useRef<string | null>(null);
  const extentRef = useRef(0);
  const centerRef = useRef(new THREE.Vector3());
  const viewDistanceRef = useRef(100);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f8f1");
    scene.fog = new THREE.Fog("#f4f8f1", 145, 240);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);
    camera.position.set(78, 58, 84);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 45;
    controls.maxDistance = 190;

    const hemisphere = new THREE.HemisphereLight("#fffdf5", DEFAULT_VIEWPORT_PALETTE.hemisphereGround, 2.5);
    hemisphere.name = "adaptive_hemisphere";
    scene.add(hemisphere);
    const key = new THREE.DirectionalLight("#fff4da", 4.8);
    key.position.set(52, 90, 62);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#c7ddd0", 1.7);
    fill.name = "adaptive_fill";
    fill.position.set(-55, 36, -38);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(100, 64),
      new THREE.ShadowMaterial({ color: "#3f4f42", opacity: 0.14 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    ground.name = "adaptive_ground";
    scene.add(ground);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      mount.removeChild(renderer.domElement);
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;
    scene.add(build.assembly);
    const bounds = new THREE.Box3().setFromObject(build.assembly);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z);
    const previousOffset = camera.position.clone().sub(controls.target);
    const modelChanged = framedModelRef.current !== modelKey;
    controls.target.copy(center);
    if (modelChanged || extentRef.current <= 0 || previousOffset.lengthSq() < 0.001) {
      const distance = extent * 2.25;
      camera.position.set(distance * 0.72, center.y + distance * 0.42, distance * 0.78);
    } else {
      const scale = THREE.MathUtils.clamp(extent / extentRef.current, 0.65, 1.6);
      camera.position.copy(center).add(previousOffset.multiplyScalar(scale));
    }
    camera.lookAt(center);
    controls.update();
    framedModelRef.current = modelKey;
    extentRef.current = extent;
    centerRef.current.copy(center);
    viewDistanceRef.current = extent * 2.4;
    return () => {
      scene.remove(build.assembly);
    };
  }, [build, modelKey]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const center = centerRef.current;
    const distance = viewDistanceRef.current;
    const positions: Record<ViewName, THREE.Vector3> = {
      orbit: new THREE.Vector3(distance * 0.7, center.y + distance * 0.45, distance * 0.76),
      front: new THREE.Vector3(0, center.y, distance),
      top: new THREE.Vector3(0.01, center.y + distance, 0),
    };
    camera.position.copy(positions[view.name]);
    controls.target.copy(center);
    camera.lookAt(center);
    controls.update();
  }, [view]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.background = new THREE.Color(palette.background);
    scene.fog = new THREE.Fog(palette.fog, 145, 240);
    const ground = scene.getObjectByName("adaptive_ground") as THREE.Mesh | undefined;
    const groundMaterial = ground?.material as THREE.ShadowMaterial | undefined;
    groundMaterial?.color.set(palette.ground);
    const hemisphere = scene.getObjectByName("adaptive_hemisphere") as THREE.HemisphereLight | undefined;
    hemisphere?.groundColor.set(palette.hemisphereGround);
    const fill = scene.getObjectByName("adaptive_fill") as THREE.DirectionalLight | undefined;
    fill?.color.set(palette.fill);
  }, [palette]);

  return <div className="viewport" ref={mountRef} role="img" aria-label="Interactive 3D preview of the selected printable model. Use the Orbit, Front, and Top buttons to change the view." data-environment-color={palette.background} />;
}

function Slider({ label, value, min, max, step = 1, unit = "mm", onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const precision = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <div className="control-group">
      <label><span>{label}</span><output>{value.toFixed(precision)}{unit ? ` ${unit}` : ""}</output></label>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="range-label"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

const AI_EXAMPLES = [
  "A tiny cottage with a pitched roof, chimney, door and two windows",
  "A friendly astronaut waving with a round helmet and sturdy boots",
  "A sliced pomegranate with a round shell, visible chunky seed clusters, and a leafy crown",
];

const AI_CREATION_STEPS = [
  "Reading the shape language",
  "Choosing a printable structure",
  "Balancing the silhouette",
  "Checking joints and proportions",
  "Compiling the bounded 3D model",
];

const TRIPO_CREATION_STEPS = [
  "Sending through the local device bridge",
  "Generating the neural mesh",
  "Checking the printable silhouette",
  "Downloading the short-lived GLB",
  "Saving the mesh on this device",
];

const AI_CREATIONS_STORAGE_KEY = "letpot-maker:ai-creations:v1";
const LEGACY_AI_CREATIONS_STORAGE_KEY = "letpot-garden-lab:ai-creations:v1";
const TRIPO_API_KEY_STORAGE_KEY = "letpot-maker:tripo-api-key:v1";

const AI_MANUFACTURING_PROFILE: ManufacturingProfile = {
  status: "Prototype study",
  orientation: "Body upright · connection mode selected in Studio",
  supportStrategy: "Automatic snug support; inspect the sliced preview",
  minWall: 1.2,
  minFeature: 1.2,
  batchMode: "Single prototype first",
  stackMode: "Adapter stack only",
  details: [
    "Every AI node is range-limited and fused to a connected support graph",
    "The locked adapter and embedded connection geometry are reused without AI modification",
    "Manifold export is checked automatically; visual detail and overhangs still need review",
  ],
};

const TRIPO_MANUFACTURING_PROFILE: ManufacturingProfile = {
  status: "Prototype study",
  orientation: "Mesh upright · standardized connection mode selected in Studio",
  supportStrategy: "Automatic snug support; inspect every island and overhang",
  minWall: 1.2,
  minFeature: 1.2,
  batchMode: "Single prototype first",
  stackMode: "Adapter stack only",
  details: [
    "The adapter, connector pin, socket core and mesh transition are code-owned standard components",
    "The downloaded neural mesh is scaled and cached only in this browser",
    "Export validates the mesh through Manifold; reject or simplify any non-watertight result",
  ],
};

type LocalAiCreation = {
  id: string;
  createdAt: string;
  prompt: string;
  recipe: AiDesignRecipe;
};

type ActiveAiDesign = AiDesignRecipe & { prompt: string; localId: string };

type ActiveTripoDesign = LocalTripoMeshMetadata;

function readLocalCreations(): LocalAiCreation[] {
  try {
    const stored = window.localStorage.getItem(AI_CREATIONS_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_AI_CREATIONS_STORAGE_KEY)
      ?? "[]";
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): LocalAiCreation[] => {
      if (!entry || typeof entry !== "object") return [];
      const candidate = entry as Partial<LocalAiCreation>;
      if (typeof candidate.id !== "string" || typeof candidate.prompt !== "string" || typeof candidate.createdAt !== "string") return [];
      try {
        return [{
          id: candidate.id.slice(0, 80),
          createdAt: candidate.createdAt,
          prompt: candidate.prompt.replace(/\s+/g, " ").trim().slice(0, 280),
          recipe: normalizeAiRecipe(candidate.recipe),
        }];
      } catch {
        return [];
      }
    }).slice(0, 24);
  } catch {
    return [];
  }
}

function AiGenerateModal({ open, onClose, onGenerated, onMeshGenerated }: {
  open: boolean;
  onClose: () => void;
  onGenerated: (recipe: AiDesignRecipe, prompt: string) => void;
  onMeshGenerated: (metadata: LocalTripoMeshMetadata, parsed: ParsedTripoMesh) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [generator, setGenerator] = useState<"recipe" | "tripo">("recipe");
  const [tripoApiKey, setTripoApiKey] = useState("");
  const [rememberTripoKey, setRememberTripoKey] = useState(false);
  const [tripoModel, setTripoModel] = useState<TripoModelVersion>(TRIPO_MODEL_OPTIONS[0].id);
  const [tripoRegion, setTripoRegion] = useState<TripoRegion>("global");
  const [tripoProgress, setTripoProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "creating" | "success" | "error">("idle");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const closeModal = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setStep(0);
    setTripoProgress(0);
    if (!rememberTripoKey) setTripoApiKey("");
    setError("");
    onClose();
  }, [onClose, rememberTripoKey]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      try {
        const storedKey = window.localStorage.getItem(TRIPO_API_KEY_STORAGE_KEY) ?? "";
        setTripoApiKey(storedKey.slice(0, 256));
        setRememberTripoKey(Boolean(storedKey));
      } catch {
        setTripoApiKey("");
        setRememberTripoKey(false);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || phase === "creating" || phase === "success") return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, phase]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const previousFocus = previousFocusRef.current;
      window.requestAnimationFrame(() => previousFocus?.focus());
      previousFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase !== "creating") closeModal();
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, phase, closeModal]);

  useEffect(() => {
    if (phase !== "creating" || generator !== "recipe") return;
    const timer = window.setInterval(() => setStep((current) => Math.min(current + 1, AI_CREATION_STEPS.length - 1)), 1750);
    return () => window.clearInterval(timer);
  }, [phase, generator]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!open) return null;

  const updateTripoApiKey = (nextKey: string) => {
    setTripoApiKey(nextKey);
    setError("");
    if (!rememberTripoKey) return;
    try {
      const cleanKey = nextKey.trim();
      if (cleanKey) window.localStorage.setItem(TRIPO_API_KEY_STORAGE_KEY, cleanKey);
      else window.localStorage.removeItem(TRIPO_API_KEY_STORAGE_KEY);
    } catch {
      setRememberTripoKey(false);
      setError("This browser blocked local Key storage. The Key will remain in memory only.");
    }
  };

  const updateTripoKeyPersistence = (remember: boolean) => {
    try {
      if (remember) {
        const cleanKey = tripoApiKey.trim();
        if (cleanKey) window.localStorage.setItem(TRIPO_API_KEY_STORAGE_KEY, cleanKey);
      } else {
        window.localStorage.removeItem(TRIPO_API_KEY_STORAGE_KEY);
      }
      setRememberTripoKey(remember);
      setError("");
    } catch {
      setRememberTripoKey(false);
      setError("This browser blocked local Key storage. The Key will remain in memory only.");
    }
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    const cleanPrompt = prompt.replace(/\s+/g, " ").trim();
    if (cleanPrompt.length < 3) {
      setError("Add a little more detail so the AI has something to shape.");
      setPhase("error");
      return;
    }
    setPhase("creating");
    setStep(0);
    setTripoProgress(0);
    setError("");
    const startedAt = Date.now();
    let unclaimedParsedMesh: ParsedTripoMesh | null = null;
    try {
      if (generator === "tripo") {
        const controller = new AbortController();
        abortRef.current = controller;
        const generated = await generateTripoMesh({
          apiKey: tripoApiKey,
          prompt: cleanPrompt,
          modelVersion: tripoModel,
          region: tripoRegion,
          signal: controller.signal,
          onProgress: (progress) => {
            setTripoProgress(progress);
            setStep(Math.min(2, Math.max(1, Math.ceil(progress / 45))));
          },
        });
        setStep(3);
        setTripoProgress(100);
        const parsed = await parseTripoGlb(generated.data.slice(0));
        unclaimedParsedMesh = parsed;
        setStep(4);
        const id = window.crypto.randomUUID();
        const title = cleanPrompt.split(/\s+/).slice(0, 6).join(" ");
        const metadata: LocalTripoMeshMetadata = {
          schema: TRIPO_MESH_SCHEMA,
          id,
          createdAt: new Date().toISOString(),
          name: title.length > 38 ? `${title.slice(0, 37)}…` : title,
          prompt: cleanPrompt,
          taskId: generated.taskId,
          modelVersion: generated.modelVersion,
          topperHeight: 55,
          topperWidth: 45,
          byteLength: generated.data.byteLength,
          meshCount: parsed.meshCount,
          faceCount: parsed.faceCount,
          source: "tripo",
        };
        const record: LocalTripoMeshRecord = { ...metadata, glb: generated.data };
        await putLocalTripoMesh(record);
        onMeshGenerated(metadata, parsed);
        unclaimedParsedMesh = null;
        if (!rememberTripoKey) setTripoApiKey("");
        abortRef.current = null;
      } else {
        const response = await fetch("/api/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: cleanPrompt }),
        });
        const result = await response.json() as { recipe?: AiDesignRecipe; error?: string };
        const remainingAnimation = Math.max(0, 2600 - (Date.now() - startedAt));
        if (remainingAnimation) await new Promise((resolve) => window.setTimeout(resolve, remainingAnimation));
        if (!response.ok || !result.recipe) throw new Error(result.error || "The AI provider returned an incomplete design.");
        onGenerated(result.recipe, cleanPrompt);
      }
      setPhase("success");
      window.setTimeout(closeModal, 900);
    } catch (requestError) {
      if (unclaimedParsedMesh) disposeObject(unclaimedParsedMesh.object);
      abortRef.current = null;
      const directMessage = requestError instanceof Error && /local|GLB|mesh|browser does not support/i.test(requestError.message)
        ? requestError.message
        : tripoErrorMessage(requestError);
      setError(generator === "tripo"
        ? directMessage
        : requestError instanceof Error ? requestError.message : "The model could not be generated.");
      setPhase("error");
    }
  };

  const creationSteps = generator === "tripo" ? TRIPO_CREATION_STEPS : AI_CREATION_STEPS;
  const progressWidth = generator === "tripo"
    ? Math.max(8, step >= 3 ? 88 + (step - 3) * 6 : tripoProgress * 0.78)
    : 18 + step * 17;

  return (
    <div className="ai-modal-backdrop">
      <section ref={dialogRef} className="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title" aria-busy={phase === "creating"} tabIndex={-1}>
        <button type="button" className="ai-close" aria-label="Close AI generator" onClick={closeModal} disabled={phase === "creating"}>×</button>
        {phase === "creating" || phase === "success" ? (
          <div className={`ai-creating ${phase === "success" ? "complete" : ""}`} aria-live="polite">
            <div className="ai-sculpture" aria-hidden="true">
              <span className="ai-core" />
              <span className="ai-leaf one" />
              <span className="ai-leaf two" />
              <span className="ai-leaf three" />
              <i className="ai-orbit one" />
              <i className="ai-orbit two" />
            </div>
            <p>{phase === "success" ? "MODEL READY" : generator === "tripo" ? "TRIPO · DIRECT MESH" : "AI · CREATING"}</p>
            <h2 id="ai-modal-title">{phase === "success" ? "Your idea is taking shape" : creationSteps[step]}</h2>
            <span>{phase === "success" ? "Opening the new 3D design…" : generator === "tripo" ? `${tripoProgress}% · Browser → local bridge → Tripo → local cache` : "Building within proven print-safe limits"}</span>
            <div className="ai-progress"><i style={{ width: phase === "success" ? "100%" : `${progressWidth}%` }} /></div>
          </div>
        ) : (
          <form onSubmit={generate} autoComplete="off">
            <div className="ai-generator-tabs" aria-label="Choose AI generation method">
              <button type="button" className={generator === "recipe" ? "active" : ""} aria-pressed={generator === "recipe"} onClick={() => { setGenerator("recipe"); setPrompt((current) => current.slice(0, 280)); setError(""); setPhase("idle"); }}>Bounded shape</button>
              <button type="button" className={generator === "tripo" ? "active" : ""} aria-pressed={generator === "tripo"} onClick={() => { setGenerator("tripo"); setError(""); setPhase("idle"); }}>Direct mesh · Tripo</button>
            </div>
            <div className="ai-modal-heading">
              <span className="ai-kicker">{generator === "tripo" ? "◈ CLIENT-SIDE MESH" : "✦ AI ASSISTED"}</span>
              <h2 id="ai-modal-title">{generator === "tripo" ? "Generate a neural 3D mesh" : "Generate a printable idea"}</h2>
              <p>{generator === "tripo"
                ? "Use your own Tripo API key to generate an untextured GLB through a loopback-only helper on this device, then add the same locked LetPot adapter, socket and connector used by standard designs."
                : "The configured AI turns your description into a bounded 3D shape program. It can compose new objects and characters while the solid pipeline locks the adapter, size, connections and print limits."}</p>
              <small>{generator === "tripo" ? "Typically 1–5 minutes · billed by Tripo" : "Usually 10–25 seconds"}</small>
            </div>
            {generator === "recipe" && <div className="ai-examples" aria-label="Example prompts">
              {AI_EXAMPLES.map((example) => <button type="button" key={example} onClick={() => { setPrompt(example); setError(""); setPhase("idle"); }}>{example}</button>)}
            </div>}
            {generator === "tripo" && <div className="tripo-settings">
              <label><span>Tripo API key</span><input type="password" aria-label="Tripo API key" autoComplete="off" spellCheck={false} maxLength={256} value={tripoApiKey} onChange={(event) => updateTripoApiKey(event.target.value)} placeholder="tsk_…" /></label>
              <label><span>Model</span><select aria-label="Tripo model version" value={tripoModel} onChange={(event) => setTripoModel(event.target.value as TripoModelVersion)}>{TRIPO_MODEL_OPTIONS.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>
              <label><span>API region</span><select aria-label="Tripo API region" value={tripoRegion} onChange={(event) => setTripoRegion(event.target.value as TripoRegion)}>{TRIPO_REGION_OPTIONS.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}</select></label>
              <label className="tripo-remember"><input type="checkbox" aria-label="Remember Tripo API key in this browser" checked={rememberTripoKey} onChange={(event) => updateTripoKeyPersistence(event.target.checked)} /><span><b>Remember Key in this browser</b><small>Optional · stored only for this site until you turn this off.</small></span></label>
              <p className="tripo-bridge-note"><b>Local helper required:</b> run <code>npm run tripo:bridge</code> on this device. It binds only to 127.0.0.1, keeps no Key or model history, and handles Tripo&apos;s browser CORS restriction.</p>
              <p className="tripo-cost-note"><b>Mesh-only billing:</b> v3.1 uses 10 credits; P1 uses 30. This flow keeps texture/PBR off, so it does not add Tripo&apos;s +10 standard, +20 detailed, or +30 extreme texture credits. <a href="https://platform.tripo3d.ai/docs/billing" target="_blank" rel="noreferrer">Current pricing ↗</a></p>
            </div>}
            <label className="ai-prompt-field">
              <span>Describe your model</span>
              <div>
                <input ref={inputRef} maxLength={generator === "tripo" ? 640 : 280} value={prompt} onChange={(event) => { setPrompt(event.target.value); setError(""); setPhase("idle"); }} placeholder={generator === "tripo" ? "e.g. A friendly low-poly otter with a sturdy round base" : "e.g. A tiny cottage with a roof, chimney and windows"} />
                <button type="submit">{generator === "tripo" ? "Generate mesh" : "Generate"} <span>→</span></button>
              </div>
            </label>
            {error && <p className="ai-error" role="alert">{error}</p>}
            <div className="ai-safety-note"><i>✓</i><span>{generator === "tripo" ? <><b>Never uploaded to the LetPot Maker server</b>The Key travels only browser → this device&apos;s loopback bridge → the selected Tripo region. The bridge holds request data in memory and stores nothing. By default the browser clears the Key on close; optional “Remember” uses this site&apos;s local storage. The GLB stays in local IndexedDB. <a href="https://platform.tripo3d.ai/api-keys" target="_blank" rel="noreferrer">Manage Tripo API keys ↗</a></> : <><b>Bounded geometry, locally organized</b>Your description is sent to the configured AI provider to create an allowlisted shape program—never executable mesh code. The finished recipe is cached in Mine on this device.</>}</span></div>
          </form>
        )}
      </section>
    </div>
  );
}

export function Studio() {
  const [options, setOptions] = useState<ModelOptions>(DEFAULT_OPTIONS);
  const [view, setView] = useState<{ name: ViewName; nonce: number }>({ name: "orbit", nonce: 0 });
  const [exporting, setExporting] = useState(false);
  const [printerId, setPrinterId] = useState<BambuPrinterId>("a1-mini");
  const [activeTag, setActiveTag] = useState<"all" | ModelTag>("all");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [libraryMode, setLibraryMode] = useState<"official" | "mine">("official");
  const [message, setMessage] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCreations, setAiCreations] = useState<LocalAiCreation[]>([]);
  const [aiDesign, setAiDesign] = useState<ActiveAiDesign | null>(null);
  const [tripoCreations, setTripoCreations] = useState<LocalTripoMeshMetadata[]>([]);
  const [tripoDesign, setTripoDesign] = useState<ActiveTripoDesign | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"preview" | "library" | "adjust">("preview");
  const [panelWidths, setPanelWidths] = useState<PanelWidths>({ ...DEFAULT_PANEL_WIDTHS });
  const [resizingPanel, setResizingPanel] = useState<PanelName | null>(null);
  const [adaptiveEnvironment, setAdaptiveEnvironment] = useState(false);
  const [sampledViewportPalette, setSampledViewportPalette] = useState<{ path: string; palette: ViewportPalette } | null>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const glbInputRef = useRef<HTMLInputElement>(null);
  const officialLoadRef = useRef(0);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const build = useMemo(() => createModel(options), [options]);
  useEffect(() => {
    const source = options.externalMesh;
    return () => {
      if (source) disposeObject(source);
    };
  }, [options.externalMesh]);
  const definition = MODEL_LIBRARY.find((item) => item.id === options.modelId) ?? MODEL_LIBRARY[0];
  const isAiSculpture = Boolean(aiDesign?.program && options.aiProgram);
  const isTripoMesh = Boolean(tripoDesign && options.externalMesh);
  const isOfficialMesh = Boolean(definition.officialMesh && options.externalMesh && !tripoDesign);
  const isExternalMesh = isTripoMesh || isOfficialMesh;
  const integrated = options.connectionMode === "integrated";
  const designParts = integrated ? 1 : isAiSculpture || isExternalMesh ? 3 : definition.parts;
  const designName = tripoDesign?.name ?? aiDesign?.name ?? definition.name;
  const designSubtitle = tripoDesign
    ? `${tripoDesign.source === "local-file" ? "Imported GLB" : "Direct Tripo mesh"} · ${tripoDesign.faceCount.toLocaleString()} faces · local only`
    : isOfficialMesh
      ? `${definition.subtitle} · ${definition.officialMesh!.faceCount.toLocaleString()} faces · bundled asset`
      : aiDesign?.subtitle ?? definition.subtitle;
  const detachablePrintNote = isTripoMesh
    ? "Print the socketed mesh upright with automatic snug supports. Neural meshes can contain thin walls, islands or non-manifold edges; validate the export and sliced preview before printing."
    : isOfficialMesh ? definition.printNote
    : isAiSculpture
    ? "Print the socketed sculpture upright with automatic snug supports. Inspect small color details and overhangs in the sliced preview before the first prototype."
    : definition.printNote;
  const designPrintNote = integrated
    ? `One-piece mode: print upright on the Ø33 locator face; the adapter and topper are fused by a hidden internal core. ${detachablePrintNote}`
    : detachablePrintNote;
  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();
  const visibleModels = useMemo(() => MODEL_LIBRARY.filter((item) => {
    const matchesTag = activeTag === "all" || item.tags.includes(activeTag);
    return matchesTag && (!normalizedLibraryQuery || item.name.toLowerCase().includes(normalizedLibraryQuery));
  }), [activeTag, normalizedLibraryQuery]);
  const mineCreations = useMemo(() => [
    ...tripoCreations.map((creation) => ({ kind: "tripo" as const, id: creation.id, createdAt: creation.createdAt, creation })),
    ...aiCreations.map((creation) => ({ kind: "ai" as const, id: creation.id, createdAt: creation.createdAt, creation })),
  ].sort((first, second) => second.createdAt.localeCompare(first.createdAt) || first.id.localeCompare(second.id)), [aiCreations, tripoCreations]);
  const visibleMineCreations = useMemo(() => mineCreations.filter((item) => {
    if (!normalizedLibraryQuery) return true;
    const title = item.kind === "tripo" ? item.creation.name : item.creation.recipe.name;
    return title.toLowerCase().includes(normalizedLibraryQuery);
  }), [mineCreations, normalizedLibraryQuery]);
  const activePreviewPath = aiDesign || tripoDesign ? undefined : modelPreviewPath(definition);
  const viewportModelKey = tripoDesign
    ? `tripo:${tripoDesign.id}`
    : aiDesign ? `ai:${aiDesign.localId}` : `official:${definition.id}`;
  const viewportPalette = useMemo(() => {
    if (!adaptiveEnvironment) return DEFAULT_VIEWPORT_PALETTE;
    if (!activePreviewPath) return paletteFromColor(options.primaryColor);
    return sampledViewportPalette?.path === activePreviewPath
      ? sampledViewportPalette.palette
      : paletteFromColor(options.primaryColor);
  }, [activePreviewPath, adaptiveEnvironment, options.primaryColor, sampledViewportPalette]);
  const baseManufacturing = isExternalMesh
    ? TRIPO_MANUFACTURING_PROFILE
    : isAiSculpture ? AI_MANUFACTURING_PROFILE : getManufacturingProfile(options.modelId);
  const manufacturing = integrated ? {
    ...baseManufacturing,
    orientation: "One-piece upright · Ø33 locator face on bed",
    batchMode: "Single-piece models · flat plate",
    details: [
      "The adapter and topper are fused through a hidden internal core",
      "No loose connector pin or exposed socket collar is generated",
      ...baseManufacturing.details,
    ],
  } : baseManufacturing;

  useEffect(() => () => disposeObject(build.assembly), [build]);

  useEffect(() => () => {
    if (options.externalMesh) disposeObject(options.externalMesh);
  }, [options.externalMesh]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setAdaptiveEnvironment(window.localStorage.getItem(ADAPTIVE_ENVIRONMENT_STORAGE_KEY) === "true");
      } catch {
        setAdaptiveEnvironment(false);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!adaptiveEnvironment || !activePreviewPath) return;
    let cancelled = false;
    void samplePreviewPalette(activePreviewPath, options.primaryColor).then((palette) => {
      if (!cancelled) setSampledViewportPalette({ path: activePreviewPath, palette });
    });
    return () => {
      cancelled = true;
    };
  }, [activePreviewPath, adaptiveEnvironment, options.primaryColor]);

  useEffect(() => {
    const load = () => {
      setAiCreations(readLocalCreations());
      void listLocalTripoMeshes().then(setTripoCreations).catch(() => setTripoCreations([]));
    };
    const frame = window.requestAnimationFrame(load);
    window.addEventListener("storage", load);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", load);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const search = new URLSearchParams(window.location.search);
      const requestedExample = search.get("ai-example");
      const example = AI_SCULPTURE_EXAMPLES.find((item) => item.slug === requestedExample);
      if (example) {
        const recipe = normalizeAiRecipe(example.recipe);
        const localId = `example-${example.slug}`;
        const creation: LocalAiCreation = {
          id: localId,
          createdAt: new Date().toISOString(),
          prompt: example.prompt,
          recipe,
        };
        setOptions((current) => ({
          ...current,
          modelId: recipe.templateId,
          topperHeight: recipe.topperHeight,
          topperWidth: recipe.topperWidth,
          primaryColor: recipe.primaryColor,
          accentColor: recipe.accentColor,
          secondaryColor: recipe.secondaryColor,
          detailColor: recipe.detailColor,
          faceted: recipe.faceted,
          shape: recipe.shape,
          aiProgram: recipe.program,
          externalMesh: undefined,
        }));
        setAiCreations((current) => [creation, ...current.filter((item) => item.id !== localId)]);
        setAiDesign({ ...recipe, prompt: example.prompt, localId });
        setTripoDesign(null);
        setLibraryMode("mine");
        setMessage(`${recipe.name} example loaded`);
        return;
      }
      const requestedModel = search.get("model");
      const selected = MODEL_LIBRARY.find((item) => item.id === requestedModel);
      if (!selected) return;
      chooseModel(selected.id);
      setLibraryMode("official");
      setActiveTag("all");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!message || exporting) return;
    const timer = window.setTimeout(() => setMessage(""), 3600);
    return () => window.clearTimeout(timer);
  }, [message, exporting]);

  const update = <K extends keyof ModelOptions>(key: K, value: ModelOptions[K]) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  const updateShape = (key: ShapeParameterKey, value: number) => {
    setOptions((current) => ({ ...current, shape: { ...current.shape, [key]: value } }));
  };

  const clampPanelWidth = useCallback((panel: PanelName, width: number, widths: PanelWidths) => {
    const bounds = PANEL_WIDTH_BOUNDS[panel];
    const workspaceWidth = workspaceRef.current?.getBoundingClientRect().width ?? Number.POSITIVE_INFINITY;
    const otherWidth = panel === "library" ? widths.inspector : widths.library;
    const availableMax = workspaceWidth - otherWidth - MIN_STAGE_WIDTH;
    return Math.round(Math.min(Math.max(width, bounds.min), Math.max(bounds.min, Math.min(bounds.max, availableMax))));
  }, []);

  const beginPanelResize = useCallback((panel: PanelName, event: ReactPointerEvent<HTMLElement>) => {
    if (window.matchMedia("(max-width: 1080px)").matches) return;
    event.preventDefault();
    resizeCleanupRef.current?.();
    const startX = event.clientX;
    const startWidths = panelWidths;
    setResizingPanel(panel);
    document.body.classList.add("studio-panel-resizing");

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const requestedWidth = panel === "library"
        ? startWidths.library + delta
        : startWidths.inspector - delta;
      setPanelWidths({
        ...startWidths,
        [panel]: clampPanelWidth(panel, requestedWidth, startWidths),
      });
    };
    const finish = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.classList.remove("studio-panel-resizing");
      setResizingPanel(null);
      resizeCleanupRef.current = null;
    };
    resizeCleanupRef.current = finish;
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }, [clampPanelWidth, panelWidths]);

  const nudgePanelWidth = useCallback((panel: PanelName, direction: -1 | 1) => {
    setPanelWidths((current) => {
      const delta = panel === "library" ? direction * 12 : direction * -12;
      return { ...current, [panel]: clampPanelWidth(panel, current[panel] + delta, current) };
    });
  }, [clampPanelWidth]);

  const handleResizerKeyDown = (panel: PanelName, event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      nudgePanelWidth(panel, event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  function chooseModel(modelId: ModelId) {
    const selected = MODEL_LIBRARY.find((item) => item.id === modelId);
    if (!selected) return;
    const loadId = officialLoadRef.current + 1;
    officialLoadRef.current = loadId;
    setOptions((current) => ({
      ...current,
      modelId,
      ...selected.defaults,
      faceted: selected.style === "lowpoly",
      shape: getDefaultShapeParameters(selected),
      aiProgram: undefined,
      externalMesh: undefined,
    }));
    setAiDesign(null);
    setTripoDesign(null);
    setMessage(selected.officialMesh ? `Loading bundled ${selected.name} mesh…` : `${selected.name} loaded`);
    setMobilePanel("preview");
    if (selected.officialMesh) {
      void loadOfficialMesh(selected).then((parsed) => {
        if (officialLoadRef.current !== loadId) {
          disposeObject(parsed.object);
          return;
        }
        setOptions((current) => current.modelId === selected.id
          ? { ...current, externalMesh: parsed.object }
          : current);
        setMessage(`${selected.name} official mesh loaded · ${parsed.faceCount.toLocaleString()} faces`);
      }).catch((error) => {
        if (officialLoadRef.current === loadId) {
          setMessage(error instanceof Error ? error.message : "The bundled official mesh could not be loaded");
        }
      });
    }
  }

  const persistCreations = (creations: LocalAiCreation[]) => {
    const next = creations.slice(0, 24);
    setAiCreations(next);
    try {
      window.localStorage.setItem(AI_CREATIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      setMessage("This browser could not save the local creation");
    }
  };

  const requestView = (name: ViewName) => setView((current) => ({ name, nonce: current.nonce + 1 }));

  const applyAiDesign = (recipe: AiDesignRecipe, prompt: string) => {
    officialLoadRef.current += 1;
    const localId = window.crypto.randomUUID();
    const creation: LocalAiCreation = { id: localId, createdAt: new Date().toISOString(), prompt, recipe };
    setOptions((current) => ({
      ...current,
      modelId: recipe.templateId,
      topperHeight: recipe.topperHeight,
      topperWidth: recipe.topperWidth,
      primaryColor: recipe.primaryColor,
      accentColor: recipe.accentColor,
      secondaryColor: recipe.secondaryColor,
      detailColor: recipe.detailColor,
      faceted: recipe.faceted,
      shape: recipe.shape,
      aiProgram: recipe.program,
      externalMesh: undefined,
    }));
    persistCreations([creation, ...aiCreations]);
    setAiDesign({ ...recipe, prompt, localId });
    setTripoDesign(null);
    setLibraryMode("mine");
    requestView("orbit");
    setMessage(`${recipe.name} generated and saved locally`);
    setMobilePanel("preview");
  };

  const chooseAiCreation = (creation: LocalAiCreation) => {
    officialLoadRef.current += 1;
    const recipe = normalizeAiRecipe(creation.recipe);
    setOptions((current) => ({
      ...current,
      modelId: recipe.templateId,
      topperHeight: recipe.topperHeight,
      topperWidth: recipe.topperWidth,
      primaryColor: recipe.primaryColor,
      accentColor: recipe.accentColor,
      secondaryColor: recipe.secondaryColor,
      detailColor: recipe.detailColor,
      faceted: recipe.faceted,
      shape: recipe.shape,
      aiProgram: recipe.program,
      externalMesh: undefined,
    }));
    setAiDesign({ ...recipe, prompt: creation.prompt, localId: creation.id });
    setTripoDesign(null);
    requestView("orbit");
    setMessage(`${recipe.name} loaded from this browser`);
    setMobilePanel("preview");
  };

  const applyTripoDesign = (metadata: LocalTripoMeshMetadata, parsed: ParsedTripoMesh, promote = true) => {
    officialLoadRef.current += 1;
    setOptions((current) => ({
      ...current,
      modelId: "sprout",
      topperHeight: metadata.topperHeight,
      topperWidth: metadata.topperWidth,
      faceted: false,
      shape: getDefaultShapeParameters(MODEL_LIBRARY[0]),
      aiProgram: undefined,
      externalMesh: parsed.object,
    }));
    if (promote) setTripoCreations((current) => [metadata, ...current.filter((item) => item.id !== metadata.id)]);
    setTripoDesign(metadata);
    setAiDesign(null);
    setLibraryMode("mine");
    requestView("orbit");
    setMessage(`${metadata.name} mesh saved only in this browser`);
    setMobilePanel("preview");
  };

  const chooseTripoCreation = async (metadata: LocalTripoMeshMetadata) => {
    setMessage(`Loading ${metadata.name} from this browser…`);
    try {
      const record = await getLocalTripoMesh(metadata.id);
      if (!record) throw new Error("This local mesh is no longer available.");
      const parsed = await parseTripoGlb(record.glb.slice(0), {
        maxFaceCount: metadata.source === "local-file" ? TRIPO_LOCAL_MESH_FACE_LIMIT : undefined,
      });
      applyTripoDesign(metadata, parsed, false);
      setMessage(`${metadata.name} loaded from this browser`);
    } catch (loadError) {
      setMessage(loadError instanceof Error ? loadError.message : "The local mesh could not be loaded");
    }
  };

  const importLocalGlb = async (file?: File) => {
    if (!file) return;
    setMessage(`Checking ${file.name} locally…`);
    let parsed: ParsedTripoMesh | null = null;
    try {
      if (!file.name.toLowerCase().endsWith(".glb")) throw new Error("Choose a binary .glb model file.");
      if (!file.size || file.size > MAX_LOCAL_GLB_BYTES) throw new Error("Local GLB must be between 1 byte and 40 MB.");
      const glb = await file.arrayBuffer();
      parsed = await parseTripoGlb(glb.slice(0), { maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT });
      const id = window.crypto.randomUUID();
      const baseName = file.name.replace(/\.glb$/i, "").trim() || "Imported GLB";
      const metadata: LocalTripoMeshMetadata = {
        schema: TRIPO_MESH_SCHEMA,
        id,
        createdAt: new Date().toISOString(),
        name: baseName.length > 42 ? `${baseName.slice(0, 41)}…` : baseName,
        prompt: `Imported locally from ${file.name}`,
        taskId: `local-file-${id}`,
        modelVersion: "local-glb",
        topperHeight: DEFAULT_IMPORTED_TOPPER_SIZE.height,
        topperWidth: DEFAULT_IMPORTED_TOPPER_SIZE.width,
        byteLength: glb.byteLength,
        meshCount: parsed.meshCount,
        faceCount: parsed.faceCount,
        source: "local-file",
      };
      await putLocalTripoMesh({ ...metadata, glb });
      applyTripoDesign(metadata, parsed);
      parsed = null;
      setMessage(`${metadata.name} imported locally · ${metadata.faceCount.toLocaleString()} faces`);
    } catch (error) {
      if (parsed) disposeObject(parsed.object);
      setMessage(error instanceof Error ? error.message : "The local GLB could not be imported");
    }
  };

  const removeTripoCreation = async (metadata: LocalTripoMeshMetadata) => {
    if (!window.confirm(`Remove “${metadata.name}” and its cached GLB from this browser?`)) return;
    try {
      await deleteLocalTripoMesh(metadata.id);
      setTripoCreations((current) => current.filter((item) => item.id !== metadata.id));
      if (tripoDesign?.id === metadata.id) {
        const selected = MODEL_LIBRARY[0];
        setOptions((current) => ({
          ...current,
          modelId: selected.id,
          ...selected.defaults,
          faceted: selected.style === "lowpoly",
          shape: getDefaultShapeParameters(selected),
          aiProgram: undefined,
          externalMesh: undefined,
        }));
        setTripoDesign(null);
        setLibraryMode("official");
      }
      setMessage(`${metadata.name} and its local GLB were removed`);
    } catch {
      setMessage("This browser could not remove the cached mesh");
    }
  };

  const removeAiCreation = (creation: LocalAiCreation) => {
    if (!window.confirm(`Remove “${creation.recipe.name}” from this browser?`)) return;
    persistCreations(aiCreations.filter((item) => item.id !== creation.id));
    if (aiDesign?.localId === creation.id) {
      setAiDesign(null);
      setLibraryMode("official");
    }
    setMessage(`${creation.recipe.name} removed from local creations`);
  };

  const resetShape = () => {
    setOptions((current) => ({ ...current, shape: getDefaultShapeParameters(definition) }));
    setMessage("Shape parameters reset");
  };

  const randomizeShape = () => {
    const shape = Object.fromEntries((definition.parameters ?? []).map((parameter) => {
      const steps = Math.round((parameter.max - parameter.min) / parameter.step);
      const value = parameter.min + Math.round(Math.random() * steps) * parameter.step;
      return [parameter.key, Number(value.toFixed(parameter.step < 0.1 ? 2 : 1))];
    })) as Partial<Record<ShapeParameterKey, number>>;
    setOptions((current) => ({ ...current, shape }));
    setMessage("Print-safe variation generated");
  };

  const savePreset = () => {
    const payload = JSON.stringify({ schema: "letpot-maker/model/v1", model: designName, aiDesign, tripoDesign, options: serializableModelOptions(options) }, null, 2);
    downloadBlob(new Blob([payload], { type: "application/json" }), `${options.modelId}-preset.json`);
    setMessage("Parameter preset saved");
  };

  const exportAssemblyObj = async () => {
    setExporting(true);
    setMessage("Solidifying assembly parts…");
    try {
      const wasm = await loadBrowserManifold();
      const assembly = new THREE.Group();
      for (const part of build.parts) {
        assembly.add(await solidifyObject(wasm, part.object, { normalize: false }));
      }
      downloadBlob(objBlob(assembly), `${slugify(designName)}-solid-assembly.obj`);
      disposeObject(assembly);
      setMessage("Solid assembly OBJ exported");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Solid export failed");
    } finally {
      setExporting(false);
    }
  };

  const exportPack = async () => {
    setExporting(true);
    setMessage("Building print pack…");
    try {
      const wasm = await loadBrowserManifold();
      const zip = new JSZip();
      const root = zip.folder(slugify(designName));
      if (!root) throw new Error("Could not create archive");
      const solidAssembly = new THREE.Group();
      for (const [index, part] of build.parts.entries()) {
        setMessage(`Solidifying ${part.label}…`);
        const solid = await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ });
        root.file(`${String(index + 1).padStart(2, "0")}-${part.id}.stl`, stlBlob(solid));
        const assemblyPart = await solidifyObject(wasm, part.object, { normalize: false });
        solidAssembly.add(assemblyPart);
        disposeObject(solid);
      }
      root.file(`${slugify(designName)}-solid-assembly.obj`, objBlob(solidAssembly));
      root.file("model-spec.json", JSON.stringify({
        schema: "letpot-maker/model/v1",
        model: { ...definition, name: designName, subtitle: designSubtitle },
        aiDesign,
        tripoDesign,
        options: serializableModelOptions(options),
        adapterStandard: ADAPTER_STANDARD,
        measurements: build.measurements,
        units: "millimetres",
        printConstraint: "Every exported part is one connected watertight manifold solid.",
        manufacturing,
        warning: "Fixed Ø33/Ø41 pod-fit standard. Verify fit with a small adapter test before production.",
      }, null, 2));
      root.file("PRINT-NOTES.txt", `${designName}\n\n${aiDesign ? `${aiDesign.creativeNote}\n\nGenerated from: ${aiDesign.prompt}\n\n` : tripoDesign ? tripoDesign.source === "local-file" ? `Imported from a local GLB. The source file stayed on this device.\n\n` : `Generated as a direct Tripo mesh from: ${tripoDesign.prompt}\nTask: ${tripoDesign.taskId}\nModel: ${tripoDesign.modelVersion}\nThe API key is not included in this export.\n\n` : ""}${designPrintNote}\n\nManufacturing status: ${manufacturing.status}.\nOrientation: ${manufacturing.orientation}.\nSupport: ${manufacturing.supportStrategy}.\nMinimum designed wall: ${manufacturing.minWall.toFixed(1)} mm.\nMinimum designed feature: ${manufacturing.minFeature.toFixed(1)} mm.\nBatch mode: ${manufacturing.batchMode}.\n\nEvery STL is a single connected, watertight solid. ${integrated ? "This export contains one fused adapter-and-topper part with no loose connector." : "The adapter and topper use a flush embedded socket plus a removable double-ended connector pin; mushroom and clover include one additional upper part."}\n\nAdapter standard: Ø${ADAPTER_STANDARD.lowerDiameter.toFixed(2)} mm straight lower section × ${ADAPTER_STANDARD.lowerHeight.toFixed(2)} mm, then a ${ADAPTER_STANDARD.transitionHeight.toFixed(2)} mm transition to a Ø${ADAPTER_STANDARD.upperDiameter.toFixed(2)} mm × ${ADAPTER_STANDARD.upperBandHeight.toFixed(2)} mm vertical upper band; total height ${ADAPTER_STANDARD.totalHeight.toFixed(2)} mm. ${integrated ? `Print the complete model upright with the Ø${ADAPTER_STANDARD.lowerDiameter.toFixed(2)} mm locator face on the bed.` : `The adapter STL is pre-oriented with its Ø${ADAPTER_STANDARD.upperDiameter.toFixed(2)} mm logo face on the print bed and its Ø${ADAPTER_STANDARD.lowerDiameter.toFixed(2)} mm side facing upward.`} Verify fit with a small test print before production.\n`);
      const archive = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBlob(archive, `${slugify(designName)}-print-pack.zip`);
      disposeObject(solidAssembly);
      setMessage("Print pack exported");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Solid export failed");
    } finally {
      setExporting(false);
    }
  };

  const exportBambuProject = async () => {
    setExporting(true);
    setMessage(`Preparing ${BAMBU_PRINTERS[printerId].name} project…`);
    const solids: THREE.Mesh[] = [];
    try {
      const wasm = await loadBrowserManifold();
      const projectParts: ThreeMfPart[] = [];
      for (const part of build.parts) {
        const solid = await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ });
        solids.push(solid);
        projectParts.push({
          name: part.label,
          mesh: solid,
          color: part.color,
          palette: part.palette,
        });
      }
      const project = await buildBambuThreeMf(projectParts, printerId, designName);
      downloadBlob(project, `${slugify(designName)}-${printerId}.3mf`);
      setMessage(`${BAMBU_PRINTERS[printerId].name} 3MF downloaded with support preset`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bambu 3MF export failed");
    } finally {
      solids.forEach((solid) => disposeObject(solid));
      setExporting(false);
    }
  };

  const exportStackTrial = async () => {
    setExporting(true);
    setMessage("Building adapter stack trials…");
    try {
      const wasm = await loadBrowserManifold();
      const zip = new JSZip();
      const root = zip.folder("adapter-stack-trial");
      if (!root) throw new Error("Could not create stack trial archive");
      for (const gap of STACK_TRIAL_GAPS) {
        const coupon = buildAdapterStackCoupon(options, gap, 3);
        const solid = await solidifyObject(wasm, coupon);
        const gapCode = Math.round(gap * 100).toString().padStart(2, "0");
        root.file(`adapter-stack-gap-${gapCode}.stl`, stlBlob(solid));
        disposeObject(solid);
        disposeObject(coupon);
      }
      root.file("README.txt", `LetPot adapter stack trial\n\nThree experimental 3-adapter coupons are included with 0.24, 0.32 and 0.40 mm vertical release gaps. Each interface uses three tapered breakaway bridges, keeping every STL one connected manifold solid.\n\nStart with 0.40 mm using the same printer, nozzle, material and layer profile planned for production. Reduce the gap only after the adapters separate cleanly. Inspect the lower face and remove the three small bridge marks before fit testing.\n\nFixed adapter standard: Ø${ADAPTER_STANDARD.lowerDiameter.toFixed(2)} mm × ${ADAPTER_STANDARD.lowerHeight.toFixed(2)} mm lower section / Ø${ADAPTER_STANDARD.lowerDiameter.toFixed(2)}→Ø${ADAPTER_STANDARD.upperDiameter.toFixed(2)} mm × ${ADAPTER_STANDARD.transitionHeight.toFixed(2)} mm transition / Ø${ADAPTER_STANDARD.upperDiameter.toFixed(2)} mm × ${ADAPTER_STANDARD.upperBandHeight.toFixed(2)} mm vertical upper band / ${ADAPTER_STANDARD.totalHeight.toFixed(2)} mm total height.\n`);
      root.file("stack-spec.json", JSON.stringify({
        schema: "letpot-maker/stack-trial/v1",
        adapter: ADAPTER_STANDARD,
        adaptersPerCoupon: 3,
        gaps: STACK_TRIAL_GAPS,
        bridgeCount: 3,
        status: "experimental",
      }, null, 2));
      const archive = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBlob(archive, "letpot-adapter-stack-trial.zip");
      setMessage("Adapter stack trials exported");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stack trial export failed");
    } finally {
      setExporting(false);
    }
  };

  const exportAll = async () => {
    setExporting(true);
    setMessage("Preparing the complete collection…");
    try {
      const wasm = await loadBrowserManifold();
      const zip = new JSZip();
      const root = zip.folder("letpot-maker-collection");
      if (!root) throw new Error("Could not create collection archive");
      const manifest: Array<{ id: ModelId; name: string; series: string; tags: ModelTag[]; stlParts: string[]; bambuProject: string; manufacturingStatus: string }> = [];
      let adapterWritten = false;

      for (const [modelIndex, modelDefinition] of MODEL_LIBRARY.entries()) {
        setMessage(`Packing ${modelIndex + 1} / ${MODEL_LIBRARY.length}: ${modelDefinition.name}`);
        const officialSource = modelDefinition.officialMesh ? await loadOfficialMesh(modelDefinition) : null;
        const modelOptions: ModelOptions = {
          ...DEFAULT_OPTIONS,
          modelId: modelDefinition.id,
          ...modelDefinition.defaults,
          faceted: modelDefinition.style === "lowpoly",
          shape: getDefaultShapeParameters(modelDefinition),
          externalMesh: officialSource?.object,
        };
        const modelBuild = createModel(modelOptions);
        const solids: THREE.Mesh[] = [];
        const projectParts: ThreeMfPart[] = [];
        const stlParts: string[] = [];
        try {
          for (const [partIndex, part] of modelBuild.parts.entries()) {
            const solid = await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ });
            solids.push(solid);
            projectParts.push({ name: part.label, mesh: solid, color: part.color });
            if (part.id === "adapter") {
              if (!adapterWritten) {
                root.file("stl/00-universal-adapter-33x41.stl", stlBlob(solid));
                adapterWritten = true;
              }
            } else {
              const stlPath = `stl/${modelDefinition.number}-${modelDefinition.id}/${String(partIndex).padStart(2, "0")}-${part.id}.stl`;
              root.file(stlPath, stlBlob(solid));
              stlParts.push(stlPath);
            }
          }
          const projectPath = `bambu-${printerId}/${modelDefinition.number}-${modelDefinition.id}-${printerId}.3mf`;
          const project = await buildBambuThreeMf(projectParts, printerId, modelDefinition.name);
          root.file(projectPath, await project.arrayBuffer());
          manifest.push({
            id: modelDefinition.id,
            name: modelDefinition.name,
            series: modelDefinition.series,
            tags: modelDefinition.tags,
            stlParts,
            bambuProject: projectPath,
            manufacturingStatus: getManufacturingProfile(modelDefinition.id).status,
          });
        } finally {
          solids.forEach((solid) => disposeObject(solid));
          disposeObject(modelBuild.assembly);
          if (officialSource) disposeObject(officialSource.object);
        }
      }

      const printer = BAMBU_PRINTERS[printerId];
      root.file("manifest.json", JSON.stringify({
        schema: "letpot-maker/collection/v2",
        targetPrinter: printer,
        adapter: { ...ADAPTER_STANDARD, units: "millimetres" },
        models: manifest,
        printConstraint: "Every STL part is one connected watertight manifold solid.",
      }, null, 2));
      root.file("README.txt", `LetPot Maker — complete printable collection\n\nTarget handoff: ${printer.name}, ${printer.nozzle.toFixed(1)} mm nozzle, ${printer.bedWidth} × ${printer.bedDepth} mm plate.\n\nThe stl folder contains one shared fixed Ø33/Ø41 mm adapter plus every detachable connector pin and topper part. Its Ø33 mm straight section is 3.1 mm high, followed by a 2.3 mm transition to Ø41 mm and a 0.2 mm-high Ø41 mm vertical upper band, for a 5.6 mm total height. The shared adapter is pre-oriented with its Ø41 mm logo face on the print bed and its Ø33 mm side facing upward. The bambu-${printerId} folder contains one print-ready 3MF project per design, already arranged inside the selected printer plate.\n\nAutomatic normal/snug support, a 30 degree threshold and a 4 mm outer brim are embedded in every Bambu project. Confirm the printer, build plate and filament, inspect the sliced preview, then send.\n`);
      const archive = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      downloadBlob(archive, `letpot-maker-collection-${printerId}.zip`);
      setMessage(`All ${MODEL_LIBRARY.length} designs exported for ${printer.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Collection export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="studio-shell">
      <h1 className="sr-only">LetPot Maker Studio: customize and export printable 3D accessories</h1>
      <a className="skip-link studio-skip-link" href="#studio-workspace">Skip to Studio workspace</a>
      <header className="topbar">
        <a className="brand" href="/" aria-label="LetPot Maker home">
          <span className="brand-mark" aria-hidden="true" />
          <span><b>LetPot</b> Maker</span>
        </a>
        <div className="topbar-actions">
        <button className="ai-generate-trigger" aria-haspopup="dialog" aria-expanded={aiOpen} onClick={() => setAiOpen(true)}><span>✦</span> AI Generate</button>
        <details className="export-menu">
          <summary>{exporting ? "Preparing…" : "Export"}<span>↓</span></summary>
          <div className="export-popover">
            <div className="export-heading"><b>Print handoff</b><span>{designName} · {designParts} parts</span></div>
            <label className="printer-field"><span>Target printer</span><select aria-label="Target Bambu printer" value={printerId} onChange={(event) => setPrinterId(event.target.value as BambuPrinterId)}>{Object.values(BAMBU_PRINTERS).map((printer) => <option key={printer.id} value={printer.id}>{printer.name}</option>)}</select></label>
            <button className="export-primary" onClick={exportBambuProject} disabled={exporting}>Bambu 3MF <span>Recommended</span></button>
            <button onClick={exportPack} disabled={exporting}>STL print pack <span>Individual manifold parts</span></button>
            <button onClick={exportAssemblyObj} disabled={exporting}>OBJ assembly <span>Editable solid assembly</span></button>
            <hr />
            <button onClick={savePreset}>Save parameter preset</button>
            <button onClick={exportAll} disabled={exporting}>Export all {MODEL_LIBRARY.length} designs</button>
            <button onClick={exportStackTrial} disabled={exporting}>Adapter stack trial</button>
          </div>
        </details>
        </div>
      </header>

      <section
        className="workspace"
        id="studio-workspace"
        data-mobile-panel={mobilePanel}
        data-resizing={resizingPanel ?? undefined}
        ref={workspaceRef}
        style={{
          "--library-width": `${panelWidths.library}px`,
          "--inspector-width": `${panelWidths.inspector}px`,
        } as CSSProperties}
      >
        <aside className="library-panel" id="studio-library" data-mode={libraryMode} aria-label="Maker Library">
          <div className="panel-heading">
            <p>{libraryMode === "official" ? "OFFICIAL COLLECTION" : "LOCAL WORKSPACE"}</p>
            <h2>{libraryMode === "official" ? "Maker Library" : "Mine"}</h2>
            <span>{libraryMode === "official" ? `${MODEL_LIBRARY.length} printable models` : `${aiCreations.length + tripoCreations.length} saved on this device`}</span>
          </div>
          <div className="library-mode" aria-label="Choose model library">
            <button className={libraryMode === "official" ? "active" : ""} onClick={() => setLibraryMode("official")}>Official <span>{MODEL_LIBRARY.length}</span></button>
            <button className={libraryMode === "mine" ? "active" : ""} onClick={() => setLibraryMode("mine")}>Mine <span>{aiCreations.length + tripoCreations.length}</span></button>
          </div>
          <label className="library-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
              placeholder={libraryMode === "official" ? "Search model titles…" : "Search Mine titles…"}
              aria-label={libraryMode === "official" ? "Search Official model titles" : "Search Mine titles"}
              autoComplete="off"
            />
            {libraryQuery && <button type="button" onClick={() => setLibraryQuery("")} aria-label="Clear model search">×</button>}
          </label>
          {libraryMode === "mine" && <div className="local-import-bar">
            <input
              ref={glbInputRef}
              type="file"
              accept=".glb,model/gltf-binary"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void importLocalGlb(file);
              }}
            />
            <button type="button" onClick={() => glbInputRef.current?.click()}>↑ Import local GLB</button>
            <span>≤100k faces · stays in this browser</span>
          </div>}
          {libraryMode === "official" && <div className={`tag-filter-shell ${tagsExpanded ? "expanded" : ""}`}>
            <div className="tag-filter" aria-label="Filter designs by tag">
              <button className={activeTag === "all" ? "active" : ""} onClick={() => setActiveTag("all")} aria-pressed={activeTag === "all"}>
                All <span>{MODEL_LIBRARY.length}</span>
              </button>
              {MODEL_TAGS.map((tag) => {
                const count = MODEL_LIBRARY.filter((item) => item.tags.includes(tag)).length;
                return (
                  <button key={tag} className={activeTag === tag ? "active" : ""} onClick={() => setActiveTag(tag)} aria-pressed={activeTag === tag}>
                    {TAG_LABELS[tag]} <span>{count}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="tag-filter-toggle" aria-expanded={tagsExpanded} onClick={() => setTagsExpanded((current) => !current)}>
              {tagsExpanded ? "Show fewer tags" : "Show all tags"}<span aria-hidden="true">{tagsExpanded ? "↑" : "↓"}</span>
            </button>
          </div>}
          <div className="asset-list">
            {libraryMode === "official" && visibleModels.map((item) => {
              const previewPath = modelPreviewPath(item);
              const visibleTags = item.tags.slice(0, 2);
              const hiddenTagCount = item.tags.length - visibleTags.length;
              return (
                <button key={item.id} className={`asset-card ${item.style} ${item.id === options.modelId ? "active" : ""}`} title={item.name} onClick={() => chooseModel(item.id)}>
                  {previewPath
                    ? <span className="asset-preview" aria-hidden="true" style={{ backgroundImage: `url(${previewPath})` }} />
                    : <span className="asset-number">{item.number}</span>}
                  <span className="asset-copy">
                    <strong>{item.name}</strong>
                    <span className="asset-tags" aria-label={`Tags: ${item.tags.map((tag) => TAG_LABELS[tag]).join(", ")}`}>
                      {visibleTags.map((tag) => <i key={tag}>{TAG_LABELS[tag]}</i>)}
                      {hiddenTagCount > 0 && <i className="asset-tags-more" title={item.tags.slice(2).map((tag) => TAG_LABELS[tag]).join(", ")}>+{hiddenTagCount}</i>}
                    </span>
                  </span>
                </button>
              );
            })}
            {libraryMode === "mine" && visibleMineCreations.map((item) => item.kind === "tripo" ? (
              <div key={`tripo:${item.id}`} className={`local-creation-card direct-mesh ${tripoDesign?.id === item.id ? "active" : ""}`}>
                <button className="local-creation-main" title={item.creation.name} onClick={() => void chooseTripoCreation(item.creation)}>
                  <span className="asset-number">3D</span>
                  <span className="asset-copy"><strong>{item.creation.name}</strong><small>{item.creation.source === "local-file" ? "Imported GLB" : "Tripo mesh"} · {(item.creation.faceCount / 1000).toFixed(1)}k faces</small></span>
                </button>
                <button className="local-creation-remove" aria-label={`Remove ${item.creation.name}`} onClick={() => void removeTripoCreation(item.creation)}>×</button>
              </div>
            ) : (
              <div key={`ai:${item.id}`} className={`local-creation-card ${aiDesign?.localId === item.id ? "active" : ""}`}>
                <button className="local-creation-main" title={item.creation.recipe.name} onClick={() => chooseAiCreation(item.creation)}>
                  <span className="asset-number">AI</span>
                  <span className="asset-copy"><strong>{item.creation.recipe.name}</strong><small>{item.creation.recipe.program ? "Custom shape" : "AI variation"}</small></span>
                </button>
                <button className="local-creation-remove" aria-label={`Remove ${item.creation.recipe.name}`} onClick={() => removeAiCreation(item.creation)}>×</button>
              </div>
            ))}
            {libraryMode === "official" && visibleModels.length === 0 && <div className="local-empty-state"><span>⌕</span><b>No matching Official models</b><p>Try a shorter title or clear the selected tag.</p><button onClick={() => { setLibraryQuery(""); setActiveTag("all"); }}>Show all models</button></div>}
            {libraryMode === "mine" && mineCreations.length > 0 && visibleMineCreations.length === 0 && <div className="local-empty-state"><span>⌕</span><b>No matching local titles</b><p>Clear the title search to restore your saved order.</p><button onClick={() => setLibraryQuery("")}>Clear search</button></div>}
            {libraryMode === "mine" && mineCreations.length === 0 && <div className="local-empty-state"><span>✦</span><b>No local creations yet</b><p>Generate a bounded shape, direct Tripo mesh, or import a local GLB. It stays only in this browser.</p><button onClick={() => setAiOpen(true)}>Generate your first model</button></div>}
          </div>
        </aside>

        <button
          type="button"
          className="panel-resizer library-resizer"
          role="slider"
          aria-label="Resize model library"
          aria-orientation="vertical"
          aria-valuemin={PANEL_WIDTH_BOUNDS.library.min}
          aria-valuemax={PANEL_WIDTH_BOUNDS.library.max}
          aria-valuenow={panelWidths.library}
          aria-valuetext={`${panelWidths.library} pixels wide`}
          title="Drag to resize · Double-click to reset"
          onPointerDown={(event) => beginPanelResize("library", event)}
          onKeyDown={(event) => handleResizerKeyDown("library", event)}
          onDoubleClick={() => setPanelWidths((current) => ({ ...current, library: DEFAULT_PANEL_WIDTHS.library }))}
        />

        <section className="stage" id="studio-preview" aria-label="3D model preview">
          <div className="view-tools" aria-label="View tools">
            {(["orbit", "front", "top"] as ViewName[]).map((name) => (
              <button key={name} className={view.name === name ? "active" : ""} onClick={() => requestView(name)}>{name[0].toUpperCase() + name.slice(1)}</button>
            ))}
          </div>
          <ModelViewport build={build} view={view} modelKey={viewportModelKey} palette={viewportPalette} />
          <div className="dimension-summary" aria-label="Model dimensions">
            <span>TOPPER / ASSEMBLY</span><b>W {build.measurements.topperWidth.toFixed(1)} × H {build.measurements.topperHeight.toFixed(1)} / {build.measurements.width.toFixed(1)} × {build.measurements.height.toFixed(1)} mm</b>
          </div>
          {message && <div className="stage-toast" role="status" aria-live="polite">{message}</div>}
        </section>

        <button
          type="button"
          className="panel-resizer inspector-resizer"
          role="slider"
          aria-label="Resize model adjustments"
          aria-orientation="vertical"
          aria-valuemin={PANEL_WIDTH_BOUNDS.inspector.min}
          aria-valuemax={PANEL_WIDTH_BOUNDS.inspector.max}
          aria-valuenow={panelWidths.inspector}
          aria-valuetext={`${panelWidths.inspector} pixels wide`}
          title="Drag to resize · Double-click to reset"
          onPointerDown={(event) => beginPanelResize("inspector", event)}
          onKeyDown={(event) => handleResizerKeyDown("inspector", event)}
          onDoubleClick={() => setPanelWidths((current) => ({ ...current, inspector: DEFAULT_PANEL_WIDTHS.inspector }))}
        />

        <aside className="inspector-panel" id="studio-adjustments" aria-label="Model adjustments">
          <div className="inspector-title">
            <div><p>{tripoDesign ? tripoDesign.source === "local-file" ? "LOCAL GLB" : "TRIPO MESH" : isOfficialMesh ? "OFFICIAL MESH" : aiDesign ? "AI DESIGN" : `MODEL ${definition.number}`}</p><h2>{designName}</h2><span>{designSubtitle}</span></div>
            <span className="part-count">{designParts} {designParts === 1 ? "PART" : "PARTS"}</span>
          </div>
          <div className="inspector-content">
            <section className="inspector-section">
              <div className="section-heading"><div><p>SHAPE</p><span>Maximum upper-shape envelope</span></div></div>
              <Slider label="Topper height" value={options.topperHeight} min={TOPPER_SIZE_LIMITS.height.min} max={TOPPER_SIZE_LIMITS.height.max} step={TOPPER_SIZE_LIMITS.step} onChange={(value) => update("topperHeight", value)} />
              <Slider label="Topper width" value={options.topperWidth} min={TOPPER_SIZE_LIMITS.width.min} max={TOPPER_SIZE_LIMITS.width.max} step={TOPPER_SIZE_LIMITS.step} onChange={(value) => update("topperWidth", value)} />
              <p className="parameter-note">The upper artwork is centered and fitted inside this fixed envelope. Signature controls can change its form, but cannot push it beyond the selected width or height.</p>
            </section>

            <section className="inspector-section connection-section">
              <div className="section-heading"><div><p>CONNECTION</p><span>Flush fit or one-piece print</span></div></div>
              <div className="control-group compact">
                <label>
                  <span>Assembly</span>
                  <select
                    aria-label="Connection mode"
                    value={options.connectionMode}
                    onChange={(event) => update("connectionMode", event.target.value as ModelOptions["connectionMode"])}
                  >
                    <option value="detachable">Flush detachable pin</option>
                    <option value="integrated">One-piece print</option>
                  </select>
                </label>
              </div>
              <p className="parameter-note">{integrated
                ? "Adapter and topper are fused by a hidden internal core; no pin or socket gap is exported."
                : "The pin enters an embedded blind socket inside the object, without a raised outer collar."}</p>
            </section>

            {!isAiSculpture && !isTripoMesh && (definition.parameters?.length ?? 0) > 0 && <section className="inspector-section signature-section">
              <div className="section-heading">
                <div><p>SIGNATURE</p><span>{definition.parameters?.length} model-specific controls</span></div>
                <div className="section-actions"><button onClick={randomizeShape}>Vary</button><button onClick={resetShape}>Reset</button></div>
              </div>
              {definition.parameters?.map((parameter) => (
                <Slider
                  key={parameter.key}
                  label={parameter.label}
                  value={options.shape[parameter.key] ?? parameter.defaultValue}
                  min={parameter.min}
                  max={parameter.max}
                  step={parameter.step}
                  unit={parameter.unit ?? ""}
                  onChange={(value) => updateShape(parameter.key, value)}
                />
              ))}
              <p className="parameter-note">Ranges preserve the minimum printable feature size and required intersections while the fixed topper envelope remains the outer limit.</p>
            </section>}

            <section className="inspector-section appearance-section">
              <div className="section-heading"><div><p>APPEARANCE</p><span>{isTripoMesh ? "Single-color printable mesh" : isAiSculpture ? "Three-role generated palette" : definition.style === "realistic" ? "Smooth realistic model" : "Faceted printable model"}</span></div></div>
              {(isTripoMesh || isAiSculpture || definition.style === "lowpoly") && <div className="control-group compact"><label><span>Surface style</span><select value={options.faceted ? "low" : "soft"} onChange={(event) => update("faceted", event.target.value === "low")}><option value="low">Low poly</option><option value="soft">Smooth faceted</option></select></label></div>}
              <label className="environment-toggle" htmlFor="adaptive-environment-toggle">
                <span className="sr-only">Match preview environment</span>
                <input
                  id="adaptive-environment-toggle"
                  type="checkbox"
                  checked={adaptiveEnvironment}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setAdaptiveEnvironment(checked);
                    try {
                      window.localStorage.setItem(ADAPTIVE_ENVIRONMENT_STORAGE_KEY, String(checked));
                    } catch {
                      setMessage("The environment preference could not be saved");
                    }
                  }}
                />
                <span><b>Match preview environment</b><small>{activePreviewPath ? "Samples the selected cover once and applies a subtle editor tint." : "Uses the active topper color for this local design."}</small></span>
              </label>
              <div className="control-group color-control"><span>{options.modelId === "mushroom" ? "Cap color" : "Topper color"}</span><div>{COLORS.map((color) => <button key={color} className={`swatch ${options.primaryColor === color ? "active" : ""}`} style={{ background: color }} aria-label={`Use ${color}`} onClick={() => update("primaryColor", color)} />)}<input className="color-input" aria-label="Custom topper color" type="color" value={options.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} /></div></div>
              {isAiSculpture && <div className="control-group color-control"><span>Secondary color</span><div><input className="color-input" aria-label="Custom secondary color" type="color" value={options.secondaryColor ?? "#d8a33e"} onChange={(event) => update("secondaryColor", event.target.value)} /></div></div>}
              {isAiSculpture && <div className="control-group color-control"><span>Detail color</span><div><input className="color-input" aria-label="Custom detail color" type="color" value={options.detailColor ?? "#f4eee2"} onChange={(event) => update("detailColor", event.target.value)} /></div></div>}
              <div className="control-group color-control"><span>{options.modelId === "mushroom" ? "Stem + base color" : "Adapter color"}</span><div><button className={`swatch ${options.accentColor === "#d7d0bf" ? "active" : ""}`} style={{ background: "#d7d0bf" }} onClick={() => update("accentColor", "#d7d0bf")} aria-label="Warm stone" /><button className={`swatch ${options.accentColor === "#1f3f2e" ? "active" : ""}`} style={{ background: "#1f3f2e" }} onClick={() => update("accentColor", "#1f3f2e")} aria-label="LetPot green" /><input className="color-input" aria-label="Custom adapter color" type="color" value={options.accentColor} onChange={(event) => update("accentColor", event.target.value)} /></div></div>
            </section>

            <details className="inspector-disclosure">
              <summary><span><b>Base & fit</b><small>Ø33 / Ø41 mm · fixed standard</small></span><i>+</i></summary>
              <div className="disclosure-content">
                <div className="calibration-note">Locked pod-fit standard shared by every design. Base dimensions are intentionally not adjustable.</div>
                <dl className="compact-spec">
                  <div><dt>Lower section</dt><dd>Ø{ADAPTER_STANDARD.lowerDiameter} × {ADAPTER_STANDARD.lowerHeight.toFixed(1)} mm</dd></div>
                  <div><dt>Transition layer</dt><dd>Ø{ADAPTER_STANDARD.lowerDiameter}→Ø{ADAPTER_STANDARD.upperDiameter} × {ADAPTER_STANDARD.transitionHeight.toFixed(1)} mm</dd></div>
                  <div><dt>Upper vertical band</dt><dd>Ø{ADAPTER_STANDARD.upperDiameter} × {ADAPTER_STANDARD.upperBandHeight.toFixed(1)} mm</dd></div>
                  <div><dt>Total height</dt><dd>{ADAPTER_STANDARD.totalHeight.toFixed(1)} mm</dd></div>
                  <div><dt>Logo</dt><dd>Outer rim · crown outward</dd></div>
                  <div><dt>Connection</dt><dd>{integrated ? "Hidden fused core · one part" : "Flush hex pin R3.96 · 7.4 mm"}</dd></div>
                </dl>
              </div>
            </details>

            <details className="inspector-disclosure readiness-disclosure">
              <summary><span><b>Print readiness</b><small>{manufacturing.status} · {designParts} manifold parts</small></span><i className={manufacturing.status === "Production trial" ? "verified" : "review"}>{manufacturing.status === "Production trial" ? "✓" : "!"}</i></summary>
              <div className="disclosure-content">
                <p className="print-note">{designPrintNote}</p>
                <dl className="compact-spec"><div><dt>Orientation</dt><dd>{manufacturing.orientation}</dd></div><div><dt>Support</dt><dd>{manufacturing.supportStrategy}</dd></div><div><dt>Minimum wall</dt><dd>{manufacturing.minWall.toFixed(1)} mm</dd></div><div><dt>Minimum feature</dt><dd>{manufacturing.minFeature.toFixed(1)} mm</dd></div><div><dt>Batch mode</dt><dd>{manufacturing.batchMode}</dd></div></dl>
                <ul className="audit-list">{manufacturing.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
              </div>
            </details>
          </div>
        </aside>
      </section>
      <nav className="mobile-studio-tabs" aria-label="Mobile Studio workspace">
        <button type="button" aria-controls="studio-preview" aria-pressed={mobilePanel === "preview"} onClick={() => setMobilePanel("preview")}><span aria-hidden="true">◇</span> Preview</button>
        <button type="button" aria-controls="studio-library" aria-pressed={mobilePanel === "library"} onClick={() => setMobilePanel("library")}><span aria-hidden="true">▦</span> Library</button>
        <button type="button" aria-controls="studio-adjustments" aria-pressed={mobilePanel === "adjust"} onClick={() => setMobilePanel("adjust")}><span aria-hidden="true">⌁</span> Adjust</button>
      </nav>
      <AiGenerateModal open={aiOpen} onClose={() => setAiOpen(false)} onGenerated={applyAiDesign} onMeshGenerated={applyTripoDesign} />
    </main>
  );
}
