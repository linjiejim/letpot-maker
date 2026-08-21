import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  getDefaultShapeParameters,
  MODEL_LIBRARY,
} from "../lib/model-factory";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";
import {
  BAMBU_PRINTERS,
  buildBambuThreeMf,
  type BambuPrinterId,
  type ThreeMfPart,
} from "../lib/three-mf";

const wasm = await loadNodeManifold();
let validatedProjects = 0;
let validatedNestedArchive = false;

for (const definition of MODEL_LIBRARY) {
  const build = createModel({
    ...DEFAULT_OPTIONS,
    modelId: definition.id,
    ...definition.defaults,
    faceted: definition.style === "lowpoly",
    shape: getDefaultShapeParameters(definition),
  });
  const solids: ThreeMfPart["mesh"][] = [];
  const projectParts: ThreeMfPart[] = [];

  try {
    for (const part of build.parts) {
      const solid = await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ });
      solids.push(solid);
      projectParts.push({ name: part.label, mesh: solid, color: part.color });
    }

    for (const printerId of Object.keys(BAMBU_PRINTERS) as BambuPrinterId[]) {
      const project = await buildBambuThreeMf(projectParts, printerId, `Validation ${definition.name}`);
      const archive = await JSZip.loadAsync(await project.arrayBuffer());
      assert.ok(archive.file("[Content_Types].xml"));
      assert.ok(archive.file("_rels/.rels"));
      assert.ok(archive.file("3D/3dmodel.model"));
      assert.ok(archive.file("Metadata/letpot.json"));
      assert.ok(archive.file("Metadata/project_settings.config"));
      assert.ok(archive.file("Metadata/model_settings.config"));
      assert.ok(archive.file("Metadata/slice_info.config"));

      const modelXml = await archive.file("3D/3dmodel.model")!.async("text");
      const manifest = JSON.parse(await archive.file("Metadata/letpot.json")!.async("text"));
      const projectSettings = JSON.parse(await archive.file("Metadata/project_settings.config")!.async("text"));
      assert.match(modelXml, /unit="millimeter"/);
      assert.match(modelXml, /<metadata name="BambuStudio:3mfVersion">1<\/metadata>/);
      assert.match(modelXml, /<metadata name="Application">BambuStudio-/);
      assert.equal((modelXml.match(/<object /g) ?? []).length, build.parts.length);
      assert.equal((modelXml.match(/<item /g) ?? []).length, build.parts.length);
      assert.equal(manifest.targetPrinter.id, printerId);
      assert.equal(manifest.status, "print-ready-preset");
      assert.equal(projectSettings.enable_support, "1");
      assert.equal(projectSettings.support_type, "normal(auto)");
      assert.equal(projectSettings.support_style, "snug");
      assert.equal(projectSettings.brim_type, "outer_only");
      assert.equal(projectSettings.printer_model, BAMBU_PRINTERS[printerId].name);
      assert.equal(projectSettings.printer_variant, "0.4");
      assert.match(projectSettings.machine_start_gcode, printerId === "a1-mini" ? /machine: A1 mini/ : /machine: P1S-0\.4/);
      assert.notEqual(projectSettings.filament_density[0], "0");
      const modelSettings = await archive.file("Metadata/model_settings.config")!.async("text");
      assert.equal((modelSettings.match(/<model_instance>/g) ?? []).length, build.parts.length);
      if (!validatedNestedArchive) {
        const collection = new JSZip();
        collection.file("bambu/project.3mf", await project.arrayBuffer());
        const collectionBytes = await collection.generateAsync({ type: "uint8array" });
        const collectionArchive = await JSZip.loadAsync(collectionBytes);
        const nestedProject = await collectionArchive.file("bambu/project.3mf")!.async("uint8array");
        const nestedArchive = await JSZip.loadAsync(nestedProject);
        assert.ok(nestedArchive.file("3D/3dmodel.model"));
        validatedNestedArchive = true;
      }
      validatedProjects += 1;
    }
  } finally {
    solids.forEach((solid) => disposeObject(solid));
    disposeObject(build.assembly);
  }
}

console.log(`Validated ${validatedProjects} Bambu 3MF projects across A1 mini and P1S.`);
