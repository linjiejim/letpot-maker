import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BufferAttribute, InterleavedBufferAttribute } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ADAPTER_STANDARD } from "../lib/model-factory";

const root = join(process.cwd(), "public/models");
const files = readdirSync(root, { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".stl"));
const loader = new STLLoader();
const failures: string[] = [];

function vertexKey(attribute: BufferAttribute | InterleavedBufferAttribute, index: number) {
  return [attribute.getX(index), attribute.getY(index), attribute.getZ(index)]
    .map((value) => Math.round(value * 10000))
    .join(",");
}

function validateAdapterPrintOrientation(
  relative: string,
  positions: BufferAttribute | InterleavedBufferAttribute,
) {
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < positions.count; index += 1) {
    minZ = Math.min(minZ, positions.getZ(index));
    maxZ = Math.max(maxZ, positions.getZ(index));
  }

  const tolerance = 0.001;
  let bedRadius = 0;
  let topRadius = 0;
  let upperBandJoinRadius = 0;
  let transitionJoinRadius = 0;
  let hasWideProfileAboveBand = false;
  for (let index = 0; index < positions.count; index += 1) {
    const radius = Math.hypot(positions.getX(index), positions.getY(index));
    const z = positions.getZ(index);
    if (Math.abs(z - minZ) <= tolerance) bedRadius = Math.max(bedRadius, radius);
    if (Math.abs(z - maxZ) <= tolerance) topRadius = Math.max(topRadius, radius);
    if (Math.abs(z - (minZ + ADAPTER_STANDARD.upperBandHeight)) <= 0.002) {
      upperBandJoinRadius = Math.max(upperBandJoinRadius, radius);
    }
    if (Math.abs(z - (
      minZ + ADAPTER_STANDARD.upperBandHeight + ADAPTER_STANDARD.transitionHeight
    )) <= 0.002) {
      transitionJoinRadius = Math.max(transitionJoinRadius, radius);
    }
    if (
      z > minZ + ADAPTER_STANDARD.upperBandHeight + 0.02
      && radius >= ADAPTER_STANDARD.upperDiameter / 2 - 0.02
    ) {
      hasWideProfileAboveBand = true;
    }
  }

  const height = maxZ - minZ;
  const expectedBedRadius = ADAPTER_STANDARD.upperDiameter / 2;
  const expectedNarrowRadius = ADAPTER_STANDARD.lowerDiameter / 2;
  if (
    Math.abs(bedRadius - expectedBedRadius) > 0.03
    || Math.abs(topRadius - expectedNarrowRadius) > 0.03
    || Math.abs(upperBandJoinRadius - expectedBedRadius) > 0.03
    || Math.abs(transitionJoinRadius - expectedNarrowRadius) > 0.03
    || Math.abs(height - ADAPTER_STANDARD.totalHeight) > 0.03
    || hasWideProfileAboveBand
  ) {
    throw new Error(
      `${relative}: adapter print orientation is reversed or out of spec `
      + `(bed radius ${bedRadius.toFixed(2)} mm, top radius ${topRadius.toFixed(2)} mm, `
      + `upper band join radius ${upperBandJoinRadius.toFixed(2)} mm, `
      + `transition join radius ${transitionJoinRadius.toFixed(2)} mm, height ${height.toFixed(2)} mm, `
      + `wide profile above upper band ${hasWideProfileAboveBand ? "present" : "absent"})`,
    );
  }
}

function validateConnectorPinDimensions(
  relative: string,
  positions: BufferAttribute | InterleavedBufferAttribute,
) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < positions.count; index += 1) {
    minX = Math.min(minX, positions.getX(index));
    maxX = Math.max(maxX, positions.getX(index));
    minY = Math.min(minY, positions.getY(index));
    maxY = Math.max(maxY, positions.getY(index));
    minZ = Math.min(minZ, positions.getZ(index));
    maxZ = Math.max(maxZ, positions.getZ(index));
  }

  const spans = [maxX - minX, maxY - minY].sort((a, b) => a - b);
  const height = maxZ - minZ;
  const expectedAcrossFlats = Math.sqrt(3) * 3.96;
  const expectedAcrossCorners = 2 * 3.96;
  if (
    Math.abs(spans[0] - expectedAcrossFlats) > 0.02
    || Math.abs(spans[1] - expectedAcrossCorners) > 0.02
    || Math.abs(height - 7.4) > 0.02
  ) {
    throw new Error(
      `${relative}: connector pin is out of R3.96 specification `
      + `(${spans[0].toFixed(2)} × ${spans[1].toFixed(2)} × ${height.toFixed(2)} mm)`,
    );
  }
}

for (const relative of files) {
  try {
    const bytes = readFileSync(join(root, relative));
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const geometry = loader.parse(data);
    const positions = geometry.getAttribute("position");
    const triangleCount = positions.count / 3;
    if (!Number.isInteger(triangleCount) || triangleCount < 4) {
      throw new Error(`${relative}: invalid triangle count`);
    }

    if (relative.endsWith("/01-adapter.stl")) {
      validateAdapterPrintOrientation(relative, positions);
    }
    if (relative.endsWith("/02-connector-pin.stl")) {
      validateConnectorPinDimensions(relative, positions);
    }

    const edgeTriangles = new Map<string, number[]>();
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      const vertices = [0, 1, 2].map((corner) => vertexKey(positions, triangle * 3 + corner));
      for (const [from, to] of [[0, 1], [1, 2], [2, 0]]) {
        const edge = [vertices[from], vertices[to]].sort().join("|");
        const owners = edgeTriangles.get(edge) ?? [];
        owners.push(triangle);
        edgeTriangles.set(edge, owners);
      }
    }

    const badEdges = [...edgeTriangles.values()].filter((owners) => owners.length !== 2);
    if (badEdges.length > 0) {
      throw new Error(`${relative}: ${badEdges.length} open or non-manifold edges`);
    }

    const adjacency = Array.from({ length: triangleCount }, () => new Set<number>());
    edgeTriangles.forEach(([a, b]) => {
      adjacency[a].add(b);
      adjacency[b].add(a);
    });
    const visited = new Set<number>([0]);
    const queue = [0];
    while (queue.length) {
      const current = queue.shift()!;
      adjacency[current].forEach((next) => {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      });
    }
    if (visited.size !== triangleCount) {
      throw new Error(`${relative}: disconnected shells detected (${visited.size}/${triangleCount} triangles connected)`);
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : `${relative}: unknown validation failure`);
  }
}

if (failures.length > 0) {
  throw new Error(`STL validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(
  `Validated ${files.length} STL files: closed, manifold, single-component, and adapters correctly oriented.`,
);
