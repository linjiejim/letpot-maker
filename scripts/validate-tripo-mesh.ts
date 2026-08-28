import assert from "node:assert/strict";
import * as THREE from "three";
import { normalizeLocalTripoMeshMetadata, TRIPO_MESH_SCHEMA } from "../lib/local-mesh-cache";
import {
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  getDefaultShapeParameters,
  MODEL_LIBRARY,
  TOPPER_SIZE_LIMITS,
  type ModelOptions,
} from "../lib/model-factory";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";
import { buildTripoPrompt, TRIPO_MODEL_OPTIONS, validateTripoApiKey } from "../lib/tripo-mesh";
import {
  CHRISTMAS_TRIPO_CANDIDATES,
  TRIPO_CANDIDATE_CREDITS,
  TRIPO_CANDIDATE_FACE_LIMIT,
  TRIPO_IMAGE_CANDIDATE_CREDITS,
  buildTripoImageCandidateRequest,
  buildTripoCandidateRequest,
} from "../lib/tripo-candidate";
import { loadOfficialMeshForNode } from "../lib/official-mesh-node";

assert.equal(validateTripoApiKey("  tsk_example-key_12345  "), "tsk_example-key_12345");
assert.throws(() => validateTripoApiKey("not-a-key"), /tsk_/);
assert.deepEqual(TRIPO_MODEL_OPTIONS.map(({ meshCredits }) => meshCredits), [10, 30]);
const providerPrompt = buildTripoPrompt("A friendly low-poly otter");
assert.match(providerPrompt, /one connected watertight solid/i);
assert.match(providerPrompt, /do not add a stand, pedestal, platform, plinth, base disk, floor, ground plane, tray, or support plate/i);
assert.ok(providerPrompt.length <= 1024);

assert.equal(CHRISTMAS_TRIPO_CANDIDATES.length, 4);
for (const candidate of CHRISTMAS_TRIPO_CANDIDATES) {
  const request = buildTripoCandidateRequest(candidate);
  assert.equal(request.texture, false);
  assert.equal(request.pbr, false);
  assert.equal(request.export_uv, false);
  assert.equal(request.quad, false);
  assert.equal(request.smart_low_poly, false);
  assert.equal(request.generate_parts, false);
  assert.equal(request.geometry_quality, "standard");
  assert.equal(request.face_limit, TRIPO_CANDIDATE_FACE_LIMIT);
  assert.equal(TRIPO_CANDIDATE_CREDITS, 10);
  assert.ok(request.negative_prompt && request.negative_prompt.length <= 255);
}

const imageRequest = buildTripoImageCandidateRequest("file_snowman-reference", 25_120_102);
assert.equal(TRIPO_IMAGE_CANDIDATE_CREDITS, 20);
assert.equal(imageRequest.texture, false);
assert.equal(imageRequest.pbr, false);
assert.equal(imageRequest.export_uv, false);
assert.equal(imageRequest.enable_image_autofix, false);
assert.equal(imageRequest.face_limit, TRIPO_CANDIDATE_FACE_LIMIT);
assert.throws(() => buildTripoImageCandidateRequest("not-a-file-token", 1), /file token/);
assert.equal(buildTripoImageCandidateRequest("file_snowman-reference", 25_120_102, 50_000).face_limit, 50_000);
assert.throws(() => buildTripoImageCandidateRequest("file_snowman-reference", 1, 999), /face limit/);

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
assert.equal(metadata.source, "tripo");
assert.equal(normalizeLocalTripoMeshMetadata({ ...metadata, source: "local-file" }).source, "local-file");

const source = new THREE.Group();
source.name = "mock_tripo_source";
source.add(new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.8, 1, 24),
  new THREE.MeshStandardMaterial({ color: "#769567" }),
));
const wasm = await loadNodeManifold();

const officialDefinitions = MODEL_LIBRARY.filter((definition) => definition.officialMesh);
assert.deepEqual(officialDefinitions.map(({ id }) => id), ["santa", "christmas-tree", "snowman", "reindeer"]);
for (const definition of officialDefinitions) {
  const official = await loadOfficialMeshForNode(definition);
  assert.ok(official);
  try {
    for (const connectionMode of ["detachable", "integrated"] satisfies ModelOptions["connectionMode"][]) {
      const build = createModel({
        ...DEFAULT_OPTIONS,
        connectionMode,
        modelId: definition.id,
        ...definition.defaults,
        faceted: false,
        shape: getDefaultShapeParameters(definition),
        externalMesh: official.object,
      });
      const solids: THREE.Mesh[] = [];
      try {
        const topper = build.assembly.getObjectByName("tripo_mesh_topper");
        assert.equal(topper?.userData.externalMeshMountMode, "direct-socket", `${definition.id} must not use a transition tray`);
        assert.equal(topper?.getObjectByName("standardized_tripo_mesh_transition_fallback"), undefined);
        assert.ok(build.measurements.topperWidth <= definition.defaults.topperWidth + 0.1);
        assert.ok(build.measurements.topperHeight <= definition.defaults.topperHeight + 0.1);
        for (const part of build.parts) {
          solids.push(await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ }));
        }
      } finally {
        solids.forEach(disposeObject);
        disposeObject(build.assembly);
      }
    }
  } finally {
    disposeObject(official.object);
  }
}

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
console.log(`Validated ${officialDefinitions.length} bundled official meshes plus direct, fallback and small-gap Tripo socket mounts.`);
