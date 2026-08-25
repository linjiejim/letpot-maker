export const AI_SHAPE_KINDS = [
  "ellipsoid",
  "rounded-box",
  "cylinder",
  "cone",
  "capsule",
  "torus",
  "roof",
  "disc",
  "half-disc",
  "dome",
  "drop",
  "leaf",
  "star",
  "heart",
] as const;

export const AI_COLOR_ROLES = ["primary", "secondary", "detail"] as const;
export const AI_NODE_OPERATIONS = ["add", "subtract"] as const;
export const AI_NODE_SYMMETRIES = [
  "none",
  "mirror-x",
  "mirror-z",
  "radial-3-y",
  "radial-4-y",
  "radial-5-y",
  "radial-6-y",
  "radial-8-y",
  "radial-3-z",
  "radial-4-z",
  "radial-5-z",
  "radial-6-z",
  "radial-8-z",
] as const;

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
  maxExpandedNodes: 64,
  maxCutters: 5,
  maxTorusNodes: 2,
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
  if (kind === "rounded-box" || kind === "roof" || kind === "half-disc") return 6;
  if (kind === "star") return 5;
  return 12;
}

function supportRadius(size: AiVector3, direction: AiVector3) {
  const denominator = direction.reduce((total, component, axis) => {
    const halfSize = Math.max(0.001, size[axis] / 2);
    return total + component * component / (halfSize * halfSize);
  }, 0);
  return denominator > 0 ? 1 / Math.sqrt(denominator) : 0;
}

function pullAttachedNodeIntoParent(node: AiShapeNode, parent: AiShapeNode) {
  const delta = node.position.map((component, axis) => component - parent.position[axis]) as AiVector3;
  const distance = Math.hypot(...delta);
  if (distance < 0.001) return;
  const direction = delta.map((component) => component / distance) as AiVector3;
  const touchingDistance = supportRadius(parent.size, direction) + supportRadius(node.size, direction);
  // Preserve intentional surface relief such as doors and windows. Only
  // repair a clearly visible air gap, then pull the child just inside its
  // parent's conservative support radius.
  if (distance <= touchingDistance + 0.06 || touchingDistance < 0.03) return;
  const overlapDistance = Math.max(0.03, touchingDistance - Math.min(0.02, Math.min(...node.size) * 0.12));
  node.position = parent.position.map((component, axis) => Number(
    (component + direction[axis] * overlapDistance).toFixed(3),
  )) as AiVector3;
}

export function aiNodeCopyCount(symmetry: AiNodeSymmetry) {
  if (symmetry === "mirror-x" || symmetry === "mirror-z") return 2;
  const radial = /^radial-(3|4|5|6|8)-(?:y|z)$/.exec(symmetry);
  return radial ? Number(radial[1]) : 1;
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
  const additiveNodes: AiShapeNode[] = [];
  const usedIds = new Set<string>();
  let cutterCount = 0;
  let expandedNodeCount = 0;
  let torusCount = 0;

  for (const [index, rawNode] of rawNodes.slice(0, AI_PROGRAM_LIMITS.maxNodes).entries()) {
    if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) continue;
    const input = rawNode as Record<string, unknown>;
    const rawKind = typeof input.kind === "string" ? input.kind.trim().toLowerCase() : "";
    if (!KIND_SET.has(rawKind)) continue;
    const kind = rawKind as AiShapeKind;
    if (kind === "torus") {
      torusCount += 1;
      if (torusCount > AI_PROGRAM_LIMITS.maxTorusNodes) continue;
    }

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
    const rawColor = typeof input.color === "string" ? input.color.trim().toLowerCase() : "primary";
    const rawSymmetry = typeof input.symmetry === "string" ? input.symmetry.trim().toLowerCase() : "none";

    let symmetry: AiNodeSymmetry = operation === "add" && SYMMETRY_SET.has(rawSymmetry)
      ? rawSymmetry as AiNodeSymmetry
      : "none";
    if (expandedNodeCount + aiNodeCopyCount(symmetry) > AI_PROGRAM_LIMITS.maxExpandedNodes) symmetry = "none";
    expandedNodeCount += aiNodeCopyCount(symmetry);

    const node: AiShapeNode = {
      id,
      kind,
      operation,
      attachTo: operation === "add" && additiveIds.has(requestedAttach) ? requestedAttach : "core",
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
      symmetry,
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
    } else if (additiveNodes.length > 0) {
      // A high detail accidentally attached to core creates a visible support
      // spoke. Reattach it to the nearest earlier solid while preserving low
      // roots such as feet and tentacles that genuinely rise from the base.
      const shouldRepairCoreAttachment = node.attachTo === "core" && node.position[1] > 0.32;
      const shouldRepairUnknownAttachment = requestedAttach !== "core" && !additiveIds.has(requestedAttach);
      if (shouldRepairCoreAttachment || shouldRepairUnknownAttachment) {
        node.attachTo = additiveNodes.reduce((nearest, candidate) => {
          const distance = candidate.position.reduce((total, component, axis) => {
            const delta = component - node.position[axis];
            return total + delta * delta;
          }, 0);
          const nearestDistance = nearest.position.reduce((total, component, axis) => {
            const delta = component - node.position[axis];
            return total + delta * delta;
          }, 0);
          return distance < nearestDistance ? candidate : nearest;
        }).id;
      }
      if (node.attachTo !== "core") {
        const parent = additiveNodes.find((candidate) => candidate.id === node.attachTo);
        if (parent) pullAttachedNodeIntoParent(node, parent);
      }
    }
    nodes.push(node);
    if (operation === "add") {
      additiveIds.add(id);
      additiveNodes.push(node);
    }
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
    kindGuide: {
      disc: "A closed round slab facing +Z; use for cut fruit faces, eyes, shields, clocks and portholes without rotating a cylinder.",
      "half-disc": "A closed semicircular slab facing +Z with a flat lower edge; use for visible cutaways, shells, smiles and arched silhouettes.",
      dome: "A closed round cap with a flat bottom; use for helmets, mushroom caps and rounded roofs.",
      drop: "A closed tapered organic solid; use for fruit, noses, ears, seeds and teardrop bodies.",
      roof: "A closed triangular prism whose pitched face reads from +Z.",
      leaf: "A closed pointed slab facing +Z; rotate it for fins, leaves, ears and broad sturdy petals.",
      torus: "A complete closed ring; use at most one for a necessary rim or porthole, never for necks, waists, joints, soles, fruit flesh or solid eyes.",
    },
    colors: AI_COLOR_ROLES,
    operations: AI_NODE_OPERATIONS,
    symmetry: AI_NODE_SYMMETRIES,
    symmetryGuide: {
      "mirror-x": "One left/right pair across X=0.",
      "mirror-z": "One front/back pair across Z=0.",
      "radial-N-y": "N copies around the vertical Y axis for petals, fins, arms and crowns; N is 3, 4, 5, 6 or 8.",
      "radial-N-z": "N copies in the visible XY face around the node's Y position for seeds, bolts, eyespots and face details; set X to the ring radius and Z to the front surface.",
    },
    viewRule: "The primary readable face points toward +Z. Put doors, eyes, visors, seeds and other identity details on the +Z surface.",
    connectionRule: "Every additive node attaches to core or an earlier additive node. The compiler adds a hidden printable fusion bridge.",
    limits: AI_PROGRAM_LIMITS,
  };
}
