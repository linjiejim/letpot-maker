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
import { buildTripoPrompt, validateTripoApiKey } from "../lib/tripo-mesh";

assert.equal(validateTripoApiKey("  tsk_example-key_12345  "), "tsk_example-key_12345");
assert.throws(() => validateTripoApiKey("not-a-key"), /tsk_/);
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
  new THREE.SphereGeometry(1, 24, 16),
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
    for (const part of build.parts) {
      solids.push(await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ }));
    }
  } finally {
    solids.forEach(disposeObject);
    disposeObject(build.assembly);
  }
}

disposeObject(source);
console.log("Validated client-side Tripo metadata boundaries and standardized mesh connections in both assembly modes.");

