import assert from "node:assert/strict";
import * as THREE from "three";
import { normalizeLocalTripoMeshMetadata, TRIPO_MESH_SCHEMA } from "../lib/local-mesh-cache";
import {
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  TOPPER_SIZE_LIMITS,
  type ModelOptions,
} from "../lib/model-factory";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";
import { buildTripoPrompt, TRIPO_MODEL_OPTIONS, validateTripoApiKey } from "../lib/tripo-mesh";

assert.equal(validateTripoApiKey("  tsk_example-key_12345  "), "tsk_example-key_12345");
assert.throws(() => validateTripoApiKey("not-a-key"), /tsk_/);
assert.deepEqual(TRIPO_MODEL_OPTIONS.map(({ meshCredits }) => meshCredits), [10, 30]);
const providerPrompt = buildTripoPrompt("A friendly low-poly otter");
assert.match(providerPrompt, /one connected watertight solid/i);
assert.ok(providerPrompt.length <= 1024);

const metadata = normalizeLocalTripoMeshMetadata({
  schema: TRIPO_MESH_SCHEMA,
  id: "mesh-test",
  createdAt: new Date(0).toISOString(),
  name: "Local otter",
  prompt: "A friendly low-poly otter",
  taskId: "task-test",
  modelVersion: "v3.1-20260211",
  topperHeight: 999,
  topperWidth: 999,
  byteLength: 1024,
  meshCount: 1,
  faceCount: 960,
  apiKey: "must-not-be-retained",
});
assert.equal(metadata.topperHeight, TOPPER_SIZE_LIMITS.height.max);
assert.equal(metadata.topperWidth, TOPPER_SIZE_LIMITS.width.max);
assert.equal("apiKey" in metadata, false);

const source = new THREE.Group();
source.name = "mock_tripo_source";
source.add(new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.8, 1, 24),
  new THREE.MeshStandardMaterial({ color: "#769567" }),
));
const wasm = await loadNodeManifold();

for (const connectionMode of ["detachable", "integrated"] satisfies ModelOptions["connectionMode"][]) {
  const build = createModel({
    ...DEFAULT_OPTIONS,
    connectionMode,
    topperHeight: TOPPER_SIZE_LIMITS.height.max,
    topperWidth: TOPPER_SIZE_LIMITS.width.max,
    externalMesh: source,
  });
  const solids: THREE.Mesh[] = [];
  try {
    assert.equal(build.parts.length, connectionMode === "integrated" ? 1 : 3);
    assert.ok(build.measurements.height >= TOPPER_SIZE_LIMITS.height.max);
    assert.ok(build.measurements.width >= TOPPER_SIZE_LIMITS.width.max);
    assert.ok(build.measurements.topperHeight <= TOPPER_SIZE_LIMITS.height.max + 0.1);
    assert.ok(build.measurements.topperWidth <= TOPPER_SIZE_LIMITS.width.max + 0.1);
    const topper = connectionMode === "integrated"
      ? build.assembly.getObjectByName("tripo_mesh_topper")
      : build.parts.find((part) => part.id === "topper")?.object;
    assert.equal(topper?.userData.externalMeshMountMode, "direct-socket");
    assert.equal(topper?.getObjectByName("standardized_tripo_mesh_transition_fallback"), undefined);
    for (const part of build.parts) {
      solids.push(await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ }));
    }
  } finally {
    solids.forEach(disposeObject);
    disposeObject(build.assembly);
  }
}

const unsupportedSource = new THREE.Group();
unsupportedSource.name = "mock_tripo_source_without_central_base";
for (const x of [-0.5, 0.5]) {
  const foot = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.65, 0.55),
    new THREE.MeshStandardMaterial({ color: "#769567" }),
  );
  foot.position.set(x, 0.325, 0);
  unsupportedSource.add(foot);
}
const bridge = new THREE.Mesh(
  new THREE.BoxGeometry(1.65, 0.35, 0.55),
  new THREE.MeshStandardMaterial({ color: "#769567" }),
);
bridge.position.y = 0.775;
unsupportedSource.add(bridge);
const fallbackBuild = createModel({
  ...DEFAULT_OPTIONS,
  topperHeight: 35,
  topperWidth: 28,
  externalMesh: unsupportedSource,
});
try {
  const fallbackTopper = fallbackBuild.parts.find((part) => part.id === "topper")?.object;
  assert.equal(fallbackTopper?.userData.externalMeshMountMode, "reinforced-transition");
  assert.ok(fallbackTopper?.getObjectByName("standardized_tripo_mesh_transition_fallback"));
  assert.ok(fallbackTopper);
  const fallbackSolid = await solidifyObject(wasm, fallbackTopper);
  disposeObject(fallbackSolid);
} finally {
  disposeObject(fallbackBuild.assembly);
  disposeObject(unsupportedSource);
}

const crackedGeometry = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const crackedPosition = crackedGeometry.getAttribute("position");
crackedPosition.setX(0, crackedPosition.getX(0) + 0.001);
crackedPosition.needsUpdate = true;
const repairSource = new THREE.Group();
repairSource.name = "mock_tripo_source_with_small_seam";
repairSource.add(new THREE.Mesh(
  crackedGeometry,
  new THREE.MeshStandardMaterial({ color: "#769567" }),
));
const repairBuild = createModel({
  ...DEFAULT_OPTIONS,
  topperHeight: 35,
  topperWidth: 28,
  externalMesh: repairSource,
});
try {
  const repairTopper = repairBuild.parts.find((part) => part.id === "topper")?.object;
  assert.ok(repairTopper);
  const repairedSolid = await solidifyObject(wasm, repairTopper);
  disposeObject(repairedSolid);
} finally {
  disposeObject(repairBuild.assembly);
  disposeObject(repairSource);
}

disposeObject(source);
console.log("Validated direct, fallback and small-gap repair for Tripo socket mounts.");
