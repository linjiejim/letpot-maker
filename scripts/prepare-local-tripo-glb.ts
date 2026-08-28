import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import * as THREE from "three";
import { disposeObject } from "../lib/model-factory";
import { parseTripoGlb, TRIPO_LOCAL_MESH_FACE_LIMIT } from "../lib/tripo-mesh";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";

const TARGET_WIDTH = 70;
const TARGET_HEIGHT = 100;

class NodeFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend: ((event: ProgressEvent<FileReader>) => void) | null = null;

  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((result) => {
      this.result = result;
      queueMicrotask(() => this.onloadend?.({ target: this } as unknown as ProgressEvent<FileReader>));
    });
  }

  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(result).toString("base64")}`;
      queueMicrotask(() => this.onloadend?.({ target: this } as unknown as ProgressEvent<FileReader>));
    });
  }
}

function fitToPrintableEnvelope(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const lateralScale = TARGET_WIDTH / Math.max(size.x, size.z, 0.001);
  const verticalScale = TARGET_HEIGHT / Math.max(size.y, 0.001);
  const fitted = new THREE.Group();
  fitted.name = "tripo_printable_source";
  fitted.add(object);
  object.scale.set(lateralScale, verticalScale, lateralScale);
  object.position.set(
    -center.x * lateralScale,
    -bounds.min.y * verticalScale,
    -center.z * lateralScale,
  );
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.userData.allowSmallGapRepair = true;
  });
  fitted.updateMatrixWorld(true);
  return fitted;
}

async function main() {
  const [inputArgument, outputArgument] = process.argv.slice(2);
  if (!inputArgument || !outputArgument) {
    throw new Error("Usage: npm run tripo:prepare -- /absolute/input.glb /absolute/output.glb");
  }
  const input = path.resolve(inputArgument);
  const output = path.resolve(outputArgument);
  if (input === output) throw new Error("Prepared GLB output must not overwrite its source file.");

  const data = await readFile(input);
  const sourceBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const parsed = await parseTripoGlb(sourceBuffer, { maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT });
  const inputFaceCount = parsed.faceCount;
  const fitted = fitToPrintableEnvelope(parsed.object);
  let printable: THREE.Mesh | undefined;
  try {
    const manifold = await loadNodeManifold();
    printable = await solidifyObject(manifold, fitted, { printerAxes: false, normalize: false });
    printable.name = "tripo_printable_source";
    printable.geometry.computeVertexNormals();
    const previousMaterial = printable.material;
    printable.material = new THREE.MeshStandardMaterial({
      color: "#789269",
      roughness: 0.82,
      flatShading: false,
    });
    if (Array.isArray(previousMaterial)) previousMaterial.forEach((material) => material.dispose());
    else previousMaterial.dispose();

    globalThis.FileReader = NodeFileReader as unknown as typeof FileReader;
    const exported = await new GLTFExporter().parseAsync(printable, {
      binary: true,
      onlyVisible: true,
      includeCustomExtensions: false,
    });
    if (!(exported instanceof ArrayBuffer)) throw new Error("GLTFExporter did not return a binary GLB.");
    await writeFile(output, Buffer.from(exported));

    const checked = await parseTripoGlb(exported.slice(0), { maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT });
    console.log(
      `Prepared ${path.basename(output)}: ${inputFaceCount.toLocaleString()} source faces → ${checked.faceCount.toLocaleString()} closed faces, ${(exported.byteLength / 1024).toFixed(1)} KiB, ${TARGET_WIDTH}×${TARGET_HEIGHT} mm envelope`,
    );
    disposeObject(checked.object);
  } finally {
    if (printable) disposeObject(printable);
    disposeObject(fitted);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
