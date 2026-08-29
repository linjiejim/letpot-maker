import { disposeObject, type ModelDefinition } from "./model-factory";
import {
  parseTripoGlb,
  TRIPO_LOCAL_MESH_FACE_LIMIT,
  type ParsedTripoMesh,
} from "./tripo-mesh";

const MAX_OFFICIAL_GLB_BYTES = 40 * 1024 * 1024;
const officialMeshBuffers = new Map<string, Promise<ArrayBuffer>>();

export async function loadOfficialMesh(
  definition: Pick<ModelDefinition, "id" | "name" | "officialMesh">,
): Promise<ParsedTripoMesh> {
  const asset = definition.officialMesh;
  if (!asset) throw new Error(`${definition.name} has no bundled mesh asset.`);

  let pending = officialMeshBuffers.get(asset.assetPath);
  if (!pending) {
    pending = fetch(asset.assetPath, { cache: "force-cache" }).then(async (response) => {
      if (!response.ok) throw new Error(`Bundled mesh returned HTTP ${response.status}.`);
      const data = await response.arrayBuffer();
      if (!data.byteLength || data.byteLength > MAX_OFFICIAL_GLB_BYTES) {
        throw new Error("Bundled mesh has an invalid file size.");
      }
      return data;
    });
    officialMeshBuffers.set(asset.assetPath, pending);
    void pending.catch(() => officialMeshBuffers.delete(asset.assetPath));
  }

  const parsed = await parseTripoGlb((await pending).slice(0), {
    maxFaceCount: TRIPO_LOCAL_MESH_FACE_LIMIT,
  });
  if (parsed.faceCount !== asset.faceCount) {
    disposeObject(parsed.object);
    throw new Error(
      `Bundled mesh face count changed (${parsed.faceCount.toLocaleString()} instead of ${asset.faceCount.toLocaleString()}).`,
    );
  }
  parsed.object.name = `official_${definition.id}_source`;
  return parsed;
}
