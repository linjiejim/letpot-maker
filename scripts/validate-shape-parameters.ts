import assert from "node:assert/strict";
import {
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  getDefaultShapeParameters,
  MODEL_LIBRARY,
  type ShapeParameterKey,
} from "../lib/model-factory";
import { loadNodeManifold, solidifyObject } from "../lib/solidify";

const wasm = await loadNodeManifold();
let validatedVariants = 0;

for (const definition of MODEL_LIBRARY.filter((item) => item.parameters?.length)) {
  const defaults = getDefaultShapeParameters(definition);
  const variants = (definition.parameters ?? []).flatMap((parameter) => ([
    { name: `${parameter.key} minimum`, shape: { ...defaults, [parameter.key]: parameter.min } },
    { name: `${parameter.key} maximum`, shape: { ...defaults, [parameter.key]: parameter.max } },
  ])) as Array<{ name: string; shape: Partial<Record<ShapeParameterKey, number>> }>;
  const parameters = definition.parameters ?? [];
  const corners = Array.from({ length: 2 ** parameters.length }, (_, mask) => ({
    name: `corner ${mask.toString(2).padStart(parameters.length, "0")}`,
    shape: Object.fromEntries(parameters.map((parameter, index) => [
      parameter.key,
      mask & (1 << index) ? parameter.max : parameter.min,
    ])) as Partial<Record<ShapeParameterKey, number>>,
  }));
  for (const variant of [{ name: "defaults", shape: defaults }, ...variants, ...corners]) {
    const build = createModel({
      ...DEFAULT_OPTIONS,
      modelId: definition.id,
      ...definition.defaults,
      faceted: definition.style === "lowpoly",
      shape: variant.shape,
    });

    try {
      assert.ok(
        build.measurements.topperWidth <= definition.defaults.topperWidth + 0.1,
        `${definition.name} ${variant.name} exceeded the fixed topper width envelope`,
      );
      assert.ok(
        build.measurements.topperHeight <= definition.defaults.topperHeight + 0.1,
        `${definition.name} ${variant.name} exceeded the fixed topper height envelope`,
      );
      for (const part of build.parts) {
        const solid = await solidifyObject(wasm, part.object, { flipZ: part.printFlipZ });
        disposeObject(solid);
      }
      validatedVariants += 1;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${definition.name} ${variant.name} parameter boundary failed: ${detail}`);
    } finally {
      disposeObject(build.assembly);
    }
  }
}

console.log(`Validated ${validatedVariants} parametric boundary variants as connected manifold parts.`);
