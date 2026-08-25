import assert from "node:assert/strict";
import type * as THREE from "three";
import JSZip from "jszip";
import {
  AI_TEMPLATE_IDS,
  normalizeAiRecipe,
  type AiDesignRecipe,
} from "../lib/ai-design";
import { AI_SCULPTURE_EXAMPLES } from "../lib/ai-shape-examples";
import {
  aiNodeCopyCount,
  normalizeAiShapeProgram,
  type AiShapeKind,
} from "../lib/ai-shape-program";
import {
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  MODEL_LIBRARY,
  type ModelOptions,
} from "../lib/model-factory";
import { POST as generateAiRecipe } from "../app/api/ai-generate/route";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";
import { buildBambuThreeMf, type ThreeMfPart } from "../lib/three-mf";

const wasm = await loadNodeManifold();

const repairedAttachmentProgram = normalizeAiShapeProgram({
  version: 1,
  nodes: [
    { id: "body", kind: "drop", operation: "add", attachTo: "core", position: [0, 0.45, 0], size: [0.6, 0.7, 0.5], symmetry: "none" },
    { id: "eye", kind: "disc", operation: "add", attachTo: "core", position: [0.16, 0.62, 0.28], size: [0.12, 0.12, 0.07], symmetry: "mirror-x" },
    { id: "seed", kind: "ellipsoid", operation: "add", attachTo: "missing-face", position: [0.14, 0.48, 0.3], size: [0.08, 0.11, 0.07], symmetry: "radial-6-z" },
  ],
});
assert.equal(repairedAttachmentProgram.nodes[1].attachTo, "body", "Elevated core details should attach to the nearest earlier solid");
assert.equal(repairedAttachmentProgram.nodes[2].attachTo, "eye", "Unknown detail parents should resolve to the nearest earlier solid");
assert.equal(aiNodeCopyCount(repairedAttachmentProgram.nodes[2].symmetry), 6);

const boundedRingProgram = normalizeAiShapeProgram({
  version: 1,
  nodes: [
    { id: "body", kind: "rounded-box", operation: "add", attachTo: "core", position: [0, 0.4, 0], size: [0.5, 0.5, 0.4] },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `ring-${index}`,
      kind: "torus",
      operation: "add",
      attachTo: "body",
      position: [0, 0.45 + index * 0.04, 0.22],
      size: [0.2, 0.2, 0.08],
    })),
  ],
});
assert.equal(boundedRingProgram.nodes.filter((node) => node.kind === "torus").length, 2, "Decorative ring spam must be bounded");

async function validateRecipe(
  recipe: AiDesignRecipe,
  connectionMode: ModelOptions["connectionMode"] = "detachable",
) {
  const definition = MODEL_LIBRARY.find((item) => item.id === recipe.templateId);
  if (!definition) throw new Error(`Unknown AI template ${recipe.templateId}`);
  const options: ModelOptions = {
    ...DEFAULT_OPTIONS,
    connectionMode,
    modelId: recipe.templateId,
    topperHeight: recipe.topperHeight,
    topperWidth: recipe.topperWidth,
    primaryColor: recipe.primaryColor,
    accentColor: recipe.accentColor,
    secondaryColor: recipe.secondaryColor,
    detailColor: recipe.detailColor,
    faceted: recipe.faceted,
    shape: recipe.shape,
    aiProgram: recipe.program,
  };
  const build = createModel(options);
  assert.equal(build.parts.length === 1, connectionMode === "integrated");
  const solids: THREE.Mesh[] = [];
  try {
    for (const part of build.parts) {
      const solid = await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ });
      solids.push(solid);
    }
    const projectParts: ThreeMfPart[] = solids.map((solid, index) => ({
      name: build.parts[index].label,
      mesh: solid,
      color: build.parts[index].color,
      palette: build.parts[index].palette,
    }));
    const project = await buildBambuThreeMf(projectParts, "a1-mini", recipe.name);
    if (project.size < 10_000) throw new Error(`${recipe.name} produced an incomplete A1 mini project`);
    if (recipe.program) {
      const archive = await JSZip.loadAsync(await project.arrayBuffer());
      const modelXml = await archive.file("3D/3dmodel.model")!.async("text");
      assert.match(modelXml, /<triangle[^>]+pid="1" p1="[0-9]+"/);
      const usedRoles = new Set(recipe.program.nodes.filter((node) => node.operation === "add").map((node) => node.color));
      const expectedColors = [
        recipe.primaryColor,
        ...(usedRoles.has("secondary") ? [recipe.secondaryColor] : []),
        ...(usedRoles.has("detail") ? [recipe.detailColor] : []),
        ...(connectionMode === "integrated" ? [recipe.accentColor] : []),
      ];
      for (const expected of expectedColors) {
        assert.ok(modelXml.includes(expected.toUpperCase()), `${recipe.name} 3MF omitted palette color ${expected}`);
      }
    }
  } finally {
    solids.forEach((solid) => disposeObject(solid));
    disposeObject(build.assembly);
  }
}

for (const templateId of AI_TEMPLATE_IDS) {
  const definition = MODEL_LIBRARY.find((item) => item.id === templateId);
  if (!definition) throw new Error(`Missing AI template ${templateId}`);
  const shape = Object.fromEntries((definition.parameters ?? []).map((parameter, index) => [
    parameter.key,
    index % 2 === 0 ? parameter.max + parameter.step * 10 : parameter.min - parameter.step * 10,
  ]));
  const recipe = normalizeAiRecipe({
    name: `Boundary ${definition.name}`,
    subtitle: "AI boundary validation",
    templateId,
    topperHeight: 999,
    topperWidth: -999,
    primaryColor: "#769567",
    accentColor: "not-a-color",
    faceted: definition.style === "lowpoly",
    shape,
    creativeNote: "Clamped recipe validation.",
  });
  await validateRecipe(recipe);
}

for (const example of AI_SCULPTURE_EXAMPLES) {
  const recipe = normalizeAiRecipe(example.recipe);
  await validateRecipe(recipe, "detachable");
  await validateRecipe(recipe, "integrated");
  console.log(`Validated open sculpture fixture in both connection modes: ${recipe.name} (${recipe.program?.nodes.length ?? 0} nodes).`);
}

for (const kind of ["half-disc", "dome", "drop"] satisfies AiShapeKind[]) {
  const recipe = normalizeAiRecipe({
    mode: "sculpture",
    name: `Vocabulary ${kind}`,
    subtitle: "Closed-solid vocabulary validation",
    templateId: "sprout",
    topperHeight: 34,
    topperWidth: 30,
    primaryColor: "#769567",
    secondaryColor: "#d8a33e",
    detailColor: "#f4eee2",
    accentColor: "#d7d0bf",
    faceted: false,
    shape: {},
    creativeNote: "Validate every new shape kind through the production solid pipeline.",
    program: {
      version: 1,
      nodes: [{
        id: kind,
        kind,
        operation: "add",
        attachTo: "core",
        position: [0, 0.42, 0],
        size: [0.62, 0.62, 0.5],
        rotation: [0, 0, 0],
        color: "primary",
        symmetry: "none",
        segments: 14,
      }],
    },
  });
  await validateRecipe(recipe, "detachable");
  await validateRecipe(recipe, "integrated");
  console.log(`Validated closed shape vocabulary in both connection modes: ${kind}.`);
}

const liveFlag = process.argv.indexOf("--live");
if (liveFlag >= 0) {
  const baseUrl = process.argv[liveFlag + 1];
  if (!baseUrl) throw new Error("--live requires a base URL");
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/ai-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "A compact sage cactus with three friendly upward arms" }),
  });
  const body = await response.json() as { recipe?: unknown; error?: string };
  if (!response.ok || !body.recipe) throw new Error(body.error || `Live AI request failed with ${response.status}`);
  const recipe = normalizeAiRecipe(body.recipe);
  await validateRecipe(recipe);
  console.log(`Live AI recipe ${recipe.name} (${recipe.templateId}) solidified in ${Date.now() - startedAt} ms.`);
}

const directFlag = process.argv.indexOf("--direct");
const directPromptFlag = process.argv.indexOf("--direct-prompt");
if (directFlag >= 0 || directPromptFlag >= 0) {
  const prompts = directPromptFlag >= 0
    ? [process.argv[directPromptFlag + 1] || ""]
    : [
      "A compact friendly cactus with three upward arms and a sturdy round body",
      "A broad coral mushroom cap with a thick short stem and visible radial gills",
      "A dense bamboo grove with five slender canes and several leaf clusters",
    ];
  if (prompts.some((prompt) => !prompt)) throw new Error("--direct-prompt requires a prompt value");
  for (const prompt of prompts) {
    const startedAt = Date.now();
    const response = await generateAiRecipe(new Request("http://local/api/ai-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }));
    const body = await response.json() as { recipe?: unknown; error?: string };
    if (!response.ok || !body.recipe) throw new Error(body.error || `Direct AI request failed with ${response.status}`);
    const recipe = normalizeAiRecipe(body.recipe);
    await validateRecipe(recipe);
    console.log(`Direct recipe ${recipe.name} (${recipe.templateId}) solidified in ${Date.now() - startedAt} ms.`);
  }
}

console.log(`Validated ${AI_TEMPLATE_IDS.length} AI library families and ${AI_SCULPTURE_EXAMPLES.length} open sculpture types as connected manifold print parts.`);
