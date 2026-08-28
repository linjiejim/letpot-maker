import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODEL_LIBRARY } from "../lib/model-factory";

const official = MODEL_LIBRARY.filter((definition) => definition.officialMesh);
const collections = new Map<string, typeof official>();

for (const definition of official) {
  const asset = definition.officialMesh!;
  const match = asset.assetPath.match(/^\/models\/official\/([^/]+)\/[^/]+\.glb$/);
  if (!match) throw new Error(`${definition.id}: invalid official asset path ${asset.assetPath}`);
  const collection = match[1];
  collections.set(collection, [...(collections.get(collection) ?? []), definition]);
}

function serialize(definitions: typeof official) {
  return definitions.map((definition) => ({
    id: definition.id,
    number: definition.number,
    name: definition.name,
    tags: definition.tags,
    glb: path.posix.basename(definition.officialMesh!.assetPath),
    preview: `previews/${path.posix.basename(definition.officialMesh!.previewPath)}`,
    faces: definition.officialMesh!.faceCount,
    generation: definition.officialMesh!.generation,
    defaultEnvelope: [definition.defaults.topperWidth, definition.defaults.topperHeight],
  }));
}

const root = path.resolve("public/models/official");
await mkdir(root, { recursive: true });
await writeFile(path.join(root, "manifest.json"), `${JSON.stringify({
  schema: "letpot-maker/official-meshes/v2",
  units: "millimetres",
  texture: false,
  adapterIncluded: false,
  connection: "Studio adds the code-owned direct blind socket, connector pin and fixed Ø33/Ø41 adapter at export time.",
  expansionBatch: {
    jobs: 48,
    credits: 950,
    imageTo3d: { jobs: 47, creditsEach: 20 },
    textTo3d: { jobs: 1, creditsEach: 10, model: "starfish-friend" },
  },
  collections: [...collections.entries()].map(([id, definitions]) => ({ id, models: serialize(definitions) })),
}, null, 2)}\n`, "utf8");

for (const [collection, definitions] of collections) {
  const directory = path.join(root, collection);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "manifest.json"), `${JSON.stringify({
    schema: "letpot-maker/official-meshes/v2",
    collection,
    units: "millimetres",
    texture: false,
    adapterIncluded: false,
    models: serialize(definitions),
  }, null, 2)}\n`, "utf8");
}

console.log(`Generated ${collections.size} official collection manifests for ${official.length} bundled meshes.`);
