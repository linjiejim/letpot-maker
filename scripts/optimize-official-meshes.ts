import { readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { NodeIO, type Document } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { reorder, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { MODEL_LIBRARY } from "../lib/model-factory";
import { disposeObject } from "../lib/model-factory";
import { parseTripoGlb, TRIPO_LOCAL_MESH_FACE_LIMIT } from "../lib/tripo-mesh";

function documentFaceCount(document: Document) {
  return document.getRoot().listMeshes().reduce((meshTotal, mesh) => meshTotal + mesh.listPrimitives().reduce(
    (primitiveTotal, primitive) => {
      const position = primitive.getAttribute("POSITION");
      const elementCount = primitive.getIndices()?.getCount() ?? position?.getCount() ?? 0;
      return primitiveTotal + Math.floor(elementCount / 3);
    },
    0,
  ), 0);
}

async function main() {
  if (!process.argv.includes("--write")) {
    throw new Error("Refusing to overwrite tracked GLBs without --write. Run `npm run official:optimize`.");
  }

  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({
      "meshopt.decoder": MeshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
    });
  const requestedIds = new Set(process.argv.slice(2).filter((argument) => !argument.startsWith("--")));
  const definitions = MODEL_LIBRARY.filter((item) => item.officialMesh && (!requestedIds.size || requestedIds.has(item.id)));
  if (!definitions.length) throw new Error("No matching Official mesh IDs were provided.");

  let originalBytes = 0;
  let optimizedBytes = 0;
  for (const definition of definitions) {
    const assetPath = path.resolve("public", definition.officialMesh!.assetPath.replace(/^\//, ""));
    const temporaryPath = `${assetPath}.optimized.tmp.glb`;
    const before = await stat(assetPath);
    originalBytes += before.size;
    const document = await io.read(assetPath);
    const inputFaces = documentFaceCount(document);

    await document.transform(weld());
    await document.transform(reorder({ encoder: MeshoptEncoder, target: "size" }));
    document.getRoot().listExtensionsUsed()
      .find((extension) => extension.extensionName === EXTMeshoptCompression.EXTENSION_NAME)
      ?.dispose();
    document.createExtension(EXTMeshoptCompression)
      .setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

    try {
      await io.write(temporaryPath, document);
      const output = await readFile(temporaryPath);
      const outputBuffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
      const parsed = await parseTripoGlb(outputBuffer, { maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT });
      const outputFaces = parsed.faceCount;
      disposeObject(parsed.object);
      if (outputFaces !== inputFaces) throw new Error(`${definition.id}: compression changed the face count.`);
      await rename(temporaryPath, assetPath);
      const after = await stat(assetPath);
      optimizedBytes += after.size;
      console.log(
        `${definition.name}: ${inputFaces.toLocaleString()} → ${outputFaces.toLocaleString()} faces, `
        + `${(before.size / 1024).toFixed(1)} → ${(after.size / 1024).toFixed(1)} KiB`,
      );
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  console.log(
    `Optimized ${definitions.length} Official GLBs: `
    + `${(originalBytes / 1024 / 1024).toFixed(2)} → ${(optimizedBytes / 1024 / 1024).toFixed(2)} MiB `
    + `(${Math.round((1 - optimizedBytes / originalBytes) * 100)}% smaller).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
