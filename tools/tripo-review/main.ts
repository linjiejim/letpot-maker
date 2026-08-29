import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  type ModelBuild,
} from "../../lib/model-factory";
import type { TripoCandidateManifestEntry } from "../../lib/tripo-candidate";

type Manifest = { candidates: TripoCandidateManifestEntry[] };

const viewport = document.querySelector<HTMLDivElement>("#viewport")!;
const list = document.querySelector<HTMLElement>("#candidate-list")!;
const stats = document.querySelector<HTMLDListElement>("#candidate-stats")!;
const label = document.querySelector<HTMLElement>("#candidate-label")!;
const stage = document.querySelector<HTMLElement>("#stage")!;
const scene = new THREE.Scene();
scene.background = null;
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;

scene.add(new THREE.HemisphereLight("#fffdf5", "#5c6d5e", 2.8));
const key = new THREE.DirectionalLight("#fff4da", 4.6);
key.position.set(55, 90, 60);
key.castShadow = true;
scene.add(key);
const fill = new THREE.DirectionalLight("#c8dfce", 1.8);
fill.position.set(-60, 38, -42);
scene.add(fill);
const ground = new THREE.Mesh(new THREE.CircleGeometry(110, 72), new THREE.ShadowMaterial({ color: "#3f4f42", opacity: 0.15 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.receiveShadow = true;
scene.add(ground);

let activeBuild: ModelBuild | undefined;
let activeId = "";

function resize() {
  renderer.setSize(viewport.clientWidth, viewport.clientHeight, false);
  camera.aspect = viewport.clientWidth / Math.max(viewport.clientHeight, 1);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

function row(term: string, value: string) {
  return `<dt>${term}</dt><dd>${value}</dd>`;
}

async function showCandidate(entry: TripoCandidateManifestEntry) {
  if (activeId === entry.id) return;
  stage.dataset.ready = "false";
  const response = await fetch(`/candidates/${entry.glb}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${entry.glb}`);
  const data = await response.arrayBuffer();
  const gltf = await new Promise<Awaited<ReturnType<GLTFLoader["parseAsync"]>>>((resolve, reject) => {
    new GLTFLoader().parse(data, "", resolve, reject);
  });
  const build = createModel({
    ...DEFAULT_OPTIONS,
    modelId: "sprout",
    connectionMode: "detachable",
    topperHeight: entry.topperHeight,
    topperWidth: entry.topperWidth,
    primaryColor: entry.color,
    faceted: false,
    externalMesh: gltf.scene,
  });
  if (activeBuild) {
    scene.remove(activeBuild.assembly);
    disposeObject(activeBuild.assembly);
  }
  disposeObject(gltf.scene);
  activeBuild = build;
  activeId = entry.id;
  scene.add(build.assembly);
  const bounds = new THREE.Box3().setFromObject(build.assembly);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const distance = Math.max(size.x, size.y, size.z) * 2.15;
  controls.target.copy(center);
  camera.position.set(distance * 0.78, center.y + distance * 0.38, distance * 0.86);
  camera.lookAt(center);
  controls.update();
  label.textContent = entry.name;
  stats.innerHTML = [
    row("Mode", entry.generationMode ?? "text-to-3d"),
    row("Task", entry.taskId.slice(0, 14) + "…"),
    row("Faces", entry.inspection.faceCount.toLocaleString()),
    row("Requested", (entry.requestedFaceLimit ?? entry.inspection.faceCount).toLocaleString()),
    row("Mount", entry.inspection.mountMode),
    row("Manifold", entry.inspection.manifoldValid ? "pass" : "failed"),
    row("Envelope", `${entry.topperWidth} × ${entry.topperHeight} mm`),
    row("Credits", String(entry.creditsConsumed ?? entry.expectedCredits)),
  ].join("");
  list.querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.id === entry.id)));
  history.replaceState(null, "", `?candidate=${encodeURIComponent(entry.id)}`);
  stage.dataset.ready = "true";
}

async function main() {
  const response = await fetch("/candidates/manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No local candidate manifest found. Run npm run tripo:candidates first.");
  const manifest = await response.json() as Manifest;
  if (!manifest.candidates.length) throw new Error("The local candidate manifest is empty.");
  for (const entry of manifest.candidates) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = entry.id;
    button.textContent = entry.name;
    button.addEventListener("click", () => void showCandidate(entry));
    list.appendChild(button);
  }
  const requested = new URLSearchParams(location.search).get("candidate");
  await showCandidate(manifest.candidates.find(({ id }) => id === requested) ?? manifest.candidates[0]);
}

function render() {
  requestAnimationFrame(render);
  controls.update();
  renderer.render(scene, camera);
}
render();

main().catch((error) => {
  label.textContent = error instanceof Error ? error.message : "Candidate review failed.";
  stage.dataset.ready = "error";
});
