import { readFile } from "node:fs/promises";
import path from "node:path";
import { disposeObject, type ModelDefinition } from "./model-factory";
import { parseTripoGlb, TRIPO_LOCAL_MESH_FACE_LIMIT, type ParsedTripoMesh } from "./tripo-mesh";

export async function loadOfficialMeshForNode(
  definition: ModelDefinition,
): Promise<ParsedTripoMesh | null> {
  const asset = definition.officialMesh;
  if (!asset) return null;
  if (!asset.assetPath.startsWith("/models/official/")) {
    throw new Error(`${definition.id}: official mesh must live under /models/official/.`);
  }
  const filename = path.resolve("public", asset.assetPath.slice(1));
  const bytes = await readFile(filename);
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const parsed = await parseTripoGlb(data, { maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT });
  if (parsed.faceCount !== asset.faceCount) {
    disposeObject(parsed.object);
    throw new Error(
      `${definition.id}: expected ${asset.faceCount.toLocaleString()} official faces, got ${parsed.faceCount.toLocaleString()}.`,
    );
  }
  parsed.object.name = `official_${definition.id}_source`;
  return parsed;
}
