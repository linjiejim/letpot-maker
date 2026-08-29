import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  type ModelOptions,
} from "../lib/model-factory";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";
import { parseTripoGlb, TRIPO_LOCAL_MESH_FACE_LIMIT } from "../lib/tripo-mesh";

type BatchCandidate = {
  id: string;
  name: string;
  topperWidth: number;
  topperHeight: number;
  color: string;
};

type BatchFile = {
  schema: "letpot-maker/tripo-image-batch/v1";
  candidates: BatchCandidate[];
};

async function main() {
  const [batchArgument, directoryArgument] = process.argv.slice(2);
  if (!batchArgument || !directoryArgument) {
    throw new Error("Usage: node --import tsx scripts/validate-official-mesh-directory.ts batch.json prepared-directory");
  }
  const batch = JSON.parse(await readFile(path.resolve(batchArgument), "utf8")) as BatchFile;
  assert.equal(batch.schema, "letpot-maker/tripo-image-batch/v1");
  const directory = path.resolve(directoryArgument);
  const mountOnly = process.argv.includes("--mount-only");
  const wasm = mountOnly ? null : await loadNodeManifold();
  const report: Array<Record<string, string | number | boolean>> = [];

  for (const candidate of batch.candidates) {
    const bytes = await readFile(path.join(directory, `${candidate.id}.glb`));
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const parsed = await parseTripoGlb(data, { maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT });
    let mountMode = "unknown";
    try {
      const connectionModes = mountOnly
        ? ["detachable"] as const
        : ["detachable", "integrated"] satisfies ModelOptions["connectionMode"][];
      for (const connectionMode of connectionModes) {
        const build = createModel({
          ...DEFAULT_OPTIONS,
          modelId: "sprout",
          connectionMode,
          topperWidth: candidate.topperWidth,
          topperHeight: candidate.topperHeight,
          primaryColor: candidate.color,
          faceted: false,
          externalMesh: parsed.object,
        });
        const solids = [];
        try {
          if (connectionMode === "detachable") {
            const topper = build.assembly.getObjectByName("tripo_mesh_topper");
            mountMode = String(topper?.userData.externalMeshMountMode || "unknown");
          }
          for (const part of build.parts) {
            if (wasm) solids.push(await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ }));
          }
        } finally {
          solids.forEach(disposeObject);
          disposeObject(build.assembly);
        }
      }
      report.push({
        id: candidate.id,
        faces: parsed.faceCount,
        bytes: bytes.byteLength,
        mountMode,
        valid: true,
      });
      console.log(`${candidate.id}\t${parsed.faceCount}\t${mountMode}\tvalid`);
    } finally {
      disposeObject(parsed.object);
    }
  }

  const fallback = report.filter(({ mountMode }) => mountMode !== "direct-socket");
  console.log(JSON.stringify({ count: report.length, fallback: fallback.map(({ id }) => id), report }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
