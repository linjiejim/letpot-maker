import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import * as THREE from "three";
import {
  ADAPTER_STANDARD,
  buildAdapterStackCoupon,
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  getDefaultShapeParameters,
  getManufacturingProfile,
  MODEL_LIBRARY,
  STACK_TRIAL_GAPS,
} from "../lib/model-factory";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";
import { loadOfficialMeshForNode } from "../lib/official-mesh-node";

const outputRoot = resolve(process.cwd(), "public/models");
const stlExporter = new STLExporter();
const objExporter = new OBJExporter();
const wasm = await loadNodeManifold();

await mkdir(outputRoot, { recursive: true });

for (const definition of MODEL_LIBRARY) {
  const officialSource = await loadOfficialMeshForNode(definition);
  const options = {
    ...DEFAULT_OPTIONS,
    modelId: definition.id,
    ...definition.defaults,
    faceted: definition.style === "lowpoly",
    shape: getDefaultShapeParameters(definition),
    externalMesh: officialSource?.object,
  };
  const build = createModel(options);
  const modelRoot = resolve(outputRoot, definition.id);
  await mkdir(modelRoot, { recursive: true });
  for (const existing of await readdir(modelRoot)) {
    if (existing.endsWith(".stl") || existing.endsWith("-solid-assembly.obj") || existing === "model-spec.json") {
      await unlink(resolve(modelRoot, existing));
    }
  }
  const solidAssembly = new THREE.Group();

  for (const [index, part] of build.parts.entries()) {
    const printable = await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ });
    const data = stlExporter.parse(printable, { binary: true }) as DataView;
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    await writeFile(resolve(modelRoot, `${String(index + 1).padStart(2, "0")}-${part.id}.stl`), bytes);
    solidAssembly.add(await solidifyObject(wasm, part.object, { normalize: false }));
    disposeObject(printable);
  }

  await writeFile(resolve(modelRoot, `${definition.id}-solid-assembly.obj`), objExporter.parse(solidAssembly), "utf8");
  await writeFile(resolve(modelRoot, "model-spec.json"), JSON.stringify({
    schema: "letpot-maker/model/v1",
    model: definition,
    options: { ...options, externalMesh: undefined },
    adapterStandard: ADAPTER_STANDARD,
    measurements: build.measurements,
    units: "millimetres",
    status: getManufacturingProfile(definition.id).status === "Production trial" ? "production-trial" : "prototype-fit",
    printConstraint: "Every STL part is one connected watertight manifold solid.",
    manufacturing: getManufacturingProfile(definition.id),
  }, null, 2));
  disposeObject(solidAssembly);
  disposeObject(build.assembly);
  if (officialSource) disposeObject(officialSource.object);
}

const stackRoot = resolve(outputRoot, "stack-tests");
await mkdir(stackRoot, { recursive: true });
for (const gap of STACK_TRIAL_GAPS) {
  const coupon = buildAdapterStackCoupon(DEFAULT_OPTIONS, gap, 3);
  const printable = await solidifyObject(wasm, coupon);
  const data = stlExporter.parse(printable, { binary: true }) as DataView;
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const gapCode = Math.round(gap * 100).toString().padStart(2, "0");
  await writeFile(resolve(stackRoot, `adapter-stack-gap-${gapCode}.stl`), bytes);
  disposeObject(printable);
  disposeObject(coupon);
}
await writeFile(resolve(stackRoot, "README.json"), JSON.stringify({
  schema: "letpot-maker/stack-trial/v1",
  adapterCount: 3,
  adapterStandard: ADAPTER_STANDARD,
  gaps: STACK_TRIAL_GAPS,
  units: "millimetres",
  interface: "Three breakaway cone bridges between each adapter",
  warning: "Experimental process coupon. Start with the 0.40 mm gap and inspect separation before trying smaller gaps.",
}, null, 2));

await writeFile(resolve(outputRoot, "manifest.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  models: MODEL_LIBRARY.map(({ id, name, parts, difficulty, series, style, tags, officialMesh }) => ({
    id,
    name,
    parts,
    difficulty,
    series,
    style,
    tags,
    officialMesh,
  })),
  printConstraint: "Every STL part is one connected watertight manifold solid.",
  adapterStandard: { ...ADAPTER_STANDARD, units: "millimetres" },
  stackTrials: STACK_TRIAL_GAPS.map((gap) => ({ gap, adapters: 3, status: "experimental" })),
  note: "Fixed Ø33/Ø41 mm pod-fit standard. Verify fit with a small test print before production.",
}, null, 2));

console.log(`Generated ${MODEL_LIBRARY.length} model packs in ${outputRoot}`);
