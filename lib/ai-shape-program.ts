export const AI_SHAPE_KINDS = [
  "ellipsoid",
  "rounded-box",
  "cylinder",
  "cone",
  "capsule",
  "torus",
  "roof",
  "leaf",
  "star",
  "heart",
] as const;

export const AI_COLOR_ROLES = ["primary", "secondary", "detail"] as const;
export const AI_NODE_OPERATIONS = ["add", "subtract"] as const;
export const AI_NODE_SYMMETRIES = ["none", "mirror-x", "mirror-z"] as const;

export type AiShapeKind = typeof AI_SHAPE_KINDS[number];
export type AiColorRole = typeof AI_COLOR_ROLES[number];
export type AiNodeOperation = typeof AI_NODE_OPERATIONS[number];
export type AiNodeSymmetry = typeof AI_NODE_SYMMETRIES[number];
export type AiVector3 = [number, number, number];

export interface AiShapeNode {
  id: string;
  kind: AiShapeKind;
  operation: AiNodeOperation;
  attachTo: "core" | string;
  position: AiVector3;
  size: AiVector3;
  rotation: AiVector3;
  color: AiColorRole;
  symmetry: AiNodeSymmetry;
  segments: number;
}

export interface AiShapeProgram {
  version: 1;
  nodes: AiShapeNode[];
}

export const AI_PROGRAM_LIMITS = {
  maxNodes: 24,
  maxCutters: 5,
  minSize: 0.06,
  maxSize: 1,
  minY: 0.04,
  maxY: 0.96,
  maxLateralPosition: 0.5,
  maxRotation: 180,
  minSegments: 4,
  maxSegments: 18,
} as const;

const KIND_SET = new Set<string>(AI_SHAPE_KINDS);
const COLOR_SET = new Set<string>(AI_COLOR_ROLES);
const OPERATION_SET = new Set<string>(AI_NODE_OPERATIONS);
const SYMMETRY_SET = new Set<string>(AI_NODE_SYMMETRIES);

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizedVector(
  value: unknown,
  fallback: AiVector3,
  ranges: readonly [readonly [number, number], readonly [number, number], readonly [number, number]],
  precision = 3,
): AiVector3 {
  const source = Array.isArray(value) ? value : [];
  return ranges.map(([min, max], index) => Number(
    clamp(finiteNumber(source[index], fallback[index]), min, max).toFixed(precision),
  )) as AiVector3;
}

function safeId(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const id = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32);
  return id || fallback;
}

function defaultSegments(kind: AiShapeKind) {
  if (kind === "rounded-box" || kind === "roof") return 6;
  if (kind === "star") return 5;
  return 12;
}

export function normalizeAiShapeProgram(value: unknown): AiShapeProgram {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The AI provider did not return a shape program");
  }
  const rawNodes = (value as Record<string, unknown>).nodes;
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
    throw new Error("The AI shape program contains no geometry nodes");
  }

  const nodes: AiShapeNode[] = [];
  const additiveIds = new Set<string>();
  const usedIds = new Set<string>();
  let cutterCount = 0;

  for (const [index, rawNode] of rawNodes.slice(0, AI_PROGRAM_LIMITS.maxNodes).entries()) {
    if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) continue;
    const input = rawNode as Record<string, unknown>;
    const rawKind = typeof input.kind === "string" ? input.kind.trim().toLowerCase() : "";
    if (!KIND_SET.has(rawKind)) continue;
    const kind = rawKind as AiShapeKind;

    const requestedOperation = typeof input.operation === "string" ? input.operation.trim().toLowerCase() : "add";
    let operation = OPERATION_SET.has(requestedOperation) ? requestedOperation as AiNodeOperation : "add";
    if (operation === "subtract") {
      cutterCount += 1;
      if (cutterCount > AI_PROGRAM_LIMITS.maxCutters) operation = "add";
    }

    const baseId = safeId(input.id, `node-${index + 1}`);
    let id = baseId;
    for (let suffix = 2; usedIds.has(id); suffix += 1) id = `${baseId.slice(0, 27)}-${suffix}`;
    usedIds.add(id);

    const requestedAttach = safeId(input.attachTo, "core");
    const attachTo = operation === "add" && additiveIds.has(requestedAttach) ? requestedAttach : "core";
    const rawColor = typeof input.color === "string" ? input.color.trim().toLowerCase() : "primary";
    const rawSymmetry = typeof input.symmetry === "string" ? input.symmetry.trim().toLowerCase() : "none";

    const node: AiShapeNode = {
      id,
      kind,
      operation,
      attachTo,
      position: normalizedVector(input.position, [0, 0.5, 0], [
        [-AI_PROGRAM_LIMITS.maxLateralPosition, AI_PROGRAM_LIMITS.maxLateralPosition],
        [AI_PROGRAM_LIMITS.minY, AI_PROGRAM_LIMITS.maxY],
        [-AI_PROGRAM_LIMITS.maxLateralPosition, AI_PROGRAM_LIMITS.maxLateralPosition],
      ]),
      size: normalizedVector(input.size, [0.3, 0.3, 0.3], [
        [AI_PROGRAM_LIMITS.minSize, AI_PROGRAM_LIMITS.maxSize],
        [AI_PROGRAM_LIMITS.minSize, AI_PROGRAM_LIMITS.maxSize],
        [AI_PROGRAM_LIMITS.minSize, AI_PROGRAM_LIMITS.maxSize],
      ]),
      rotation: normalizedVector(input.rotation, [0, 0, 0], [
        [-AI_PROGRAM_LIMITS.maxRotation, AI_PROGRAM_LIMITS.maxRotation],
        [-AI_PROGRAM_LIMITS.maxRotation, AI_PROGRAM_LIMITS.maxRotation],
        [-AI_PROGRAM_LIMITS.maxRotation, AI_PROGRAM_LIMITS.maxRotation],
      ], 1),
      color: COLOR_SET.has(rawColor) ? rawColor as AiColorRole : "primary",
      symmetry: operation === "add" && SYMMETRY_SET.has(rawSymmetry)
        ? rawSymmetry as AiNodeSymmetry
        : "none",
      segments: Math.round(clamp(
        finiteNumber(input.segments, defaultSegments(kind)),
        AI_PROGRAM_LIMITS.minSegments,
        AI_PROGRAM_LIMITS.maxSegments,
      )),
    };
    if (operation === "subtract") {
      // Keep AI cutters away from the locked socket/boss interface. Cutters
      // are decorative recesses, never through-cuts across the whole topper.
      node.position[1] = Number(clamp(
        node.position[1],
        Math.min(0.82, 0.12 + node.size[1] / 2),
        AI_PROGRAM_LIMITS.maxY,
      ).toFixed(3));
      node.size = node.size.map((component) => Number(Math.min(component, 0.42).toFixed(3))) as AiVector3;
    }
    nodes.push(node);
    if (operation === "add") additiveIds.add(id);
  }

  if (!nodes.some((node) => node.operation === "add")) {
    throw new Error("The AI shape program contains no additive geometry");
  }

  return { version: 1, nodes };
}

export function getAiShapeProgramCatalog() {
  return {
    coordinateSystem: "Normalized: X left/right and Z front/back are -0.5..0.5; Y bottom/top is 0.04..0.96.",
    sizeSystem: "Each size component is a 0.06..1 ratio of the requested topper width/height/depth.",
    kinds: AI_SHAPE_KINDS,
    colors: AI_COLOR_ROLES,
    operations: AI_NODE_OPERATIONS,
    symmetry: AI_NODE_SYMMETRIES,
    connectionRule: "Every additive node attaches to core or an earlier additive node. The compiler adds a hidden printable fusion bridge.",
    limits: AI_PROGRAM_LIMITS,
  };
}
