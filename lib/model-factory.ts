import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { AiColorRole, AiShapeNode, AiShapeProgram } from "./ai-shape-program";
import {
  OFFICIAL_EXPANSION_MODELS,
  OFFICIAL_MESH_UPGRADES,
  type OfficialExpansionModelId,
} from "./official-expansion";

export type ModelId =
  | OfficialExpansionModelId
  | "sprout"
  | "pine"
  | "cactus"
  | "mushroom"
  | "pumpkin"
  | "acorn"
  | "bonsai"
  | "strawberry"
  | "clover"
  | "lotus"
  | "aloe"
  | "snakeplant"
  | "eggplant"
  | "grapes"
  | "sunflower"
  | "snail"
  | "frog"
  | "hedgehog"
  | "tomato"
  | "carrot"
  | "chili"
  | "basil"
  | "rosemary"
  | "parsley"
  | "daisy"
  | "rose"
  | "lemon"
  | "bamboo"
  | "santa"
  | "christmas-tree"
  | "snowman"
  | "reindeer"
  | "gift-box"
  | "candy-cane"
  | "christmas-bell";

export const MODEL_TAGS = [
  "lowpoly",
  "realistic",
  "veggie",
  "herbs",
  "tree",
  "fruit",
  "flower",
  "animal",
  "christmas",
  "plant",
  "space",
  "insect",
  "ocean",
  "holiday",
  "pet",
  "other",
] as const;

export type ModelTag = typeof MODEL_TAGS[number];

export const SUBJECT_MODEL_TAGS = MODEL_TAGS.filter(
  (tag): tag is Exclude<ModelTag, "lowpoly" | "realistic"> => tag !== "lowpoly" && tag !== "realistic",
);

export const MODEL_STYLE_FAMILIES = ["soft-sculpt", "low-poly", "smooth-organic"] as const;
export type ModelStyleFamily = typeof MODEL_STYLE_FAMILIES[number];

export type ShapeParameterKey =
  | "leafPairs"
  | "leafScale"
  | "leafSpread"
  | "stemThickness"
  | "tierCount"
  | "crownFullness"
  | "trunkThickness"
  | "tipRoundness"
  | "armCount"
  | "bodyPlumpness"
  | "armRise"
  | "ribCount"
  | "capDiameter"
  | "capDome"
  | "gillCount"
  | "fruitCount"
  | "fruitSize"
  | "branchSpread"
  | "leafDensity"
  | "caneCount"
  | "nodeCount"
  | "caneThickness";

export interface ShapeParameterDefinition {
  key: ShapeParameterKey;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface ModelOptions {
  modelId: ModelId;
  connectionMode: "detachable" | "integrated";
  topperHeight: number;
  topperWidth: number;
  primaryColor: string;
  accentColor: string;
  secondaryColor?: string;
  detailColor?: string;
  faceted: boolean;
  shape: Partial<Record<ShapeParameterKey, number>>;
  aiProgram?: AiShapeProgram;
  externalMesh?: THREE.Object3D;
}

export interface PrintablePart {
  id: string;
  label: string;
  object: THREE.Object3D;
  color: string;
  palette?: readonly string[];
  printFlipZ?: boolean;
}

export interface ModelBuild {
  assembly: THREE.Group;
  parts: PrintablePart[];
  measurements: {
    width: number;
    height: number;
    topperWidth: number;
    topperHeight: number;
    lowerDiameter: number;
    upperDiameter: number;
  };
}

export interface ModelDefinition {
  id: ModelId;
  number: string;
  name: string;
  subtitle: string;
  difficulty: "Easy" | "Medium";
  parts: number;
  series: "01" | "02" | "03" | "04" | "05";
  style: "lowpoly" | "realistic";
  tags: ModelTag[];
  symbol: string;
  officialMesh?: {
    assetPath: string;
    previewPath: string;
    faceCount: number;
    generation: "Tripo H3.1 image-to-3D" | "Tripo H3.1 text-to-3D";
  };
  parameters?: ShapeParameterDefinition[];
  defaults: Pick<ModelOptions, "topperHeight" | "topperWidth" | "primaryColor" | "accentColor">;
  printNote: string;
}

export function modelStyleFamily(definition: Pick<ModelDefinition, "style" | "officialMesh">): ModelStyleFamily {
  if (definition.officialMesh) return "soft-sculpt";
  return definition.style === "lowpoly" ? "low-poly" : "smooth-organic";
}

export interface ManufacturingProfile {
  status: "Production trial" | "Prototype study";
  orientation: string;
  supportStrategy: string;
  minWall: number;
  minFeature: number;
  batchMode: string;
  stackMode: string;
  details: string[];
}

export const STACK_TRIAL_GAPS = [0.24, 0.32, 0.4] as const;

export const ADAPTER_STANDARD = {
  lowerDiameter: 33,
  upperDiameter: 41,
  lowerHeight: 3.1,
  transitionHeight: 2.3,
  upperBandHeight: 0.2,
  totalHeight: 5.6,
  logoRecessDepth: 0.6,
} as const;

export const TOPPER_SIZE_LIMITS = {
  height: { min: 25, max: 100 },
  width: { min: 20, max: 80 },
  step: 0.5,
} as const;

const PRODUCTION_PROFILES: Partial<Record<ModelId, ManufacturingProfile>> = {
  sprout: {
    status: "Production trial",
    orientation: "Socketed body upright · connector pin vertical",
    supportStrategy: "Support-free leaf angles",
    minWall: 1.6,
    minFeature: 1.6,
    batchMode: "Flat plate · 12–18 toppers",
    stackMode: "Adapter stack only",
    details: ["Raised midribs are fused relief", "Leaf roots overlap the stem by 2.4 mm", "Rounded branch junctions resist snap-off"],
  },
  pine: {
    status: "Production trial",
    orientation: "Socketed body upright · connector pin vertical",
    supportStrategy: "Self-supporting 40–42° skirts",
    minWall: 1.4,
    minFeature: 1.8,
    batchMode: "Flat plate · 9–14 toppers",
    stackMode: "Adapter stack only",
    details: ["Staggered faceted tiers preserve the low-poly silhouette", "Four crown tiers overlap the reinforced trunk", "Root flare removes the narrow trunk-to-base stress point"],
  },
  cactus: {
    status: "Production trial",
    orientation: "Socketed body upright · connector pin vertical",
    supportStrategy: "Rising arms avoid underside support",
    minWall: 1.6,
    minFeature: 1.4,
    batchMode: "Flat plate · 10–16 toppers",
    stackMode: "Adapter stack only",
    details: ["Trunk, arms, ribs and areoles form one body", "Arms rise continuously instead of using flat bridges", "Areoles replace fragile needle geometry"],
  },
  mushroom: {
    status: "Production trial",
    orientation: "Stem and pin upright · cap upside down",
    supportStrategy: "No support with split orientation",
    minWall: 1.4,
    minFeature: 1.2,
    batchMode: "Print cassette or flat plate",
    stackMode: "Adapter stack only",
    details: ["Cap includes a real tapered socket", "Radial gills are printable fused relief", "Lead-in key allows single-color press-fit assembly"],
  },
  clover: {
    status: "Production trial",
    orientation: "All four parts upright on dedicated flat faces",
    supportStrategy: "Support-free geometry with automatic support safety preset",
    minWall: 1.4,
    minFeature: 1.4,
    batchMode: "Four-part flat plate kit",
    stackMode: "Adapter stack only",
    details: ["Flat-bottom trunk replaces the cantilevered peg base", "Independent double-ended hex pin preserves the universal adapter", "Four rounded low-poly leaves overlap a printable crown hub"],
  },
};

export function getManufacturingProfile(modelId: ModelId): ManufacturingProfile {
  return PRODUCTION_PROFILES[modelId] ?? {
    status: "Prototype study",
    orientation: "Socketed body upright · connector pin vertical",
    supportStrategy: "Geometry review required",
    minWall: 1.2,
    minFeature: 1.6,
    batchMode: "Flat plate",
    stackMode: "Adapter stack only",
    details: ["Closed manifold geometry verified", "Connector dimensions are parametric", "Run a detail and overhang audit before production"],
  };
}

const CORE_MODEL_LIBRARY: ModelDefinition[] = [
  {
    id: "sprout",
    number: "01",
    name: "Little Sprout",
    subtitle: "Universal pod topper",
    difficulty: "Easy",
    parts: 3,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "other"],
    symbol: "⌁",
    parameters: [
      { key: "leafPairs", label: "Leaf pairs", min: 2, max: 5, step: 1, defaultValue: 4, unit: "pairs" },
      { key: "leafScale", label: "Leaf size", min: 0.75, max: 1.25, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "leafSpread", label: "Canopy spread", min: 0.75, max: 1.25, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "stemThickness", label: "Stem thickness", min: 0.8, max: 1.3, step: 0.05, defaultValue: 1, unit: "×" },
    ],
    defaults: { topperHeight: 65, topperWidth: 52, primaryColor: "#769567", accentColor: "#d7d0bf" },
    printNote: "Print upright. Reinforced leaf roots, fused midribs and rising leaf angles are tuned for support-free printing.",
  },
  {
    id: "pine",
    number: "02",
    name: "Alpine Pine",
    subtitle: "Stacked evergreen",
    difficulty: "Easy",
    parts: 3,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "tree"],
    symbol: "▲",
    parameters: [
      { key: "tierCount", label: "Crown tiers", min: 3, max: 5, step: 1, defaultValue: 4, unit: "tiers" },
      { key: "crownFullness", label: "Crown fullness", min: 0.8, max: 1.2, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "trunkThickness", label: "Trunk thickness", min: 0.8, max: 1.3, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "tipRoundness", label: "Tip roundness", min: 0.7, max: 1.3, step: 0.05, defaultValue: 1, unit: "×" },
    ],
    defaults: { topperHeight: 42, topperWidth: 30, primaryColor: "#315b3e", accentColor: "#d7d0bf" },
    printNote: "Print upright. Four overlapping branch skirts stay within a support-free FDM slope and lock into the reinforced trunk.",
  },
  {
    id: "cactus",
    number: "03",
    name: "Round Cactus",
    subtitle: "Desert garden friend",
    difficulty: "Easy",
    parts: 3,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "other"],
    symbol: "♣",
    parameters: [
      { key: "armCount", label: "Side arms", min: 1, max: 4, step: 1, defaultValue: 2, unit: "arms" },
      { key: "bodyPlumpness", label: "Body plumpness", min: 0.82, max: 1.22, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "armRise", label: "Arm rise", min: 0.8, max: 1.25, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "ribCount", label: "Rib count", min: 6, max: 10, step: 1, defaultValue: 8, unit: "ribs" },
    ],
    defaults: { topperHeight: 36, topperWidth: 28, primaryColor: "#527d59", accentColor: "#d7d0bf" },
    printNote: "Print upright. Rising arms, rounded areoles and longitudinal ribs merge into one continuous body without fragile needles.",
  },
  {
    id: "mushroom",
    number: "04",
    name: "Forest Cap",
    subtitle: "Mix-and-match mushroom",
    difficulty: "Medium",
    parts: 4,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "other"],
    symbol: "●",
    parameters: [
      { key: "capDiameter", label: "Cap diameter", min: 0.8, max: 1.2, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "capDome", label: "Cap dome", min: 0.75, max: 1.25, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "stemThickness", label: "Stem thickness", min: 0.8, max: 1.25, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "gillCount", label: "Gill count", min: 8, max: 16, step: 1, defaultValue: 12, unit: "gills" },
    ],
    defaults: { topperHeight: 34, topperWidth: 32, primaryColor: "#a95f49", accentColor: "#e7ddc8" },
    printNote: "Print the cap upside down and the stem upright. A tapered press-fit key mates with the real cap socket without an AMS.",
  },
  {
    id: "pumpkin",
    number: "05",
    name: "Pumpkin Gem",
    subtitle: "Faceted harvest charm",
    difficulty: "Easy",
    parts: 3,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "veggie", "fruit"],
    symbol: "◆",
    defaults: { topperHeight: 32, topperWidth: 31, primaryColor: "#c66f3c", accentColor: "#d7d0bf" },
    printNote: "Print upright. Overlapping lobes are boolean-unioned into one connected topper.",
  },
  {
    id: "acorn",
    number: "06",
    name: "Acorn Lantern",
    subtitle: "Woodland seed totem",
    difficulty: "Easy",
    parts: 3,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "tree", "fruit"],
    symbol: "⬟",
    defaults: { topperHeight: 34, topperWidth: 27, primaryColor: "#9a704c", accentColor: "#d7d0bf" },
    printNote: "Print upright. Nut, cap and stalk become one continuous watertight solid.",
  },
  {
    id: "bonsai",
    number: "07",
    name: "Cloud Bonsai",
    subtitle: "Pocket landscape tree",
    difficulty: "Medium",
    parts: 3,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "tree"],
    symbol: "☁",
    defaults: { topperHeight: 40, topperWidth: 34, primaryColor: "#477052", accentColor: "#d7d0bf" },
    printNote: "Print upright. Thick branches bridge into a single merged cloud canopy.",
  },
  {
    id: "strawberry",
    number: "08",
    name: "Strawberry Drop",
    subtitle: "Geometric berry charm",
    difficulty: "Easy",
    parts: 3,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "fruit"],
    symbol: "♥",
    defaults: { topperHeight: 34, topperWidth: 27, primaryColor: "#b95048", accentColor: "#d7d0bf" },
    printNote: "Print upright. The leaf crown is fused to the berry for a durable single-color print.",
  },
  {
    id: "clover",
    number: "09",
    name: "Clover Charm",
    subtitle: "Four-part lucky token",
    difficulty: "Medium",
    parts: 4,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "herbs", "other"],
    symbol: "✤",
    defaults: { topperHeight: 33, topperWidth: 30, primaryColor: "#56805a", accentColor: "#d7d0bf" },
    printNote: "Print the adapter, double-ended pin, flat-bottom trunk and rounded four-leaf crown as four upright parts; both sockets include printable lead-in clearance.",
  },
  {
    id: "lotus",
    number: "10",
    name: "Lotus Bud",
    subtitle: "Closed faceted flower",
    difficulty: "Medium",
    parts: 3,
    series: "01",
    style: "lowpoly",
    tags: ["lowpoly", "flower"],
    symbol: "✦",
    defaults: { topperHeight: 38, topperWidth: 29, primaryColor: "#bf7d83", accentColor: "#d7d0bf" },
    printNote: "Print upright. Closed petals intersect the core and are merged before export.",
  },
  {
    id: "aloe",
    number: "11",
    name: "Aloe Star",
    subtitle: "Support-free succulent burst",
    difficulty: "Easy",
    parts: 3,
    series: "02",
    style: "lowpoly",
    tags: ["lowpoly", "herbs", "other"],
    symbol: "✷",
    defaults: { topperHeight: 32, topperWidth: 34, primaryColor: "#5f8658", accentColor: "#d7d0bf" },
    printNote: "Print upright. Every tapered leaf grows from and overlaps the same reinforced crown.",
  },
  {
    id: "snakeplant",
    number: "12",
    name: "Snake Plant Crown",
    subtitle: "Architectural leaf cluster",
    difficulty: "Easy",
    parts: 3,
    series: "02",
    style: "lowpoly",
    tags: ["lowpoly", "other"],
    symbol: "♒",
    defaults: { topperHeight: 40, topperWidth: 30, primaryColor: "#436f4c", accentColor: "#d7d0bf" },
    printNote: "Print upright. Thick extruded blades share a continuous root mass and need no support.",
  },
  {
    id: "eggplant",
    number: "13",
    name: "Eggplant Drop",
    subtitle: "Faceted kitchen-garden fruit",
    difficulty: "Easy",
    parts: 3,
    series: "02",
    style: "lowpoly",
    tags: ["lowpoly", "veggie", "fruit"],
    symbol: "◒",
    defaults: { topperHeight: 35, topperWidth: 28, primaryColor: "#67527b", accentColor: "#d7d0bf" },
    printNote: "Print upright. The fruit, leafy crown and stem overlap into one durable solid.",
  },
  {
    id: "grapes",
    number: "14",
    name: "Grape Cluster",
    subtitle: "Geometric harvest bunch",
    difficulty: "Medium",
    parts: 3,
    series: "02",
    style: "lowpoly",
    tags: ["lowpoly", "fruit"],
    symbol: "⠿",
    defaults: { topperHeight: 35, topperWidth: 30, primaryColor: "#73577d", accentColor: "#d7d0bf" },
    printNote: "Print upright. Overlapping berries are boolean-unioned around a hidden central stem.",
  },
  {
    id: "sunflower",
    number: "15",
    name: "Sunflower Shield",
    subtitle: "Bold garden medallion",
    difficulty: "Medium",
    parts: 3,
    series: "02",
    style: "lowpoly",
    tags: ["lowpoly", "flower"],
    symbol: "☼",
    defaults: { topperHeight: 40, topperWidth: 34, primaryColor: "#d5a62e", accentColor: "#d7d0bf" },
    printNote: "Print upright. Chunky petals overlap a thick center disc and reinforced stem.",
  },
  {
    id: "snail",
    number: "16",
    name: "Snail Spiral",
    subtitle: "Slow garden companion",
    difficulty: "Easy",
    parts: 3,
    series: "02",
    style: "lowpoly",
    tags: ["lowpoly", "animal"],
    symbol: "@",
    defaults: { topperHeight: 29, topperWidth: 35, primaryColor: "#9a7754", accentColor: "#d7d0bf" },
    printNote: "Print upright. The shell, body and stout feelers merge into a single friendly silhouette.",
  },
  {
    id: "frog",
    number: "17",
    name: "Frog Sitter",
    subtitle: "Pocket pond guardian",
    difficulty: "Easy",
    parts: 3,
    series: "02",
    style: "lowpoly",
    tags: ["lowpoly", "animal"],
    symbol: "◉",
    defaults: { topperHeight: 31, topperWidth: 32, primaryColor: "#638652", accentColor: "#d7d0bf" },
    printNote: "Print upright. Feet, body, head and eye forms overlap generously for a sturdy print.",
  },
  {
    id: "hedgehog",
    number: "18",
    name: "Hedgehog Pebble",
    subtitle: "Faceted woodland friend",
    difficulty: "Medium",
    parts: 3,
    series: "02",
    style: "lowpoly",
    tags: ["lowpoly", "animal"],
    symbol: "◇",
    defaults: { topperHeight: 28, topperWidth: 35, primaryColor: "#765b45", accentColor: "#d7d0bf" },
    printNote: "Print upright. Deep-set low-poly quills intersect the body rather than floating above it.",
  },
  {
    id: "tomato",
    number: "19",
    name: "Tomato Vine",
    subtitle: "Smooth clustered garden fruit",
    difficulty: "Medium",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "veggie", "fruit"],
    symbol: "●",
    parameters: [
      { key: "fruitCount", label: "Fruit count", min: 1, max: 5, step: 1, defaultValue: 3, unit: "fruit" },
      { key: "fruitSize", label: "Fruit size", min: 0.8, max: 1.2, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "branchSpread", label: "Branch spread", min: 0.8, max: 1.2, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "leafDensity", label: "Leaf density", min: 3, max: 7, step: 1, defaultValue: 5, unit: "leaves" },
    ],
    defaults: { topperHeight: 39, topperWidth: 34, primaryColor: "#c94f43", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic support enabled. Smooth tomatoes, calyxes and branching stems are deeply fused into one natural cluster.",
  },
  {
    id: "carrot",
    number: "20",
    name: "Garden Carrot",
    subtitle: "Tapered root with leafy crown",
    difficulty: "Easy",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "veggie"],
    symbol: "⌄",
    defaults: { topperHeight: 38, topperWidth: 27, primaryColor: "#db7636", accentColor: "#d7d0bf" },
    printNote: "Print upright. The smooth tapered root, subtle growth rings and flexible-looking leaf crown share a reinforced internal core.",
  },
  {
    id: "chili",
    number: "21",
    name: "Red Chili",
    subtitle: "Naturally curved pepper",
    difficulty: "Medium",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "veggie", "fruit"],
    symbol: "⌁",
    defaults: { topperHeight: 27, topperWidth: 38, primaryColor: "#c83f38", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic support enabled. A continuous tapered curve and recessed green shoulder reproduce a ripe pepper silhouette.",
  },
  {
    id: "basil",
    number: "22",
    name: "Sweet Basil",
    subtitle: "Broad aromatic leaf cluster",
    difficulty: "Medium",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "herbs"],
    symbol: "✤",
    defaults: { topperHeight: 36, topperWidth: 35, primaryColor: "#4f8050", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic support enabled. Broad softly bevelled leaves grow from reinforced branching stems.",
  },
  {
    id: "rosemary",
    number: "23",
    name: "Rosemary Sprig",
    subtitle: "Needled Mediterranean herb",
    difficulty: "Medium",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "herbs"],
    symbol: "≋",
    defaults: { topperHeight: 40, topperWidth: 30, primaryColor: "#486f55", accentColor: "#d7d0bf" },
    printNote: "Print upright. Thickened rosemary needles rise from three woody stems and stay above the minimum printable feature size.",
  },
  {
    id: "parsley",
    number: "24",
    name: "Flat Parsley",
    subtitle: "Layered compound herb leaves",
    difficulty: "Medium",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "herbs"],
    symbol: "♧",
    defaults: { topperHeight: 34, topperWidth: 35, primaryColor: "#4d7d4d", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic support enabled. Rounded compound leaflets overlap their branching stems to form one printable herb crown.",
  },
  {
    id: "daisy",
    number: "25",
    name: "White Daisy",
    subtitle: "Soft-petal field flower",
    difficulty: "Medium",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "flower"],
    symbol: "✼",
    defaults: { topperHeight: 40, topperWidth: 34, primaryColor: "#f0eee5", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic support enabled. Twelve smooth petals overlap a domed center and reinforced flower stem.",
  },
  {
    id: "rose",
    number: "26",
    name: "Garden Rose",
    subtitle: "Layered natural bloom",
    difficulty: "Medium",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "flower"],
    symbol: "✿",
    defaults: { topperHeight: 40, topperWidth: 33, primaryColor: "#c84f5a", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic support enabled. Two deeply overlapping petal rings create a rose-like spiral without floating shells.",
  },
  {
    id: "lemon",
    number: "27",
    name: "Ripe Lemon",
    subtitle: "Smooth citrus fruit study",
    difficulty: "Easy",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "fruit"],
    symbol: "⬭",
    defaults: { topperHeight: 33, topperWidth: 30, primaryColor: "#e1ba3d", accentColor: "#d7d0bf" },
    printNote: "Print upright. The smooth citrus body, two end nipples, stem and leaf are merged around a hidden continuous core.",
  },
  {
    id: "bamboo",
    number: "28",
    name: "Bamboo Stalks",
    subtitle: "Three-jointed living canes",
    difficulty: "Medium",
    parts: 3,
    series: "03",
    style: "realistic",
    tags: ["realistic", "tree", "other"],
    symbol: "Ⅱ",
    parameters: [
      { key: "caneCount", label: "Cane count", min: 3, max: 5, step: 1, defaultValue: 3, unit: "canes" },
      { key: "nodeCount", label: "Nodes per cane", min: 3, max: 6, step: 1, defaultValue: 4, unit: "nodes" },
      { key: "caneThickness", label: "Cane thickness", min: 0.8, max: 1.25, step: 0.05, defaultValue: 1, unit: "×" },
      { key: "leafDensity", label: "Leaf clusters", min: 1, max: 5, step: 1, defaultValue: 3, unit: "clusters" },
    ],
    defaults: { topperHeight: 43, topperWidth: 31, primaryColor: "#5c8a4e", accentColor: "#d7d0bf" },
    printNote: "Print upright. Three smooth canes merge through a shared rhizome base; thick nodes and leaves remain durable at miniature scale.",
  },
  {
    id: "santa",
    number: "29",
    name: "Jolly Santa",
    subtitle: "Rounded official image-to-3D character",
    difficulty: "Medium",
    parts: 3,
    series: "04",
    style: "realistic",
    tags: ["realistic", "christmas"],
    symbol: "✣",
    officialMesh: {
      assetPath: "/models/official/christmas/santa.glb",
      previewPath: "/models/official/christmas/previews/santa.jpg",
      faceCount: 39_312,
      generation: "Tripo H3.1 image-to-3D",
    },
    defaults: { topperHeight: 90, topperWidth: 62, primaryColor: "#b92f34", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic snug supports. The rounded hat, beard and mitten arms are fused into one repaired official mesh with a code-owned blind socket.",
  },
  {
    id: "christmas-tree",
    number: "30",
    name: "Festive Fir",
    subtitle: "Rounded official image-to-3D fir",
    difficulty: "Medium",
    parts: 3,
    series: "04",
    style: "realistic",
    tags: ["realistic", "christmas", "tree"],
    symbol: "★",
    officialMesh: {
      assetPath: "/models/official/christmas/christmas-tree.glb",
      previewPath: "/models/official/christmas/previews/christmas-tree.jpg",
      faceCount: 38_788,
      generation: "Tripo H3.1 image-to-3D",
    },
    defaults: { topperHeight: 96, topperWidth: 64, primaryColor: "#23563b", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic snug supports. Three thick foliage tiers, embedded ornaments and the rounded star form one repaired mesh without a separate display disk.",
  },
  {
    id: "snowman",
    number: "31",
    name: "Winter Snowman",
    subtitle: "Rounded official image-to-3D companion",
    difficulty: "Medium",
    parts: 3,
    series: "04",
    style: "realistic",
    tags: ["realistic", "christmas"],
    symbol: "☃",
    officialMesh: {
      assetPath: "/models/official/christmas/snowman.glb",
      previewPath: "/models/official/christmas/previews/snowman.jpg",
      faceCount: 48_064,
      generation: "Tripo H3.1 image-to-3D",
    },
    defaults: { topperHeight: 88, topperWidth: 62, primaryColor: "#eef3ed", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic snug supports. The smooth two-ball body, hat, scarf and buttons are fused into one repaired official mesh with a direct blind socket.",
  },
  {
    id: "reindeer",
    number: "32",
    name: "Cozy Reindeer",
    subtitle: "Rounded official image-to-3D character",
    difficulty: "Medium",
    parts: 3,
    series: "04",
    style: "realistic",
    tags: ["realistic", "christmas", "animal"],
    symbol: "♢",
    officialMesh: {
      assetPath: "/models/official/christmas/reindeer.glb",
      previewPath: "/models/official/christmas/previews/reindeer.jpg",
      faceCount: 47_588,
      generation: "Tripo H3.1 image-to-3D",
    },
    defaults: { topperHeight: 88, topperWidth: 66, primaryColor: "#a9774d", accentColor: "#d7d0bf" },
    printNote: "Print upright with automatic snug supports. Thick two-branch antlers, close-set ears and seated hooves remain fused into a compact repaired official mesh.",
  },
  {
    id: "gift-box",
    number: "33",
    name: "Wrapped Gift",
    subtitle: "Rounded official image-to-3D present",
    difficulty: "Easy",
    parts: 3,
    series: "04",
    style: "realistic",
    tags: ["realistic", "christmas", "other"],
    symbol: "◇",
    officialMesh: {
      assetPath: "/models/official/christmas/gift-box.glb",
      previewPath: "/models/official/christmas/previews/gift-box.jpg",
      faceCount: OFFICIAL_MESH_UPGRADES["gift-box"].faces,
      generation: "Tripo H3.1 image-to-3D",
    },
    defaults: { topperHeight: OFFICIAL_MESH_UPGRADES["gift-box"].height, topperWidth: OFFICIAL_MESH_UPGRADES["gift-box"].width, primaryColor: OFFICIAL_MESH_UPGRADES["gift-box"].color, accentColor: "#d7d0bf" },
    printNote: "Print upright with snug supports. The rounded package, ribbon bands and low bow form one repaired official mesh with a direct blind socket.",
  },
  {
    id: "candy-cane",
    number: "34",
    name: "Candy Cane",
    subtitle: "Rounded official image-to-3D cane",
    difficulty: "Medium",
    parts: 3,
    series: "04",
    style: "realistic",
    tags: ["realistic", "christmas", "other"],
    symbol: "⌁",
    officialMesh: {
      assetPath: "/models/official/christmas/candy-cane.glb",
      previewPath: "/models/official/christmas/previews/candy-cane.jpg",
      faceCount: OFFICIAL_MESH_UPGRADES["candy-cane"].faces,
      generation: "Tripo H3.1 image-to-3D",
    },
    defaults: { topperHeight: OFFICIAL_MESH_UPGRADES["candy-cane"].height, topperWidth: OFFICIAL_MESH_UPGRADES["candy-cane"].width, primaryColor: OFFICIAL_MESH_UPGRADES["candy-cane"].color, accentColor: "#d7d0bf" },
    printNote: "Print upright with snug supports. The thick hook, compact inner gap and broad spiral relief form one repaired official mesh with a direct blind socket.",
  },
  {
    id: "christmas-bell",
    number: "35",
    name: "Christmas Bell",
    subtitle: "Rounded official image-to-3D bell",
    difficulty: "Medium",
    parts: 3,
    series: "04",
    style: "realistic",
    tags: ["realistic", "christmas", "other"],
    symbol: "◒",
    officialMesh: {
      assetPath: "/models/official/christmas/christmas-bell.glb",
      previewPath: "/models/official/christmas/previews/christmas-bell.jpg",
      faceCount: OFFICIAL_MESH_UPGRADES["christmas-bell"].faces,
      generation: "Tripo H3.1 image-to-3D",
    },
    defaults: { topperHeight: OFFICIAL_MESH_UPGRADES["christmas-bell"].height, topperWidth: OFFICIAL_MESH_UPGRADES["christmas-bell"].width, primaryColor: OFFICIAL_MESH_UPGRADES["christmas-bell"].color, accentColor: "#d7d0bf" },
    printNote: "Print upright with snug supports. The thick bow, solid bell body and hidden socket land form one repaired official mesh with a direct blind socket.",
  },
];

const EXPANSION_MODEL_LIBRARY: ModelDefinition[] = OFFICIAL_EXPANSION_MODELS.map((entry) => ({
  id: entry.id,
  number: entry.number,
  name: entry.name,
  subtitle: entry.subtitle,
  difficulty: "Medium",
  parts: 3,
  series: "05",
  style: "realistic",
  tags: ["realistic", ...entry.tags],
  symbol: "◆",
  officialMesh: {
    assetPath: `/models/official/${entry.group}/${entry.id}.glb`,
    previewPath: `/models/official/${entry.group}/previews/${entry.id}.jpg`,
    faceCount: entry.faces,
    generation: "generation" in entry ? entry.generation : "Tripo H3.1 image-to-3D",
  },
  defaults: {
    topperHeight: entry.height,
    topperWidth: entry.width,
    primaryColor: entry.color,
    accentColor: "#d7d0bf",
  },
  printNote: "Print upright with automatic snug supports. This rounded repaired official mesh uses thick fused details, a direct blind socket and no external transition tray.",
}));

export const MODEL_LIBRARY: ModelDefinition[] = [
  ...CORE_MODEL_LIBRARY,
  ...EXPANSION_MODEL_LIBRARY,
];

export function getDefaultShapeParameters(definition: ModelDefinition) {
  return Object.fromEntries(
    (definition.parameters ?? []).map((parameter) => [parameter.key, parameter.defaultValue]),
  ) as Partial<Record<ShapeParameterKey, number>>;
}

export const DEFAULT_OPTIONS: ModelOptions = {
  modelId: "sprout",
  connectionMode: "detachable",
  topperHeight: 65,
  topperWidth: 52,
  primaryColor: "#769567",
  accentColor: "#d7d0bf",
  secondaryColor: "#d8a33e",
  detailColor: "#f4eee2",
  faceted: true,
  shape: {
    leafPairs: 4,
    leafScale: 1,
    leafSpread: 1,
    stemThickness: 1,
  },
};

function shapeValue(options: ModelOptions, key: ShapeParameterKey, fallback: number) {
  return options.shape[key] ?? fallback;
}

const SOCKET_RADIUS = 4.05;
const KIT_PIN_RADIUS = 3.96;
const KIT_PIN_LENGTH = 7.4;
const KIT_PIN_ADAPTER_INSERT = 4;
const KIT_TRUNK_SOCKET_RADIUS = 4.02;
const KIT_TRUNK_SOCKET_DEPTH = 3.4;
const EXTERNAL_MESH_CORE_HEIGHT = 4.15;
const EXTERNAL_MESH_DIRECT_MIN_OVERLAP = 0.6;
const EXTERNAL_MESH_CONTACT_TOLERANCE = 0.8;
const EXTERNAL_MESH_FALLBACK_LIFT = 4.25;
const KIT_CROWN_PIN_RADIUS = 2.6;
const KIT_CROWN_SOCKET_RADIUS = 2.82;
const KIT_CROWN_SOCKET_DEPTH = 3.05;
const LOGO_RECESS_DEPTH = ADAPTER_STANDARD.logoRecessDepth;
const LOGO_PREVIEW_LIFT = 0.01;
// Keep the icon completely inside the exposed annulus. The largest topper
// plinth reaches roughly 11 mm from centre, so an 11.2 mm clearance prevents
// the artwork from being hidden while preserving a safe outer rim.
const LOGO_INNER_CLEARANCE = 11.2;
const LOGO_OUTER_MARGIN = 0.8;

// Raster-to-solid interpretation of public/logo-icon.png. The compact mask
// retains the supplied three-leaf silhouette while keeping each sampled run
// viable for a 0.4 mm nozzle at the default 41 mm adapter diameter.
const LETPOT_ICON_MASK = [
  "............................",
  "###.........................",
  "####........................",
  "#####.......................",
  "#######.....................",
  "#######.....................",
  "########....................",
  "#########...................",
  "##########..................",
  "##########..................",
  "###########.................",
  "####.######.................",
  "####.######.................",
  "#####.#####.................",
  ".####.#####......##########.",
  ".####..####....#############",
  ".####..####...#############.",
  "..####..###..##############.",
  "..####..###.######.#######..",
  "...####..##.##...########...",
  "....####..#.#...########....",
  "......###.....#########.....",
  "........##....#######.......",
  "............................",
  "...........##.##............",
  "...........###.##...........",
  "...........###.##...........",
  "...........#######..........",
  "...........#######..........",
  "...........#######..........",
  "...........#######..........",
  "...........######...........",
  "...........######...........",
  "...........#####............",
  "...........####.............",
  "...........###..............",
  "............#...............",
] as const;

function material(color: string, faceted = true) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0,
    flatShading: faceted,
  });
}

function hexHole(radius: number) {
  const hole = new THREE.Path();
  for (let i = 0; i < 6; i += 1) {
    const angle = -i * Math.PI / 3;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  return hole;
}

function ringGeometry(outerRadius: number, depth: number, steps = 1) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  shape.holes.push(hexHole(SOCKET_RADIUS));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps,
    bevelEnabled: false,
    curveSegments: 48,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function taperedRingGeometry(
  bottomRadius: number,
  topRadius: number,
  transitionHeight: number,
  upperBandHeight = 0,
) {
  const totalDepth = transitionHeight + upperBandHeight;
  // A 0.1 mm vertical subdivision puts an exact vertex ring at the end of the
  // 2.3 mm taper, then continues at constant radius through the 0.2 mm band.
  // Keeping both regions in one mesh avoids a coplanar boolean seam.
  const verticalSteps = upperBandHeight > 0 ? Math.round(totalDepth * 10) : 1;
  const geometry = ringGeometry(bottomRadius, totalDepth, verticalSteps);
  const positions = geometry.getAttribute("position");
  const outerBoundaryThreshold = (SOCKET_RADIUS + bottomRadius) / 2;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = THREE.MathUtils.clamp(positions.getY(index), 0, totalDepth);
    const z = positions.getZ(index);
    const radius = Math.hypot(x, z);
    if (radius <= outerBoundaryThreshold) continue;
    const transitionProgress = THREE.MathUtils.clamp(y / transitionHeight, 0, 1);
    const targetRadius = THREE.MathUtils.lerp(bottomRadius, topRadius, transitionProgress);
    const scale = targetRadius / radius;
    positions.setX(index, x * scale);
    positions.setZ(index, z * scale);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

function logoEngravingGeometry(outerRadius: number) {
  const columns = LETPOT_ICON_MASK[0].length;
  const usableRadialHeight = outerRadius - LOGO_OUTER_MARGIN - LOGO_INNER_CLEARANCE;
  const physicalHeight = Math.max(8, usableRadialHeight);
  const cell = physicalHeight / LETPOT_ICON_MASK.length;
  const overlap = cell * 0.08;
  const shapes: THREE.Shape[] = [];

  LETPOT_ICON_MASK.forEach((row, rowIndex) => {
    let start = -1;
    for (let column = 0; column <= columns; column += 1) {
      const filled = column < columns && row[column] === "#";
      if (filled && start < 0) start = column;
      if (filled || start < 0) continue;

      const left = (start - columns / 2) * cell - overlap;
      const right = (column - columns / 2) * cell + overlap;
      const top = physicalHeight / 2 - rowIndex * cell + overlap;
      const bottom = top - cell - overlap * 2;
      const run = new THREE.Shape();
      run.moveTo(left, bottom);
      run.lineTo(right, bottom);
      run.lineTo(right, top);
      run.lineTo(left, top);
      run.closePath();
      shapes.push(run);
      start = -1;
    }
  });

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: LOGO_RECESS_DEPTH + LOGO_PREVIEW_LIFT,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  // Point the leaf crown toward the outer rim and the narrow stem toward the
  // connector, matching the supplied upright icon on the circular face.
  geometry.rotateY(Math.PI);
  geometry.computeVertexNormals();
  return geometry;
}

function buildAdapter(options: ModelOptions, includeLogo = true) {
  const group = new THREE.Group();
  group.name = "universal_adapter";
  const coverRadius = ADAPTER_STANDARD.upperDiameter / 2;
  const locatorRadius = ADAPTER_STANDARD.lowerDiameter / 2;
  const baseMaterial = material(options.accentColor, false);

  // Extend the locator invisibly into the wider taper so translated stack
  // coupons keep a true volumetric union instead of a coplanar face join.
  const locatorTransitionOverlap = 0.04;
  const locator = new THREE.Mesh(
    ringGeometry(locatorRadius, ADAPTER_STANDARD.lowerHeight + locatorTransitionOverlap),
    baseMaterial,
  );
  locator.name = "locator_skirt";
  locator.userData.aiColorRole = "adapter";
  group.add(locator);

  const transition = new THREE.Mesh(
    taperedRingGeometry(
      locatorRadius,
      coverRadius,
      ADAPTER_STANDARD.transitionHeight,
      ADAPTER_STANDARD.upperBandHeight,
    ),
    baseMaterial,
  );
  transition.name = "pod_fit_transition_and_upper_band";
  transition.userData.aiColorRole = "adapter";
  transition.position.y = ADAPTER_STANDARD.lowerHeight;
  group.add(transition);

  if (includeLogo) {
    const logoCenterRadius = (
      LOGO_INNER_CLEARANCE + coverRadius - LOGO_OUTER_MARGIN
    ) / 2;
    const logo = new THREE.Mesh(
      logoEngravingGeometry(coverRadius),
      material(detailColor(options.accentColor, -0.18), false),
    );
    logo.name = "letpot_icon_engraving_cutter";
    logo.userData.aiColorRole = "adapter";
    logo.userData.booleanOperation = "subtract";
    logo.position.set(
      0,
      ADAPTER_STANDARD.totalHeight - LOGO_RECESS_DEPTH,
      logoCenterRadius,
    );
    group.add(logo);
  }
  return group;
}

export function buildAdapterStackCoupon(options: ModelOptions, gap: number, count = 3) {
  const group = new THREE.Group();
  group.name = `adapter_stack_${Math.round(gap * 100).toString().padStart(2, "0")}`;
  const adapterHeight = ADAPTER_STANDARD.totalHeight;
  const pitch = adapterHeight + gap;
  for (let level = 0; level < count; level += 1) {
    // Keep the release-gap coupon logo-free so the 0.24/0.32/0.40 mm
    // calibration measures only the intended stack interface.
    const adapter = buildAdapter(options, false);
    adapter.name = `stack_adapter_${level + 1}`;
    adapter.position.y = level * pitch;
    group.add(adapter);
    if (level === count - 1) continue;
    for (let index = 0; index < 3; index += 1) {
      const angle = index * Math.PI * 2 / 3;
      const bridgeHeight = gap + 0.12;
      const releaseBridge = mesh(
        new THREE.CylinderGeometry(0.2, 0.62, bridgeHeight, 8),
        options.accentColor,
        false,
      );
      releaseBridge.name = `breakaway_bridge_${level + 1}_${index + 1}`;
      releaseBridge.position.set(
        Math.cos(angle) * 10.5,
        level * pitch + adapterHeight + gap / 2,
        Math.sin(angle) * 10.5,
      );
      group.add(releaseBridge);
    }
  }
  group.updateMatrixWorld(true);
  return group;
}

function prepareTopper(options: ModelOptions, color = options.primaryColor) {
  const group = new THREE.Group();
  group.name = `${options.modelId}_topper`;
  const adapterTop = ADAPTER_STANDARD.totalHeight;
  const connectorCore = mesh(
    new THREE.CylinderGeometry(4.85, 5.25, EXTERNAL_MESH_CORE_HEIGHT, 12),
    color,
    options.faceted,
  );
  connectorCore.name = "embedded_topper_connector_core";
  // This code-owned core preserves the standard socket independently of the
  // generated artwork and is hidden inside its base and central sculpture.
  connectorCore.position.y = adapterTop + EXTERNAL_MESH_CORE_HEIGHT / 2;
  connectorCore.userData.aiColorRole = color.toLowerCase() === options.accentColor.toLowerCase()
    ? "adapter"
    : "primary";
  group.add(connectorCore);

  if (options.connectionMode !== "integrated") {
    const socket = mesh(
      new THREE.CylinderGeometry(KIT_TRUNK_SOCKET_RADIUS, KIT_TRUNK_SOCKET_RADIUS, KIT_TRUNK_SOCKET_DEPTH + 0.08, 6),
      detailColor(color, -0.16),
      false,
    );
    socket.name = "embedded_topper_pin_socket_cutter";
    socket.userData.booleanOperation = "subtract";
    socket.position.y = adapterTop + KIT_TRUNK_SOCKET_DEPTH / 2 - 0.04;
    group.add(socket);
  }
  return group;
}

const STANDARD_TOPPER_CHILDREN = new Set([
  "embedded_topper_connector_core",
  "embedded_topper_pin_socket_cutter",
]);

function constrainTopperArtwork(topper: THREE.Group, options: ModelOptions) {
  const artisticChildren = topper.children.filter((child) => !STANDARD_TOPPER_CHILDREN.has(child.name));
  if (!artisticChildren.length) return topper;

  const artwork = new THREE.Group();
  artwork.name = "topper_artwork_envelope";
  artwork.userData.topperArtworkRoot = true;
  artisticChildren.forEach((child) => artwork.add(child));
  topper.add(artwork);
  artwork.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(artwork);
  if (bounds.isEmpty()) return topper;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const lateralScale = Math.min(1, options.topperWidth / Math.max(size.x, size.z, 0.001));
  const verticalScale = Math.min(1, options.topperHeight / Math.max(size.y, 0.001));
  artwork.scale.set(lateralScale, verticalScale, lateralScale);
  artwork.position.set(
    -center.x * lateralScale,
    bounds.min.y * (1 - verticalScale),
    -center.z * lateralScale,
  );
  artwork.updateMatrixWorld(true);
  topper.userData.requestedTopperEnvelope = {
    width: options.topperWidth,
    height: options.topperHeight,
  };
  return topper;
}

function verticalSolidIntervalsAt(
  object: THREE.Object3D,
  x: number,
  z: number,
  bounds: THREE.Box3,
) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(x, bounds.min.y - 1, z),
    new THREE.Vector3(0, 1, 0),
    0,
    bounds.max.y - bounds.min.y + 2,
  );
  const intervals: Array<[number, number]> = [];
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible) return;
    const proxy = new THREE.Mesh(child.geometry, material);
    proxy.matrixAutoUpdate = false;
    proxy.matrixWorld.copy(child.matrixWorld);
    const heights = raycaster.intersectObject(proxy, false)
      .map((hit) => hit.point.y)
      .sort((first, second) => first - second)
      .filter((height, index, values) => index === 0 || Math.abs(height - values[index - 1]) > 0.02);
    for (let index = 0; index + 1 < heights.length; index += 2) {
      intervals.push([heights[index], heights[index + 1]]);
    }
  });
  material.dispose();

  intervals.sort((first, second) => first[0] - second[0]);
  const merged: Array<[number, number]> = [];
  intervals.forEach(([bottom, top]) => {
    const previous = merged.at(-1);
    if (previous && bottom <= previous[1] + 0.02) previous[1] = Math.max(previous[1], top);
    else merged.push([bottom, top]);
  });
  return merged;
}

function supportsDirectExternalMeshSocket(sculpture: THREE.Object3D) {
  sculpture.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(sculpture);
  if (bounds.isEmpty()) return false;
  const adapterTop = ADAPTER_STANDARD.totalHeight;
  const sampleRadius = KIT_TRUNK_SOCKET_RADIUS + 0.55;
  const samples = [new THREE.Vector2(0, 0)];
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3;
    samples.push(new THREE.Vector2(Math.cos(angle) * sampleRadius, Math.sin(angle) * sampleRadius));
  }
  const coveredSamples = samples.map(({ x, y: z }) => verticalSolidIntervalsAt(sculpture, x, z, bounds).some(
    ([bottom, top]) => bottom <= adapterTop + EXTERNAL_MESH_CONTACT_TOLERANCE
      && top >= adapterTop + EXTERNAL_MESH_DIRECT_MIN_OVERLAP,
  ));
  return coveredSamples[0] && coveredSamples.filter(Boolean).length >= 5;
}

function buildExternalMeshTopper(options: ModelOptions, source: THREE.Object3D) {
  const topper = prepareTopper(options);
  topper.name = "tripo_mesh_topper";
  const sculpture = new THREE.Group();
  sculpture.name = "tripo_generated_mesh";
  source.updateMatrixWorld(true);
  source.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible || !child.geometry.getAttribute("position")) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const printableMesh = mesh(geometry, options.primaryColor, options.faceted);
    printableMesh.name = child.name ? `tripo_${child.name}` : "tripo_mesh_part";
    printableMesh.userData.aiColorRole = "primary";
    printableMesh.userData.allowSmallGapRepair = true;
    sculpture.add(printableMesh);
  });
  if (!sculpture.children.length) throw new Error("The local Tripo creation contains no printable mesh.");

  sculpture.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(sculpture);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const lateralScale = options.topperWidth / Math.max(size.x, size.z, 0.001);
  const verticalScale = options.topperHeight / Math.max(size.y, 0.001);
  sculpture.scale.set(lateralScale, verticalScale, lateralScale);
  sculpture.position.set(
    -center.x * lateralScale,
    ADAPTER_STANDARD.totalHeight - bounds.min.y * verticalScale,
    -center.z * lateralScale,
  );

  const directSocket = supportsDirectExternalMeshSocket(sculpture);
  if (directSocket) {
    topper.add(sculpture);
    topper.userData.externalMeshMountMode = "direct-socket";
  } else {
    // Some neural meshes end in feet, islands or a thin shell instead of a
    // printable central base. Lift only those models onto a code-owned bridge
    // so the standardized socket cannot become a disconnected loose part.
    sculpture.position.y += EXTERNAL_MESH_FALLBACK_LIFT;
    const supportRadius = THREE.MathUtils.clamp(options.topperWidth * 0.22, 5.4, 9);
    const supportHeight = 2.4;
    const support = mesh(
      new THREE.CylinderGeometry(supportRadius * 0.88, supportRadius, supportHeight, 24),
      options.primaryColor,
      false,
    );
    support.name = "standardized_tripo_mesh_transition_fallback";
    support.position.y = ADAPTER_STANDARD.totalHeight + 3.8;
    support.userData.aiColorRole = "primary";
    topper.add(support, sculpture);
    topper.userData.externalMeshMountMode = "reinforced-transition";
  }
  topper.userData.externalMeshSource = "tripo";
  return constrainTopperArtwork(topper, options);
}

function buildIntegratedBaseJoint(options: ModelOptions) {
  const bottom = ADAPTER_STANDARD.lowerHeight * 0.52;
  const top = ADAPTER_STANDARD.totalHeight + 2.75;
  const joint = mesh(
    new THREE.CylinderGeometry(SOCKET_RADIUS + 0.24, SOCKET_RADIUS + 0.24, top - bottom, 18),
    options.primaryColor,
    false,
  );
  joint.name = "integrated_hidden_base_joint";
  joint.position.y = (bottom + top) / 2;
  joint.userData.aiColorRole = "primary";
  return joint;
}

function buildIntegratedJoint(
  name: string,
  bottom: number,
  top: number,
  radius: number,
  color: string,
  role: "primary" | "secondary" | "detail" | "adapter" = "primary",
) {
  const joint = mesh(new THREE.CylinderGeometry(radius, radius, top - bottom, 18), color, false);
  joint.name = name;
  joint.position.y = (bottom + top) / 2;
  joint.userData.aiColorRole = role;
  return joint;
}

function buildConnectorPin(options: ModelOptions, name = "double_ended_connector_pin") {
  const adapterTop = ADAPTER_STANDARD.totalHeight;
  const pinBottom = adapterTop - KIT_PIN_ADAPTER_INSERT;
  const leadHeight = 0.38;
  const pinGroup = new THREE.Group();
  pinGroup.name = name;
  const pinBody = mesh(
    new THREE.CylinderGeometry(KIT_PIN_RADIUS, KIT_PIN_RADIUS, KIT_PIN_LENGTH - leadHeight * 1.5, 6),
    options.primaryColor,
    options.faceted,
  );
  pinBody.name = "connector_pin_body";
  pinBody.position.y = pinBottom + KIT_PIN_LENGTH / 2;
  pinGroup.add(pinBody);
  const lowerLead = mesh(
    new THREE.CylinderGeometry(KIT_PIN_RADIUS, KIT_PIN_RADIUS - 0.28, leadHeight, 6),
    options.primaryColor,
    options.faceted,
  );
  lowerLead.name = "connector_pin_lower_lead_in";
  lowerLead.position.y = pinBottom + leadHeight / 2;
  pinGroup.add(lowerLead);
  const upperLead = mesh(
    new THREE.CylinderGeometry(KIT_PIN_RADIUS - 0.28, KIT_PIN_RADIUS, leadHeight, 6),
    options.primaryColor,
    options.faceted,
  );
  upperLead.name = "connector_pin_upper_lead_in";
  upperLead.position.y = pinBottom + KIT_PIN_LENGTH - leadHeight / 2;
  pinGroup.add(upperLead);
  return pinGroup;
}

function mesh(geometry: THREE.BufferGeometry, color: string, faceted = true) {
  const result = new THREE.Mesh(geometry, material(color, faceted));
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function detailColor(color: string, amount = 0.08) {
  return `#${new THREE.Color(color).offsetHSL(0, 0, amount).getHexString()}`;
}

function cylinderBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radiusBottom: number,
  radiusTop: number,
  color: string,
  faceted = true,
  segments = 7,
) {
  const direction = end.clone().sub(start);
  const result = mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, direction.length(), segments),
    color,
    faceted,
  );
  result.position.copy(start).add(end).multiplyScalar(0.5);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return result;
}

function aiRoleColor(options: ModelOptions, role: AiColorRole) {
  if (role === "secondary") return options.secondaryColor ?? detailColor(options.primaryColor, 0.16);
  if (role === "detail") return options.detailColor ?? detailColor(options.primaryColor, 0.28);
  return options.primaryColor;
}

function centeredExtrudeGeometry(shape: THREE.Shape, segments: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: Math.min(3, Math.max(1, Math.round(segments / 6))),
    bevelSize: 0.06,
    bevelThickness: 0.06,
    curveSegments: segments,
  });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function aiLeafGeometry(segments: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.52);
  shape.bezierCurveTo(0.45, -0.2, 0.45, 0.24, 0, 0.52);
  shape.bezierCurveTo(-0.45, 0.24, -0.45, -0.2, 0, -0.52);
  shape.closePath();
  return centeredExtrudeGeometry(shape, segments);
}

function aiHeartGeometry(segments: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(-0.6, -0.08, -0.52, 0.48, -0.22, 0.48);
  shape.bezierCurveTo(-0.06, 0.48, 0, 0.33, 0, 0.24);
  shape.bezierCurveTo(0, 0.33, 0.06, 0.48, 0.22, 0.48);
  shape.bezierCurveTo(0.52, 0.48, 0.6, -0.08, 0, -0.5);
  shape.closePath();
  return centeredExtrudeGeometry(shape, segments);
}

function aiStarGeometry(points: number, segments: number) {
  const shape = new THREE.Shape();
  const safePoints = Math.max(4, Math.min(9, points));
  for (let index = 0; index < safePoints * 2; index += 1) {
    const angle = Math.PI / 2 + index * Math.PI / safePoints;
    const radius = index % 2 === 0 ? 0.5 : 0.23;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return centeredExtrudeGeometry(shape, segments);
}

function aiRoofGeometry(segments: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0, 0.5);
  shape.closePath();
  return centeredExtrudeGeometry(shape, segments);
}

function aiHalfDiscGeometry(segments: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.375);
  shape.bezierCurveTo(-0.5, 0.12, -0.28, 0.375, 0, 0.375);
  shape.bezierCurveTo(0.28, 0.375, 0.5, 0.12, 0.5, -0.375);
  shape.lineTo(-0.5, -0.375);
  shape.closePath();
  return centeredExtrudeGeometry(shape, segments);
}

function aiDomeGeometry(segments: number) {
  return closedLatheGeometry([
    new THREE.Vector2(0, 0.5),
    new THREE.Vector2(0.28, 0.24),
    new THREE.Vector2(0.42, -0.08),
    new THREE.Vector2(0.49, -0.34),
    new THREE.Vector2(0.5, -0.5),
    new THREE.Vector2(0, -0.5),
  ], segments);
}

function aiDropGeometry(segments: number) {
  return closedLatheGeometry([
    new THREE.Vector2(0, 0.5),
    new THREE.Vector2(0.16, 0.48),
    new THREE.Vector2(0.38, 0.3),
    new THREE.Vector2(0.5, 0.08),
    new THREE.Vector2(0.48, -0.18),
    new THREE.Vector2(0.28, -0.45),
    new THREE.Vector2(0, -0.5),
  ], segments);
}

function aiUnitGeometry(node: AiShapeNode) {
  switch (node.kind) {
    case "ellipsoid":
      return new THREE.SphereGeometry(0.5, node.segments, Math.max(6, Math.round(node.segments * 0.7)));
    case "rounded-box":
      return new RoundedBoxGeometry(1, 1, 1, Math.min(4, Math.max(2, Math.round(node.segments / 5))), 0.14);
    case "cylinder":
      return new THREE.CylinderGeometry(0.5, 0.5, 1, node.segments, 1, false);
    case "cone":
      return new THREE.ConeGeometry(0.5, 1, node.segments, 1, false);
    case "capsule":
      return new THREE.CapsuleGeometry(0.32, 0.36, Math.min(8, node.segments), node.segments);
    case "torus":
      return new THREE.TorusGeometry(0.36, 0.14, Math.max(5, Math.round(node.segments / 2)), node.segments * 2);
    case "roof":
      return aiRoofGeometry(node.segments);
    case "disc": {
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, node.segments, 1, false);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }
    case "half-disc":
      return aiHalfDiscGeometry(node.segments);
    case "dome":
      return aiDomeGeometry(node.segments);
    case "drop":
      return aiDropGeometry(node.segments);
    case "leaf":
      return aiLeafGeometry(node.segments);
    case "star":
      return aiStarGeometry(node.segments, node.segments);
    case "heart":
      return aiHeartGeometry(node.segments);
  }
}

type ExpandedAiNode = AiShapeNode & { repeatedFrom?: string };

function aiRadialSymmetry(symmetry: AiShapeNode["symmetry"]) {
  const match = /^radial-(3|4|5|6|8)-(y|z)$/.exec(symmetry);
  return match ? { count: Number(match[1]), axis: match[2] as "y" | "z" } : null;
}

function expandAiNodes(program: AiShapeProgram) {
  const expanded: ExpandedAiNode[] = [];
  const repeatedIds = new Map<string, string[]>();
  for (const node of program.nodes) {
    expanded.push(node);
    if (node.operation !== "add" || node.symmetry === "none") continue;
    const copies = [node.id];
    if (node.symmetry === "mirror-x") {
      const mirroredId = `${node.id}-mirror`;
      const parentCopies = repeatedIds.get(node.attachTo);
      const attachTo = parentCopies?.[1] ?? node.attachTo;
      const position: [number, number, number] = [...node.position];
      const rotation: [number, number, number] = [...node.rotation];
      position[0] *= -1;
      rotation[1] *= -1;
      rotation[2] *= -1;
      expanded.push({ ...node, id: mirroredId, attachTo, position, rotation, symmetry: "none", repeatedFrom: node.id });
      copies.push(mirroredId);
    } else if (node.symmetry === "mirror-z") {
      const mirroredId = `${node.id}-mirror`;
      const parentCopies = repeatedIds.get(node.attachTo);
      const attachTo = parentCopies?.[1] ?? node.attachTo;
      const position: [number, number, number] = [...node.position];
      const rotation: [number, number, number] = [...node.rotation];
      position[2] *= -1;
      rotation[0] *= -1;
      rotation[1] *= -1;
      expanded.push({ ...node, id: mirroredId, attachTo, position, rotation, symmetry: "none", repeatedFrom: node.id });
      copies.push(mirroredId);
    } else {
      const radial = aiRadialSymmetry(node.symmetry);
      if (!radial) continue;
      const parentCopies = repeatedIds.get(node.attachTo);
      for (let index = 1; index < radial.count; index += 1) {
        const angle = index * Math.PI * 2 / radial.count;
        const degrees = index * 360 / radial.count;
        const position: [number, number, number] = [...node.position];
        const rotation: [number, number, number] = [...node.rotation];
        if (radial.axis === "y") {
          const x = node.position[0];
          const z = node.position[2];
          position[0] = x * Math.cos(angle) + z * Math.sin(angle);
          position[2] = -x * Math.sin(angle) + z * Math.cos(angle);
          rotation[1] += degrees;
        } else {
          const radius = node.position[0];
          position[0] = radius * Math.cos(angle);
          position[1] = node.position[1] + radius * Math.sin(angle);
          rotation[2] += degrees;
        }
        const repeatedId = `${node.id}-r${index + 1}`;
        const attachTo = parentCopies?.[index] ?? node.attachTo;
        expanded.push({ ...node, id: repeatedId, attachTo, position, rotation, symmetry: "none", repeatedFrom: node.id });
        copies.push(repeatedId);
      }
    }
    repeatedIds.set(node.id, copies);
  }
  return expanded;
}

function aiNodeTransform(node: ExpandedAiNode, options: ModelOptions) {
  const center = new THREE.Vector3(
    node.position[0] * options.topperWidth,
    node.position[1] * options.topperHeight,
    node.position[2] * options.topperWidth,
  );
  const size = new THREE.Vector3(
    node.size[0] * options.topperWidth,
    node.size[1] * options.topperHeight,
    node.size[2] * options.topperWidth,
  );
  const rotation = new THREE.Euler(
    THREE.MathUtils.degToRad(node.rotation[0]),
    THREE.MathUtils.degToRad(node.rotation[1]),
    THREE.MathUtils.degToRad(node.rotation[2]),
    "XYZ",
  );
  return { center, size, rotation };
}

function buildAiSculpture(options: ModelOptions, program: AiShapeProgram) {
  const topper = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.name = "ai_shape_program_sculpture";
  const centers = new Map<string, THREE.Vector3>();
  const connectionPoints = new Map<string, THREE.Vector3>();
  const nodeBounds = new Map<string, THREE.Box3>();
  const nodeKinds = new Map<string, AiShapeNode["kind"]>();
  const nodeColorRoles = new Map<string, AiColorRole>();
  const expanded = expandAiNodes(program);

  for (const node of expanded) {
    const { center, size, rotation } = aiNodeTransform(node, options);
    centers.set(node.id, center);
    const geometry = aiUnitGeometry(node);
    geometry.computeBoundingBox();
    const unitSize = geometry.boundingBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3(1, 1, 1);
    const color = aiRoleColor(options, node.color);
    const nodeMesh = mesh(geometry, color, options.faceted);
    nodeMesh.name = `ai_${node.operation}_${node.id}_${node.kind}`;
    nodeMesh.position.copy(center);
    nodeMesh.rotation.copy(rotation);
    nodeMesh.scale.set(
      size.x / Math.max(unitSize.x, 0.001),
      size.y / Math.max(unitSize.y, 0.001),
      size.z / Math.max(unitSize.z, 0.001),
    );
    nodeMesh.userData.aiColorRole = node.color;
    if (node.operation === "subtract") nodeMesh.userData.booleanOperation = "subtract";
    sculpture.add(nodeMesh);
    nodeMesh.updateMatrixWorld(true);
    nodeBounds.set(node.id, new THREE.Box3().setFromObject(nodeMesh));
    nodeKinds.set(node.id, node.kind);
    nodeColorRoles.set(node.id, node.color);

    const connectionPoint = center.clone();
    if (node.kind === "torus") {
      connectionPoint.add(new THREE.Vector3(size.x * 0.34, 0, 0).applyEuler(rotation));
    } else if (node.kind === "dome" || node.kind === "drop") {
      // Rotational profiles meet on the centre axis. Aim the fusion link into
      // the broad interior instead of ending on that welded pole, which gives
      // Manifold a materially overlapping volume in both connection modes.
      connectionPoint.add(new THREE.Vector3(size.x * 0.16, 0, 0).applyEuler(rotation));
    }
    connectionPoints.set(node.id, connectionPoint);
    if (node.operation === "subtract") continue;

    let start = new THREE.Vector3(0, 0, 0);
    if (node.attachTo !== "core") {
      const parentBounds = nodeBounds.get(node.attachTo);
      if (parentBounds && nodeKinds.get(node.attachTo) !== "torus") {
        const parentCenter = centers.get(node.attachTo) ?? parentBounds.getCenter(new THREE.Vector3());
        const towardChild = connectionPoint.clone().sub(parentCenter);
        const distance = towardChild.length();
        const parentSize = parentBounds.getSize(new THREE.Vector3());
        // Begin well inside the parent's conservative inscribed region. This
        // is more reliable than bounding-box overlap for rotated capsules and
        // tapered shapes, while still trimming most of a centre-to-centre rod.
        const insetTravel = Math.min(distance * 0.24, Math.min(parentSize.x, parentSize.y, parentSize.z) * 0.16);
        start.copy(parentCenter).add(towardChild.normalize().multiplyScalar(insetTravel));
      } else {
        start = connectionPoints.get(node.attachTo) ?? centers.get(node.attachTo) ?? start;
      }
    }
    const end = connectionPoint;
    const distance = start.distanceTo(end);
    if (distance < 0.05) continue;
    const linkRadius = THREE.MathUtils.clamp(Math.min(size.x, size.y, size.z) * 0.18, 0.9, 2.4);
    const linkRole = node.attachTo === "core" ? "primary" : nodeColorRoles.get(node.attachTo) ?? "primary";
    const link = cylinderBetween(start, end, linkRadius, linkRadius * 0.92, aiRoleColor(options, linkRole), options.faceted, Math.max(6, node.segments));
    link.name = `ai_fusion_${node.attachTo}_to_${node.id}`;
    link.userData.aiColorRole = linkRole;
    sculpture.add(link);
  }

  sculpture.updateMatrixWorld(true);
  const additiveBounds = new THREE.Box3();
  sculpture.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.booleanOperation !== "subtract") {
      additiveBounds.expandByObject(child);
    }
  });
  const size = additiveBounds.getSize(new THREE.Vector3());
  const lateralScale = Math.min(1, options.topperWidth / Math.max(size.x, size.z, 0.001));
  const verticalScale = Math.min(1, options.topperHeight / Math.max(size.y, 0.001));
  sculpture.scale.set(lateralScale, verticalScale, lateralScale);
  // Seat the generated silhouette directly on the adapter face. The former
  // 3.55 mm lift exposed the generic socket sleeve as a visible pedestal;
  // the embedded connector core now remains inside the lowest generated mass.
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05 - additiveBounds.min.y * verticalScale;
  topper.add(sculpture);
  topper.userData.aiShapeProgram = program;
  return constrainTopperArtwork(topper, options);
}

function leafBladeGeometry(length: number, width: number, thickness: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.6, 0);
  shape.bezierCurveTo(length * 0.22, width * 0.58, length * 0.72, width * 0.6, length, 0);
  shape.bezierCurveTo(length * 0.72, -width * 0.6, length * 0.22, -width * 0.58, -0.6, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.38, thickness * 0.22),
    bevelThickness: Math.min(0.32, thickness * 0.2),
    curveSegments: 7,
  });
  geometry.translate(0, 0, -thickness / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function closedLatheGeometry(profile: THREE.Vector2[], segments: number) {
  const positions: number[] = [];
  const point3 = (point: THREE.Vector2, angle: number) => new THREE.Vector3(
    Math.cos(angle) * point.x,
    point.y,
    Math.sin(angle) * point.x,
  );
  const push = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  for (let edge = 0; edge < profile.length; edge += 1) {
    const a = profile[edge];
    const b = profile[(edge + 1) % profile.length];
    if (a.x === 0 && b.x === 0) continue;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment * Math.PI * 2 / segments;
      const nextAngle = (segment + 1) * Math.PI * 2 / segments;
      const aCurrent = point3(a, angle);
      const aNext = point3(a, nextAngle);
      const bCurrent = point3(b, angle);
      const bNext = point3(b, nextAngle);
      if (a.x === 0) push(aCurrent, bNext, bCurrent);
      else if (b.x === 0) push(aCurrent, aNext, bCurrent);
      else {
        push(aCurrent, aNext, bCurrent);
        push(aNext, bNext, bCurrent);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function starPrismGeometry(outerRadius: number, innerRadius: number, depth: number, points = 5) {
  const shape = new THREE.Shape();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = Math.PI / 2 + index * Math.PI / points;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(0.35, depth * 0.2),
    bevelThickness: Math.min(0.3, depth * 0.18),
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function buildSprout(options: ModelOptions) {
  const group = prepareTopper(options);
  const sx = options.topperWidth / 28;
  const sy = options.topperHeight / 35;
  const leafPairs = Math.round(shapeValue(options, "leafPairs", 4));
  const leafScale = shapeValue(options, "leafScale", 1);
  const leafSpread = shapeValue(options, "leafSpread", 1);
  const stemThickness = shapeValue(options, "stemThickness", 1);
  const topY = ADAPTER_STANDARD.totalHeight - 0.05;
  const sculpture = new THREE.Group();
  sculpture.position.y = topY;
  sculpture.scale.set(sx, sy, sx);

  const plinth = mesh(new THREE.CylinderGeometry(9.4, 11.2, 4.2, 12), options.primaryColor, options.faceted);
  plinth.name = "sprout_root_plinth";
  plinth.position.y = 2.1;
  sculpture.add(plinth);

  const lowerStem = cylinderBetween(
    new THREE.Vector3(0, 3.4, 0),
    new THREE.Vector3(-0.3, 20.8, 0),
    2.9 * stemThickness,
    2.15 * stemThickness,
    options.primaryColor,
    options.faceted,
    8,
  );
  lowerStem.name = "reinforced_tapered_stem";
  sculpture.add(lowerStem);
  const upperStem = cylinderBetween(
    new THREE.Vector3(-0.25, 19.4, 0),
    new THREE.Vector3(-0.2, 28.4, 0),
    2.2 * stemThickness,
    1.35 * stemThickness,
    options.primaryColor,
    options.faceted,
    8,
  );
  upperStem.name = "reinforced_upper_stem";
  sculpture.add(upperStem);

  const leafColor = detailColor(options.primaryColor, 0.035);
  const veinColor = detailColor(options.primaryColor, 0.11);
  const addLeaf = (side: -1 | 1, y: number, scale: number, yaw: number) => {
    const branchRoot = new THREE.Vector3(side * 0.3, y - 1.1, 0);
    const tunedScale = scale * leafScale;
    const branchTip = new THREE.Vector3(side * 3.7 * scale * leafSpread, y + 1.8 * scale, Math.sin(yaw * leafSpread) * 1.1);
    const branch = cylinderBetween(branchRoot, branchTip, 1.25 * scale * stemThickness, 0.95 * scale * stemThickness, options.primaryColor, options.faceted, 7);
    branch.name = `sprout_branch_${side < 0 ? "left" : "right"}_${Math.round(y)}`;
    sculpture.add(branch);

    const leafRig = new THREE.Group();
    leafRig.position.copy(branchTip).add(new THREE.Vector3(side * -0.45, -0.35, 0));
    leafRig.rotation.y = side < 0 ? Math.PI + yaw * leafSpread : -yaw * leafSpread;
    leafRig.rotation.z = 0.3;

    const blade = mesh(leafBladeGeometry(10.6 * tunedScale, 5.8 * tunedScale, 1.7), leafColor, options.faceted);
    blade.name = `sprout_leaf_${side < 0 ? "left" : "right"}_${Math.round(y)}`;
    leafRig.add(blade);
    const midrib = cylinderBetween(
      new THREE.Vector3(0.1, 0, 0.68),
      new THREE.Vector3(8.7 * tunedScale, 0, 0.68),
      0.62,
      0.34,
      veinColor,
      options.faceted,
      6,
    );
    midrib.name = "fused_leaf_midrib";
    leafRig.add(midrib);
    sculpture.add(leafRig);
  };

  const pairTemplates = [
    { y: 17.4, scale: 0.68, yaw: 0.6 },
    { y: 21.3, scale: 1, yaw: 0.15 },
    { y: 24.25, scale: 0.7, yaw: 0.74 },
    { y: 27.1, scale: 0.52, yaw: 0.4 },
    { y: 28.15, scale: 0.42, yaw: 1.02 },
  ];
  pairTemplates.slice(0, leafPairs).forEach((pair, index) => {
    const sideBias = index % 2 === 0 ? 0.02 : -0.02;
    addLeaf(-1, pair.y - sideBias, pair.scale, -pair.yaw);
    addLeaf(1, pair.y + sideBias, pair.scale * 0.96, pair.yaw);
  });

  const crown = mesh(new THREE.DodecahedronGeometry(2.5, 0), leafColor, options.faceted);
  crown.name = "sprout_crown_union";
  crown.scale.set(0.9, 1.4, 0.8);
  crown.position.set(-0.2, 28.5, 0);
  sculpture.add(crown);

  group.add(sculpture);
  return group;
}

function buildPine(options: ModelOptions) {
  const group = prepareTopper(options);
  const sx = options.topperWidth / 30;
  const sy = options.topperHeight / 42;
  const tierCount = Math.round(shapeValue(options, "tierCount", 4));
  const crownFullness = shapeValue(options, "crownFullness", 1);
  const trunkThickness = shapeValue(options, "trunkThickness", 1);
  const tipRoundness = shapeValue(options, "tipRoundness", 1);
  const topY = ADAPTER_STANDARD.totalHeight - 0.05;
  const sculpture = new THREE.Group();
  sculpture.position.y = topY;
  sculpture.scale.set(sx, sy, sx);

  const foot = mesh(new THREE.CylinderGeometry(8.8, 10.7, 3.8, 12), "#6d523e", options.faceted);
  foot.name = "pine_root_plinth";
  foot.position.y = 1.9;
  sculpture.add(foot);

  const rootFlare = mesh(new THREE.ConeGeometry(5.4 * trunkThickness, 8, 8), "#72533f", options.faceted);
  rootFlare.name = "pine_root_flare";
  rootFlare.position.y = 6.3;
  sculpture.add(rootFlare);
  const trunk = mesh(new THREE.CylinderGeometry(2.15 * trunkThickness, 3.35 * trunkThickness, 29.6, 8), "#72533f", options.faceted);
  trunk.name = "pine_reinforced_trunk";
  trunk.position.y = 17.8;
  sculpture.add(trunk);
  const pineLayers = Array.from({ length: tierCount }, (_, index) => {
    const progress = tierCount === 1 ? 1 : index / (tierCount - 1);
    return {
      radius: THREE.MathUtils.lerp(14, 4.9, progress) * crownFullness,
      height: THREE.MathUtils.lerp(16, 10, progress),
      y: THREE.MathUtils.lerp(12.5, 35, progress),
      rotation: index % 2 === 0 ? 0 : Math.PI / 8,
    };
  });
  pineLayers.forEach((layer, index) => {
    const crownGeometry = index === pineLayers.length - 1
      ? new THREE.CylinderGeometry(1.35, layer.radius, 9.4, 12)
      : new THREE.ConeGeometry(layer.radius, layer.height, 12);
    const crown = mesh(crownGeometry, options.primaryColor, options.faceted);
    crown.name = `pine_layer_${index + 1}`;
    crown.position.y = layer.y;
    crown.rotation.y = layer.rotation;
    sculpture.add(crown);
  });
  const roundedTip = mesh(new THREE.DodecahedronGeometry(1.65, 0), options.primaryColor, options.faceted);
  roundedTip.name = "pine_rounded_tip";
  roundedTip.scale.set(0.9 * tipRoundness, 0.75 * tipRoundness, 0.9 * tipRoundness);
  roundedTip.position.y = 39.45;
  sculpture.add(roundedTip);
  group.add(sculpture);
  return group;
}

function buildCactus(options: ModelOptions) {
  const group = prepareTopper(options);
  const sx = options.topperWidth / 28;
  const sy = options.topperHeight / 36;
  const armCount = Math.round(shapeValue(options, "armCount", 2));
  const bodyPlumpness = shapeValue(options, "bodyPlumpness", 1);
  const armRise = shapeValue(options, "armRise", 1);
  const ribCount = Math.round(shapeValue(options, "ribCount", 8));
  const topY = ADAPTER_STANDARD.totalHeight - 0.05;
  const sculpture = new THREE.Group();
  sculpture.name = "single_body_cactus";
  sculpture.position.y = topY;
  sculpture.scale.set(sx, sy, sx);

  const plinth = mesh(new THREE.CylinderGeometry(9.4, 11, 4, 12), options.primaryColor, options.faceted);
  plinth.name = "cactus_root_plinth";
  plinth.position.y = 2;
  sculpture.add(plinth);

  const trunk = mesh(new THREE.CylinderGeometry(5.25 * bodyPlumpness, 5.8 * bodyPlumpness, 25.5, 10), options.primaryColor, options.faceted);
  trunk.name = "cactus_main_trunk";
  trunk.position.y = 16.4;
  sculpture.add(trunk);
  const trunkCap = mesh(new THREE.SphereGeometry(5.25 * bodyPlumpness, 10, 6), options.primaryColor, options.faceted);
  trunkCap.name = "cactus_rounded_crown";
  trunkCap.scale.y = 0.58;
  trunkCap.position.y = 29.2;
  sculpture.add(trunkCap);

  const addArm = (side: -1 | 1, startY: number, rise: number, z: number) => {
    const start = new THREE.Vector3(side * 3.35 * bodyPlumpness, startY, 0);
    const elbow = new THREE.Vector3(side * 8.25 * bodyPlumpness, startY + rise * armRise, z);
    const diagonal = cylinderBetween(start, elbow, 3.45 * bodyPlumpness, 3.05 * bodyPlumpness, options.primaryColor, options.faceted, 9);
    diagonal.name = `cactus_${side < 0 ? "left" : "right"}_rising_arm`;
    sculpture.add(diagonal);
    const rootJoint = mesh(new THREE.SphereGeometry(3.55 * bodyPlumpness, 9, 5), options.primaryColor, options.faceted);
    rootJoint.name = `cactus_${side < 0 ? "left" : "right"}_fused_root_joint`;
    rootJoint.scale.y = 0.82;
    rootJoint.position.copy(start);
    sculpture.add(rootJoint);
    const elbowJoint = mesh(new THREE.SphereGeometry(3.2 * bodyPlumpness, 9, 5), options.primaryColor, options.faceted);
    elbowJoint.name = `cactus_${side < 0 ? "left" : "right"}_fused_elbow_joint`;
    elbowJoint.scale.y = 0.86;
    elbowJoint.position.copy(elbow);
    sculpture.add(elbowJoint);
    const armHeight = side < 0 ? 7.6 : 6.4;
    const upright = mesh(new THREE.CylinderGeometry(2.65 * bodyPlumpness, 2.9 * bodyPlumpness, armHeight, 9), options.primaryColor, options.faceted);
    upright.name = `cactus_${side < 0 ? "left" : "right"}_upright`;
    upright.position.set(elbow.x, elbow.y + armHeight / 2 - 0.7, elbow.z);
    sculpture.add(upright);
    const cap = mesh(new THREE.SphereGeometry(2.7 * bodyPlumpness, 9, 5), options.primaryColor, options.faceted);
    cap.name = `cactus_${side < 0 ? "left" : "right"}_cap`;
    cap.scale.y = 0.58;
    cap.position.set(elbow.x, elbow.y + armHeight - 0.7, elbow.z);
    sculpture.add(cap);
  };
  [
    { side: -1 as const, startY: 14.4, rise: 4.1, z: -0.3 },
    { side: 1 as const, startY: 11.5, rise: 4.8, z: 0.9 },
    { side: -1 as const, startY: 20.2, rise: 3.2, z: 1.4 },
    { side: 1 as const, startY: 18.2, rise: 3.6, z: -1.2 },
  ].slice(0, armCount).forEach(({ side, startY, rise, z }) => addArm(side, startY, rise, z));

  const ribColor = detailColor(options.primaryColor, 0.06);
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index * Math.PI * 2 / ribCount;
    const rib = mesh(new THREE.CylinderGeometry(0.72, 0.78, 22.8, 6), ribColor, options.faceted);
    rib.name = `cactus_rib_${index + 1}`;
    rib.position.set(Math.cos(angle) * 4.82 * bodyPlumpness, 16.2, Math.sin(angle) * 4.82 * bodyPlumpness);
    sculpture.add(rib);
  }

  const areoleColor = detailColor(options.primaryColor, 0.14);
  [
    [0.2, 9], [2.5, 13], [4.9, 17], [1.35, 20.5], [3.75, 24.5], [5.6, 27],
  ].forEach(([angle, y], index) => {
    const areole = mesh(new THREE.DodecahedronGeometry(0.82, 0), areoleColor, options.faceted);
    areole.name = `rounded_areole_${index + 1}`;
    areole.position.set(Math.cos(angle) * 5.35 * bodyPlumpness, y, Math.sin(angle) * 5.35 * bodyPlumpness);
    areole.scale.set(1, 0.72, 1);
    sculpture.add(areole);
  });

  group.add(sculpture);
  return group;
}

function buildPumpkin(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 31, options.topperHeight / 32, options.topperWidth / 31);
  const foot = mesh(new THREE.CylinderGeometry(9.5, 11, 5, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.5;
  sculpture.add(foot);
  const fusedCore = mesh(new THREE.CylinderGeometry(4.6, 5.2, 21.4, 10), options.primaryColor, options.faceted);
  fusedCore.name = "pumpkin_internal_fused_core";
  fusedCore.position.y = 12.4;
  sculpture.add(fusedCore);
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI * 2 / 8;
    const lobe = mesh(new THREE.SphereGeometry(9.2, 9, 7), options.primaryColor, options.faceted);
    lobe.name = `pumpkin_lobe_${index + 1}`;
    lobe.scale.set(0.78, 1.08, 0.78);
    lobe.rotation.y = angle;
    lobe.position.set(Math.cos(angle) * 3.4, 13.6, Math.sin(angle) * 3.4);
    sculpture.add(lobe);
  }
  const stalk = mesh(new THREE.CylinderGeometry(1.8, 2.6, 6, 6), "#557052", options.faceted);
  stalk.rotation.z = -0.12;
  stalk.position.set(0.4, 24, 0);
  sculpture.add(stalk);
  group.add(sculpture);
  return group;
}

function buildAcorn(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 27, options.topperHeight / 34, options.topperWidth / 27);
  const foot = mesh(new THREE.CylinderGeometry(8.5, 10.5, 4.6, 9), options.primaryColor, options.faceted);
  foot.position.y = 2.3;
  sculpture.add(foot);
  const nut = mesh(new THREE.DodecahedronGeometry(10, 0), options.primaryColor, options.faceted);
  nut.name = "acorn_nut";
  nut.scale.set(0.82, 1.1, 0.82);
  nut.position.y = 14;
  sculpture.add(nut);
  const cap = mesh(new THREE.SphereGeometry(10, 9, 6), "#70513b", options.faceted);
  cap.name = "acorn_cap";
  cap.scale.set(0.88, 0.38, 0.88);
  cap.position.y = 22;
  sculpture.add(cap);
  const stalk = mesh(new THREE.CylinderGeometry(1.5, 2.1, 6, 6), "#70513b", options.faceted);
  stalk.rotation.z = 0.18;
  stalk.position.set(-0.4, 27.5, 0);
  sculpture.add(stalk);
  group.add(sculpture);
  return group;
}

function buildBonsai(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 34, options.topperHeight / 40, options.topperWidth / 34);
  const foot = mesh(new THREE.CylinderGeometry(10.5, 12, 4.5, 10), "#6f543e", options.faceted);
  foot.position.y = 2.25;
  sculpture.add(foot);
  const trunk = mesh(new THREE.CylinderGeometry(2.6, 4.2, 20, 7), "#6f543e", options.faceted);
  trunk.rotation.z = -0.08;
  trunk.position.set(0.6, 13.5, 0);
  sculpture.add(trunk);
  const addBranch = (x: number, y: number, angle: number) => {
    const branch = mesh(new THREE.CylinderGeometry(1.8, 2.4, 13, 7), "#6f543e", options.faceted);
    branch.rotation.z = angle;
    branch.position.set(x, y, 0);
    sculpture.add(branch);
  };
  addBranch(-3.5, 21, 0.86);
  addBranch(3.5, 21, -0.86);
  [
    [-7.2, 25.2, 0],
    [0, 28, 0.5],
    [7.2, 25.5, -0.4],
    [-0.8, 25.2, 6.2],
    [1.1, 24.9, -6.2],
    [0, 31.7, 0],
  ].forEach(([x, y, z], index) => {
    const crown = mesh(new THREE.DodecahedronGeometry(8.6, 0), options.primaryColor, options.faceted);
    crown.name = `bonsai_cloud_${index + 1}`;
    const isTop = index === 5;
    crown.scale.set(isTop ? 0.82 : 1.1, isTop ? 0.66 : 0.72, isTop ? 0.82 : 0.96);
    crown.position.set(x, y, z);
    sculpture.add(crown);
  });
  group.add(sculpture);
  return group;
}

function buildStrawberry(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 27, options.topperHeight / 34, options.topperWidth / 27);
  const foot = mesh(new THREE.CylinderGeometry(8.5, 10.2, 4.2, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.1;
  sculpture.add(foot);
  const berry = mesh(new THREE.DodecahedronGeometry(10, 1), options.primaryColor, options.faceted);
  berry.name = "strawberry_body";
  berry.scale.set(0.78, 1.15, 0.78);
  berry.position.y = 14.5;
  sculpture.add(berry);
  for (let i = 0; i < 5; i += 1) {
    const angle = i * Math.PI * 2 / 5;
    const leaf = mesh(new THREE.SphereGeometry(3.8, 6, 4), "#4d744d", options.faceted);
    leaf.name = `berry_leaf_${i + 1}`;
    leaf.scale.set(1.45, 0.38, 0.68);
    leaf.rotation.y = -angle;
    leaf.rotation.z = Math.cos(angle) * 0.35;
    leaf.position.set(Math.cos(angle) * 3.5, 23.2, Math.sin(angle) * 3.5);
    sculpture.add(leaf);
  }
  const stalk = mesh(new THREE.CylinderGeometry(1.3, 1.8, 5, 6), "#4d744d", options.faceted);
  stalk.position.y = 26;
  sculpture.add(stalk);
  group.add(sculpture);
  return group;
}

function buildCloverKit(options: ModelOptions) {
  const widthScale = options.topperWidth / 30;
  const heightScale = options.topperHeight / 33;
  const adapterTop = ADAPTER_STANDARD.totalHeight;
  const stemTop = 16.8 * heightScale;

  const pinGroup = options.connectionMode === "integrated"
    ? undefined
    : buildConnectorPin(options, "clover_double_ended_connector_pin");

  const trunkGroup = new THREE.Group();
  trunkGroup.name = "clover_flat_bottom_trunk";
  trunkGroup.position.y = adapterTop;
  const foot = mesh(
    new THREE.CylinderGeometry(8.8 * widthScale, 10.8 * widthScale, 4.4, 12),
    options.primaryColor,
    options.faceted,
  );
  foot.name = "clover_flat_print_plinth";
  foot.position.y = 2.2;
  trunkGroup.add(foot);
  const socketBoss = mesh(
    new THREE.CylinderGeometry(4.8, 5.25, 4.8, 10),
    options.primaryColor,
    options.faceted,
  );
  socketBoss.name = "clover_socket_boss";
  socketBoss.position.y = 2.4;
  trunkGroup.add(socketBoss);
  const stemBottom = 3.35;
  const stem = mesh(
    new THREE.CylinderGeometry(2.45 * widthScale, 3.35 * widthScale, stemTop - stemBottom, 8),
    options.primaryColor,
    options.faceted,
  );
  stem.name = "clover_support_free_trunk";
  stem.position.y = (stemBottom + stemTop) / 2;
  trunkGroup.add(stem);

  if (options.connectionMode !== "integrated") {
    const trunkSocket = mesh(
      new THREE.CylinderGeometry(KIT_TRUNK_SOCKET_RADIUS, KIT_TRUNK_SOCKET_RADIUS, KIT_TRUNK_SOCKET_DEPTH + 0.08, 6),
      detailColor(options.primaryColor, -0.16),
      false,
    );
    trunkSocket.name = "clover_trunk_pin_socket_cutter";
    trunkSocket.userData.booleanOperation = "subtract";
    trunkSocket.position.y = KIT_TRUNK_SOCKET_DEPTH / 2 - 0.04;
    trunkGroup.add(trunkSocket);
  }

  const crownPinHeight = KIT_CROWN_SOCKET_DEPTH + 0.35;
  const crownPin = mesh(
    new THREE.CylinderGeometry(KIT_CROWN_PIN_RADIUS - 0.2, KIT_CROWN_PIN_RADIUS, crownPinHeight, 6),
    options.primaryColor,
    options.faceted,
  );
  crownPin.name = "clover_crown_alignment_pin";
  crownPin.position.y = stemTop + crownPinHeight / 2 - 0.28;
  trunkGroup.add(crownPin);

  const crownGroup = new THREE.Group();
  crownGroup.name = "clover_printable_crown";
  crownGroup.position.y = adapterTop + stemTop;
  const crownHubHeight = 4;
  const crownHub = mesh(
    new THREE.CylinderGeometry(5.05 * widthScale, 5.8 * widthScale, crownHubHeight, 12),
    options.primaryColor,
    options.faceted,
  );
  crownHub.name = "clover_flat_crown_hub";
  crownHub.position.y = crownHubHeight / 2;
  crownGroup.add(crownHub);

  if (options.connectionMode !== "integrated") {
    const crownSocket = mesh(
      new THREE.CylinderGeometry(KIT_CROWN_SOCKET_RADIUS, KIT_CROWN_SOCKET_RADIUS, KIT_CROWN_SOCKET_DEPTH + 0.08, 6),
      detailColor(options.primaryColor, -0.16),
      false,
    );
    crownSocket.name = "clover_crown_socket_cutter";
    crownSocket.userData.booleanOperation = "subtract";
    crownSocket.position.y = KIT_CROWN_SOCKET_DEPTH / 2 - 0.04;
    crownGroup.add(crownSocket);
  }

  const leafDistance = 5.85 * widthScale;
  const leafCentreY = crownHubHeight + 2.75 * heightScale;
  const leafOffsets = [0, 0.045, -0.035, 0.025];
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2 + leafOffsets[index];
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const leaf = mesh(
      new THREE.DodecahedronGeometry(5.15, 0),
      options.primaryColor,
      options.faceted,
    );
    leaf.name = `clover_rounded_leaf_${index + 1}`;
    leaf.scale.set(1.02 * widthScale, 0.8 * heightScale, 0.98 * widthScale);
    leaf.rotation.y = -angle;
    leaf.rotation.z = index % 2 === 0 ? 0.018 : -0.018;
    leaf.position.copy(radial).multiplyScalar(leafDistance);
    leaf.position.y = leafCentreY;
    crownGroup.add(leaf);
  }

  const upperLeaf = mesh(
    new THREE.DodecahedronGeometry(4.7, 0),
    options.primaryColor,
    options.faceted,
  );
  upperLeaf.name = "clover_rounded_upper_leaf_5";
  upperLeaf.scale.set(0.9 * widthScale, 0.8 * heightScale, 0.86 * widthScale);
  upperLeaf.rotation.x = -0.08;
  upperLeaf.position.set(0, crownHubHeight + 6.15 * heightScale, -0.85 * widthScale);
  crownGroup.add(upperLeaf);

  const crownCentre = mesh(
    new THREE.DodecahedronGeometry(2.55, 0),
    detailColor(options.primaryColor, 0.035),
    options.faceted,
  );
  crownCentre.name = "clover_crown_fused_centre";
  crownCentre.scale.set(1.04 * widthScale, 0.7 * heightScale, 1.04 * widthScale);
  crownCentre.position.y = crownHubHeight + 0.7 * heightScale;
  crownGroup.add(crownCentre);

  return { pinGroup, trunkGroup, crownGroup };
}

function buildLotus(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 29, options.topperHeight / 38, options.topperWidth / 29);
  const leafColor = "#55734b";
  const foot = mesh(new THREE.CylinderGeometry(9, 10.8, 4.2, 10), leafColor, options.faceted);
  foot.name = "lotus_leaf_green_plinth";
  foot.position.y = 2.1;
  sculpture.add(foot);
  const stem = mesh(new THREE.CylinderGeometry(2.4, 3.2, 20, 7), leafColor, options.faceted);
  stem.name = "lotus_green_stem";
  stem.position.y = 13;
  sculpture.add(stem);

  const innerColor = detailColor(options.primaryColor, 0.045);
  const core = mesh(new THREE.DodecahedronGeometry(7.2, 0), innerColor, options.faceted);
  core.name = "lotus_fused_central_bud";
  core.scale.set(0.78, 1.3, 0.78);
  core.position.y = 26;
  sculpture.add(core);
  for (let i = 0; i < 5; i += 1) {
    const angle = i * Math.PI * 2 / 5;
    const petal = mesh(new THREE.SphereGeometry(6, 7, 5), options.primaryColor, options.faceted);
    petal.name = `lotus_petal_${i + 1}`;
    petal.scale.set(0.58, 1.35, 0.5);
    petal.rotation.y = angle;
    petal.rotation.z = Math.cos(angle) * 0.28;
    petal.position.set(Math.cos(angle) * 3.8, 24.5, Math.sin(angle) * 3.8);
    sculpture.add(petal);
  }
  group.add(sculpture);
  return group;
}

function buildAloe(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 34, options.topperHeight / 32, options.topperWidth / 34);
  const foot = mesh(new THREE.CylinderGeometry(10.5, 11.5, 4.4, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.2;
  sculpture.add(foot);

  const leaves = [
    { x: -7.2, z: 0, height: 21, radius: 4.4, rz: 0.62, rx: 0 },
    { x: 7.2, z: 0, height: 21, radius: 4.4, rz: -0.62, rx: 0 },
    { x: 0, z: -6.6, height: 20, radius: 4.2, rz: 0, rx: -0.58 },
    { x: 0, z: 6.6, height: 20, radius: 4.2, rz: 0, rx: 0.58 },
    { x: -3.8, z: -2.6, height: 26, radius: 4, rz: 0.28, rx: -0.2 },
    { x: 3.8, z: 2.6, height: 26, radius: 4, rz: -0.28, rx: 0.2 },
    { x: 0, z: 0, height: 29, radius: 4.2, rz: 0, rx: 0 },
    { x: -5.4, z: 4.5, height: 18, radius: 3.8, rz: 0.46, rx: 0.38 },
    { x: 5.4, z: -4.5, height: 18, radius: 3.8, rz: -0.46, rx: -0.38 },
    { x: -4.7, z: -5, height: 22, radius: 3.75, rz: 0.32, rx: -0.34 },
    { x: 4.7, z: 5, height: 22, radius: 3.75, rz: -0.32, rx: 0.34 },
    { x: 0, z: 2.6, height: 24, radius: 3.9, rz: 0.08, rx: 0.18 },
  ];
  leaves.forEach((leaf, index) => {
    const blade = mesh(new THREE.ConeGeometry(leaf.radius, leaf.height, 6), options.primaryColor, options.faceted);
    blade.name = `aloe_leaf_${index + 1}`;
    blade.position.set(leaf.x, leaf.height / 2 + 0.5, leaf.z);
    blade.rotation.set(leaf.rx, 0, leaf.rz);
    sculpture.add(blade);
  });
  group.add(sculpture);
  return group;
}

function snakeBladeGeometry(width: number, height: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width * 0.42, height * 0.66);
  shape.lineTo(0, height);
  shape.lineTo(-width * 0.42, height * 0.66);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.35,
    bevelThickness: 0.35,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function buildSnakePlant(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 30, options.topperHeight / 40, options.topperWidth / 30);
  const foot = mesh(new THREE.CylinderGeometry(9.8, 11, 4.4, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.2;
  sculpture.add(foot);
  [
    { x: -5.5, z: 0, h: 27, w: 7.5, rz: 0.22, ry: -0.1 },
    { x: 5.2, z: 0.8, h: 30, w: 7.2, rz: -0.2, ry: 0.18 },
    { x: -1.5, z: -3.8, h: 34, w: 7.3, rz: 0.08, ry: -0.45 },
    { x: 2.2, z: 3.8, h: 32, w: 7.3, rz: -0.1, ry: 0.45 },
    { x: 0, z: 0, h: 38, w: 7.6, rz: 0, ry: 0 },
  ].forEach((blade, index) => {
    const leaf = mesh(snakeBladeGeometry(blade.w, blade.h, 4.2), options.primaryColor, options.faceted);
    leaf.name = `snake_blade_${index + 1}`;
    leaf.position.set(blade.x, 1.2, blade.z);
    leaf.rotation.set(0, blade.ry, blade.rz);
    sculpture.add(leaf);
  });
  group.add(sculpture);
  return group;
}

function buildEggplant(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 28, options.topperHeight / 35, options.topperWidth / 28);
  const foot = mesh(new THREE.CylinderGeometry(9.2, 10.7, 4.5, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.25;
  sculpture.add(foot);
  const fruit = mesh(new THREE.DodecahedronGeometry(10, 1), options.primaryColor, options.faceted);
  fruit.name = "eggplant_body";
  fruit.scale.set(0.82, 1.15, 0.82);
  fruit.rotation.z = -0.08;
  fruit.position.set(0.5, 14.4, 0);
  sculpture.add(fruit);
  for (let i = 0; i < 5; i += 1) {
    const angle = i * Math.PI * 2 / 5;
    const crown = mesh(new THREE.SphereGeometry(4.5, 6, 4), "#55734b", options.faceted);
    crown.name = `eggplant_calyx_${i + 1}`;
    crown.scale.set(1.25, 0.38, 0.65);
    crown.rotation.y = -angle;
    crown.position.set(Math.cos(angle) * 2.8, 23.2, Math.sin(angle) * 2.8);
    sculpture.add(crown);
  }
  const stalk = mesh(new THREE.CylinderGeometry(1.4, 2, 6, 6), "#55734b", options.faceted);
  stalk.rotation.z = -0.16;
  stalk.position.set(0.5, 27, 0);
  sculpture.add(stalk);
  group.add(sculpture);
  return group;
}

function buildGrapes(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 30, options.topperHeight / 35, options.topperWidth / 30);
  const foot = mesh(new THREE.CylinderGeometry(9.5, 10.8, 4.3, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.15;
  sculpture.add(foot);
  const core = mesh(new THREE.CylinderGeometry(2.1, 2.8, 25, 7), options.primaryColor, options.faceted);
  core.position.y = 14.5;
  sculpture.add(core);
  const berries: Array<[number, number, number]> = [
    [-5, 25, 0], [0, 26.5, 0], [5, 25, 0],
    [-6, 20.5, 1.5], [-2, 21, -2.5], [2.5, 21, 2.4], [6, 20.5, -1],
    [-4.6, 16.5, -1.5], [0, 17, 2], [4.6, 16.5, -1.4],
    [-2.8, 12.7, 1], [2.8, 12.7, -1], [0, 9.4, 0],
  ];
  berries.forEach(([x, y, z], index) => {
    const berry = mesh(new THREE.DodecahedronGeometry(4.5, 0), options.primaryColor, options.faceted);
    berry.name = `grape_${index + 1}`;
    berry.position.set(x, y, z);
    sculpture.add(berry);
  });
  const stalk = mesh(new THREE.CylinderGeometry(1.4, 1.8, 7, 6), "#55734b", options.faceted);
  stalk.rotation.z = -0.15;
  stalk.position.set(0.5, 30.2, 0);
  sculpture.add(stalk);
  group.add(sculpture);
  return group;
}

function buildSunflower(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 34, options.topperHeight / 40, options.topperWidth / 34);
  const foot = mesh(new THREE.CylinderGeometry(9.5, 10.8, 4.3, 10), "#55734b", options.faceted);
  foot.position.y = 2.15;
  sculpture.add(foot);
  const stem = mesh(new THREE.CylinderGeometry(2.2, 2.9, 24, 7), "#55734b", options.faceted);
  stem.position.y = 14.5;
  sculpture.add(stem);
  [-1, 1].forEach((side, index) => {
    const leaf = mesh(new THREE.SphereGeometry(6, 7, 5), "#55734b", options.faceted);
    leaf.name = `sunflower_leaf_${index + 1}`;
    leaf.scale.set(1.2, 0.42, 0.55);
    leaf.rotation.z = side * 0.55;
    leaf.position.set(side * 4.8, 17, 0);
    sculpture.add(leaf);
  });
  const center = mesh(new THREE.CylinderGeometry(7.5, 7.5, 4.2, 10), "#6d523a", options.faceted);
  center.name = "sunflower_center";
  center.rotation.x = Math.PI / 2;
  center.position.y = 31.5;
  sculpture.add(center);
  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI * 2 / 12;
    const petal = mesh(new THREE.DodecahedronGeometry(4.8, 0), options.primaryColor, options.faceted);
    petal.name = `sunflower_petal_${i + 1}`;
    petal.scale.set(1.3, 0.55, 0.36);
    petal.rotation.z = angle;
    petal.position.set(Math.cos(angle) * 10, 31.5 + Math.sin(angle) * 10, 0);
    sculpture.add(petal);
  }
  group.add(sculpture);
  return group;
}

function buildSnail(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 35, options.topperHeight / 29, options.topperWidth / 35);
  const foot = mesh(new THREE.CylinderGeometry(10.5, 11.5, 4.6, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.3;
  sculpture.add(foot);
  const body = mesh(new THREE.DodecahedronGeometry(9, 1), "#b49368", options.faceted);
  body.name = "snail_body";
  body.scale.set(1.45, 0.45, 0.65);
  body.position.set(0, 8, 0);
  sculpture.add(body);
  const shell = mesh(new THREE.DodecahedronGeometry(10, 1), options.primaryColor, options.faceted);
  shell.name = "snail_shell";
  shell.scale.set(1, 0.95, 0.68);
  shell.position.set(-3.5, 14.6, 0);
  sculpture.add(shell);
  const head = mesh(new THREE.DodecahedronGeometry(6, 1), "#b49368", options.faceted);
  head.name = "snail_head";
  head.scale.set(0.95, 1, 0.8);
  head.position.set(8.5, 10, 0);
  sculpture.add(head);
  [-2.2, 2.2].forEach((z, index) => {
    const feeler = mesh(new THREE.CylinderGeometry(1.15, 1.5, 7, 6), "#b49368", options.faceted);
    feeler.name = `snail_feeler_${index + 1}`;
    feeler.rotation.z = index === 0 ? 0.18 : -0.18;
    feeler.position.set(9, 15.2, z);
    sculpture.add(feeler);
    const eye = mesh(new THREE.DodecahedronGeometry(1.9, 0), "#59483b", options.faceted);
    eye.position.set(index === 0 ? 8.4 : 9.6, 18.3, z);
    sculpture.add(eye);
  });
  [4.4, 2.1].forEach((radius, index) => {
    const spiral = mesh(new THREE.TorusGeometry(radius, index === 0 ? 1.3 : 1.05, 5, 12), "#644c3a", options.faceted);
    spiral.name = `shell_spiral_${index + 1}`;
    spiral.position.set(-3.5, 14.6, 5.9);
    sculpture.add(spiral);
  });
  group.add(sculpture);
  return group;
}

function buildFrog(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 32, options.topperHeight / 31, options.topperWidth / 32);
  const foot = mesh(new THREE.CylinderGeometry(10.6, 11.5, 4.6, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.3;
  sculpture.add(foot);
  const body = mesh(new THREE.DodecahedronGeometry(10, 1), options.primaryColor, options.faceted);
  body.name = "frog_body";
  body.scale.set(0.9, 0.85, 0.8);
  body.position.y = 12;
  sculpture.add(body);
  const head = mesh(new THREE.DodecahedronGeometry(8.5, 1), options.primaryColor, options.faceted);
  head.name = "frog_head";
  head.scale.set(1.05, 0.82, 0.85);
  head.position.y = 21;
  sculpture.add(head);
  [-5.3, 5.3].forEach((x, index) => {
    const eye = mesh(new THREE.DodecahedronGeometry(3.8, 0), options.primaryColor, options.faceted);
    eye.name = `frog_eye_${index + 1}`;
    eye.position.set(x, 26.5, 0);
    sculpture.add(eye);
    const footPad = mesh(new THREE.DodecahedronGeometry(5.2, 0), options.primaryColor, options.faceted);
    footPad.name = `frog_foot_${index + 1}`;
    footPad.scale.set(1.3, 0.42, 0.8);
    footPad.position.set(x * 1.2, 6.2, 1.2);
    sculpture.add(footPad);
  });
  const belly = mesh(new THREE.SphereGeometry(6.2, 8, 5), "#b9c99b", options.faceted);
  belly.scale.set(0.85, 0.95, 0.22);
  belly.position.set(0, 13, 7.2);
  sculpture.add(belly);
  group.add(sculpture);
  return group;
}

function buildHedgehog(options: ModelOptions) {
  const group = prepareTopper(options);
  const sculpture = new THREE.Group();
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(options.topperWidth / 35, options.topperHeight / 28, options.topperWidth / 35);
  const foot = mesh(new THREE.CylinderGeometry(10.8, 11.8, 4.6, 10), options.primaryColor, options.faceted);
  foot.position.y = 2.3;
  sculpture.add(foot);
  const body = mesh(new THREE.DodecahedronGeometry(11, 1), options.primaryColor, options.faceted);
  body.name = "hedgehog_body";
  body.scale.set(1.25, 0.72, 0.82);
  body.position.set(-1.5, 12, 0);
  sculpture.add(body);
  const face = mesh(new THREE.ConeGeometry(6.8, 12, 7), "#c5a27b", options.faceted);
  face.name = "hedgehog_face";
  face.rotation.z = -Math.PI / 2;
  face.position.set(8, 11.2, 0);
  sculpture.add(face);
  const nose = mesh(new THREE.DodecahedronGeometry(2.1, 0), "#4f4238", options.faceted);
  nose.position.set(14, 11.2, 0);
  sculpture.add(nose);
  [-3.8, 1.2].forEach((z, index) => {
    const ear = mesh(new THREE.DodecahedronGeometry(3, 0), "#c5a27b", options.faceted);
    ear.name = `hedgehog_ear_${index + 1}`;
    ear.scale.set(0.7, 1, 0.7);
    ear.position.set(4.3, 17.2, z);
    sculpture.add(ear);
  });
  [
    [-10, 18.2, -3.8, 0.26], [-5, 19.2, -4.2, 0.12], [0, 19.4, -4, -0.08],
    [-9, 18.5, 3.8, 0.22], [-4, 19.3, 4.1, 0.08], [1, 19.2, 3.8, -0.12],
  ].forEach(([x, y, z, rz], index) => {
    const quill = mesh(new THREE.ConeGeometry(3.8, 8.5, 5), options.primaryColor, options.faceted);
    quill.name = `hedgehog_quill_${index + 1}`;
    quill.rotation.z = rz;
    quill.position.set(x, y, z);
    sculpture.add(quill);
  });
  group.add(sculpture);
  return group;
}

function realisticLeafGeometry(length: number, width: number, thickness = 1.5) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.8, 0);
  shape.bezierCurveTo(length * 0.18, width * 0.58, length * 0.72, width * 0.56, length, 0);
  shape.bezierCurveTo(length * 0.72, -width * 0.56, length * 0.18, -width * 0.58, -0.8, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(0.45, thickness * 0.25),
    bevelThickness: Math.min(0.38, thickness * 0.22),
    curveSegments: 12,
  });
  geometry.translate(0, 0, -thickness / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function radialBloomGeometry(petals: number, innerRadius: number, outerRadius: number, depth: number) {
  const shape = new THREE.Shape();
  const samples = petals * 16;
  for (let index = 0; index < samples; index += 1) {
    const angle = index * Math.PI * 2 / samples;
    const wave = (Math.cos(angle * petals) + 1) / 2;
    const radius = innerRadius + (outerRadius - innerRadius) * Math.pow(wave, 0.72);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(0.65, depth * 0.28),
    bevelThickness: Math.min(0.55, depth * 0.24),
    curveSegments: 16,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function addRealisticLeaf(
  parent: THREE.Group,
  name: string,
  position: THREE.Vector3,
  length: number,
  width: number,
  color: string,
  yaw: number,
  roll: number,
  pitch = 0,
  thickness = 1.5,
) {
  const rig = new THREE.Group();
  rig.name = `${name}_rig`;
  rig.position.copy(position);
  rig.rotation.set(pitch, yaw, roll);
  const leaf = mesh(realisticLeafGeometry(length, width, thickness), color, false);
  leaf.name = name;
  rig.add(leaf);
  parent.add(rig);
}

function createRealisticSculpture(
  options: ModelOptions,
  nominalWidth: number,
  nominalHeight: number,
  socketColor: string,
) {
  const group = prepareTopper(options, socketColor);
  const sculpture = new THREE.Group();
  sculpture.name = `${options.modelId}_smooth_realistic_sculpture`;
  sculpture.position.y = ADAPTER_STANDARD.totalHeight - 0.05;
  sculpture.scale.set(
    options.topperWidth / nominalWidth,
    options.topperHeight / nominalHeight,
    options.topperWidth / nominalWidth,
  );
  group.add(sculpture);
  return { group, sculpture };
}

function addSmoothPlinth(parent: THREE.Group, color: string, radius = 11, height = 4.4) {
  const plinth = mesh(new THREE.CylinderGeometry(radius - 1.2, radius, height, 28), color, false);
  plinth.name = "smooth_reinforced_root_plinth";
  plinth.position.y = height / 2;
  parent.add(plinth);
}

function buildTomato(options: ModelOptions) {
  const green = "#4f7549";
  const fruitCount = Math.round(shapeValue(options, "fruitCount", 3));
  const fruitSize = shapeValue(options, "fruitSize", 1);
  const branchSpread = shapeValue(options, "branchSpread", 1);
  const leafDensity = Math.round(shapeValue(options, "leafDensity", 5));
  const { group, sculpture } = createRealisticSculpture(options, 34, 39, green);
  addSmoothPlinth(sculpture, green, 11.2);
  const stem = cylinderBetween(
    new THREE.Vector3(0, 3.2, 0),
    new THREE.Vector3(0.4, 31, 0),
    1.8,
    1.15,
    green,
    false,
    18,
  );
  stem.name = "tomato_main_stem";
  sculpture.add(stem);

  const fruits = [
    { center: new THREE.Vector3(-7.2, 15.2, 1.1), root: new THREE.Vector3(0, 17.8, 0), radius: 5.6 },
    { center: new THREE.Vector3(7.1, 12.2, -1.2), root: new THREE.Vector3(0, 15.1, 0), radius: 5.4 },
    { center: new THREE.Vector3(6.2, 23, 1.6), root: new THREE.Vector3(0.2, 24.8, 0), radius: 5.1 },
    { center: new THREE.Vector3(-5.8, 24.5, -1.5), root: new THREE.Vector3(0.2, 26.1, 0), radius: 4.7 },
    { center: new THREE.Vector3(-5, 9.8, 1.8), root: new THREE.Vector3(0, 12.3, 0), radius: 4.5 },
  ].slice(0, fruitCount);
  fruits.forEach(({ center, root, radius }, index) => {
    center.x *= branchSpread;
    center.z *= branchSpread;
    radius *= fruitSize;
    const shoulder = center.clone().add(new THREE.Vector3(0, radius * 0.72, 0));
    const branch = cylinderBetween(root, shoulder, 1.05, 0.7, green, false, 14);
    branch.name = `tomato_fruit_branch_${index + 1}`;
    sculpture.add(branch);
    const fruit = mesh(new THREE.SphereGeometry(radius, 24, 16), options.primaryColor, false);
    fruit.name = `smooth_tomato_${index + 1}`;
    fruit.scale.set(1, 0.9, 0.96);
    fruit.position.copy(center);
    sculpture.add(fruit);
    for (let calyx = 0; calyx < 3; calyx += 1) {
      addRealisticLeaf(
        sculpture,
        `tomato_calyx_${index + 1}_${calyx + 1}`,
        center.clone().add(new THREE.Vector3(0, radius * 0.72, 0)),
        3.3,
        1.25,
        green,
        calyx * Math.PI * 2 / 3,
        -0.22,
        0,
        1,
      );
    }
  });

  const leafTemplates = [
    [-0.2, 10, 0, 8.5, 4.6, 2.65, 0.24],
    [0.1, 13.2, 0, 8.2, 4.4, -0.48, 0.28],
    [0, 20, 0, 8.8, 4.8, 2.9, 0.22],
    [0.2, 25.5, 0, 7.7, 4.1, -0.26, 0.3],
    [0.3, 29, 0, 6.4, 3.6, 2.3, 0.42],
    [-0.1, 17.1, 0, 7.2, 4, 1.55, 0.3],
    [0.2, 27.8, 0, 6.5, 3.7, -1.4, 0.38],
  ];
  leafTemplates.slice(0, leafDensity).forEach(([x, y, z, length, width, yaw, roll], index) => {
    addRealisticLeaf(
      sculpture,
      `tomato_leaf_${index + 1}`,
      new THREE.Vector3(x, y, z),
      length,
      width,
      green,
      yaw,
      roll,
      index % 2 ? 0.18 : -0.12,
      1.55,
    );
  });
  return group;
}

function buildCarrot(options: ModelOptions) {
  const green = "#567b4b";
  const { group, sculpture } = createRealisticSculpture(options, 27, 38, options.primaryColor);
  addSmoothPlinth(sculpture, options.primaryColor, 10.3, 4.2);
  const carrotProfile = [
    new THREE.Vector2(0, 25.2),
    new THREE.Vector2(5.5, 25.2),
    new THREE.Vector2(7.1, 23),
    new THREE.Vector2(6.7, 19),
    new THREE.Vector2(4.8, 12),
    new THREE.Vector2(3.4, 7),
    new THREE.Vector2(2.3, 3.2),
    new THREE.Vector2(0, 3),
  ];
  const root = mesh(closedLatheGeometry(carrotProfile, 32), options.primaryColor, false);
  root.name = "smooth_tapered_carrot_root";
  sculpture.add(root);
  const crownHub = mesh(new THREE.SphereGeometry(5.2, 20, 12), green, false);
  crownHub.name = "carrot_fused_leaf_crown";
  crownHub.scale.y = 0.65;
  crownHub.position.y = 24.8;
  sculpture.add(crownHub);
  [
    { height: 12.8, x: -3.2, z: -0.7 },
    { height: 14.5, x: -1.6, z: 0.7 },
    { height: 16, x: 0, z: 0 },
    { height: 14.3, x: 1.6, z: -0.7 },
    { height: 12.6, x: 3.2, z: 0.7 },
  ].forEach((leaf, index) => {
    const blade = mesh(new THREE.ConeGeometry(1.55, leaf.height, 14), green, false);
    blade.name = `carrot_leaf_${index + 1}`;
    blade.position.set(leaf.x, 24.5 + leaf.height / 2, leaf.z);
    sculpture.add(blade);
  });
  return group;
}

function buildChili(options: ModelOptions) {
  const green = "#55754b";
  const { group, sculpture } = createRealisticSculpture(options, 38, 27, options.primaryColor);
  addSmoothPlinth(sculpture, options.primaryColor, 11.4, 4.2);
  const points = [
    new THREE.Vector3(-8.2, 13.7, 0),
    new THREE.Vector3(-3.4, 13, 0.5),
    new THREE.Vector3(1.2, 11.3, 0.2),
    new THREE.Vector3(5.3, 8.9, -0.2),
    new THREE.Vector3(8.3, 6.5, 0.1),
    new THREE.Vector3(10.2, 4.7, 0),
  ];
  const radii = [5.5, 5.1, 4.45, 3.55, 2.55, 1.45];
  points.forEach((point, index) => {
    const section = mesh(new THREE.SphereGeometry(radii[index], 24, 16), options.primaryColor, false);
    section.name = `chili_smooth_section_${index + 1}`;
    section.scale.set(1, 1.02, 0.78);
    section.position.copy(point);
    sculpture.add(section);
    if (index === 0) return;
    const bridge = cylinderBetween(
      points[index - 1],
      point,
      radii[index - 1] * 0.72,
      radii[index] * 0.72,
      options.primaryColor,
      false,
      20,
    );
    bridge.name = `chili_taper_bridge_${index}`;
    sculpture.add(bridge);
  });
  const shoulder = mesh(new THREE.SphereGeometry(3.4, 20, 12), green, false);
  shoulder.name = "chili_green_shoulder";
  shoulder.scale.set(1.15, 0.48, 0.9);
  shoulder.position.set(-8.4, 17.6, 0);
  sculpture.add(shoulder);
  const stalk = cylinderBetween(
    new THREE.Vector3(-8.3, 16.5, 0),
    new THREE.Vector3(-10.2, 23.2, 0.4),
    1.55,
    0.85,
    green,
    false,
    16,
  );
  stalk.name = "chili_curved_stalk";
  sculpture.add(stalk);
  return group;
}

function buildBasil(options: ModelOptions) {
  const green = options.primaryColor;
  const { group, sculpture } = createRealisticSculpture(options, 35, 36, green);
  addSmoothPlinth(sculpture, green, 11.3);
  const stems = [
    [new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(0, 31.5, 0)],
    [new THREE.Vector3(0, 13, 0), new THREE.Vector3(-7.5, 27, 1)],
    [new THREE.Vector3(0, 16, 0), new THREE.Vector3(7.4, 28, -1)],
  ];
  stems.forEach(([start, end], index) => {
    const stem = cylinderBetween(start, end, index === 0 ? 1.8 : 1.35, 0.9, green, false, 16);
    stem.name = `basil_branch_${index + 1}`;
    sculpture.add(stem);
  });
  [
    [0, 9, 0, 10.4, 5.8, 2.8, 0.27],
    [0, 12, 0, 10.2, 5.7, -0.35, 0.25],
    [0, 17, 0, 10.8, 6, 2.55, 0.3],
    [0, 20, 0, 10.2, 5.8, -0.58, 0.3],
    [-4, 21, 0.5, 9.2, 5.2, 2.55, 0.36],
    [-6.8, 25.8, 0.9, 7.8, 4.6, 2.1, 0.5],
    [4, 22, -0.5, 9.2, 5.2, -0.45, 0.36],
    [6.7, 26.6, -0.9, 7.8, 4.6, 0.2, 0.5],
    [0, 28, 0, 7.5, 4.3, 2.35, 0.48],
    [0, 30.5, 0, 6.8, 4, -0.8, 0.5],
  ].forEach(([x, y, z, length, width, yaw, roll], index) => {
    addRealisticLeaf(
      sculpture,
      `basil_soft_leaf_${index + 1}`,
      new THREE.Vector3(x, y, z),
      length,
      width,
      green,
      yaw,
      roll,
      index % 3 === 0 ? 0.18 : -0.1,
      1.65,
    );
  });
  return group;
}

function buildRosemary(options: ModelOptions) {
  const green = options.primaryColor;
  const wood = detailColor(green, -0.12);
  const { group, sculpture } = createRealisticSculpture(options, 30, 40, wood);
  addSmoothPlinth(sculpture, wood, 10.6);
  const stems = [
    { start: new THREE.Vector3(-4, 3.2, 0), end: new THREE.Vector3(-5.2, 34, 0.8) },
    { start: new THREE.Vector3(0, 3.2, 0), end: new THREE.Vector3(0.8, 38, -0.6) },
    { start: new THREE.Vector3(4, 3.2, 0), end: new THREE.Vector3(5.1, 32.5, 0.8) },
  ];
  stems.forEach(({ start, end }, stemIndex) => {
    const stem = cylinderBetween(start, end, 1.45, 0.82, wood, false, 14);
    stem.name = `rosemary_woody_stem_${stemIndex + 1}`;
    sculpture.add(stem);
    for (let level = 1; level <= 7; level += 1) {
      const t = level / 8;
      const anchor = start.clone().lerp(end, t);
      for (let side = 0; side < 2; side += 1) {
        const angle = level * 1.37 + stemIndex * 0.7 + side * Math.PI;
        const tip = anchor.clone().add(new THREE.Vector3(
          Math.cos(angle) * 4.6,
          2.2 + (level % 2) * 0.7,
          Math.sin(angle) * 4.6,
        ));
        const needle = cylinderBetween(anchor, tip, 0.78, 0.38, green, false, 10);
        needle.name = `rosemary_needle_${stemIndex + 1}_${level}_${side + 1}`;
        sculpture.add(needle);
      }
    }
  });
  return group;
}

function buildParsley(options: ModelOptions) {
  const green = options.primaryColor;
  const { group, sculpture } = createRealisticSculpture(options, 35, 34, green);
  addSmoothPlinth(sculpture, green, 11.2);
  const endpoints = [
    new THREE.Vector3(-7.2, 24, -1.5),
    new THREE.Vector3(6.8, 25, -1),
    new THREE.Vector3(-3, 29, 2),
    new THREE.Vector3(3.4, 30, 1.4),
    new THREE.Vector3(0, 32, -1.8),
  ];
  endpoints.forEach((endpoint, clusterIndex) => {
    const stem = cylinderBetween(
      new THREE.Vector3((clusterIndex - 2) * 0.65, 3.2, 0),
      endpoint,
      1.4,
      0.78,
      green,
      false,
      14,
    );
    stem.name = `parsley_stem_${clusterIndex + 1}`;
    sculpture.add(stem);
    const hub = mesh(new THREE.SphereGeometry(2.2, 16, 10), green, false);
    hub.name = `parsley_leaf_hub_${clusterIndex + 1}`;
    hub.position.copy(endpoint);
    sculpture.add(hub);
    const cluster = mesh(radialBloomGeometry(3, 2.2, 7.1, 1.7), green, false);
    cluster.name = `parsley_compound_leaf_${clusterIndex + 1}`;
    cluster.position.copy(endpoint);
    cluster.rotation.y = clusterIndex * 0.42 - 0.75;
    cluster.rotation.z = clusterIndex % 2 ? 0.18 : -0.15;
    sculpture.add(cluster);
  });
  return group;
}

function buildDaisy(options: ModelOptions) {
  const green = "#52794f";
  const yellow = "#d5a83d";
  const { group, sculpture } = createRealisticSculpture(options, 34, 40, green);
  addSmoothPlinth(sculpture, green, 10.7);
  const stem = mesh(new THREE.CylinderGeometry(1.45, 2.2, 28, 18), green, false);
  stem.name = "daisy_reinforced_stem";
  stem.position.y = 16.5;
  sculpture.add(stem);
  addRealisticLeaf(sculpture, "daisy_left_leaf", new THREE.Vector3(0, 13, 0), 9, 4.4, green, 2.7, 0.28, 0.15, 1.5);
  addRealisticLeaf(sculpture, "daisy_right_leaf", new THREE.Vector3(0, 18, 0), 8.5, 4.1, green, -0.45, 0.3, -0.12, 1.5);
  const flowerY = 31;
  const petals = mesh(radialBloomGeometry(12, 4.15, 11.2, 2.4), options.primaryColor, false);
  petals.name = "daisy_single_continuous_petal_crown";
  petals.position.set(0, flowerY, 0);
  sculpture.add(petals);
  const center = mesh(new THREE.SphereGeometry(5, 24, 16), yellow, false);
  center.name = "daisy_domed_center";
  center.scale.set(1, 1, 0.55);
  center.position.set(0, flowerY, 1.1);
  sculpture.add(center);
  return group;
}

function buildRose(options: ModelOptions) {
  const green = "#4f754c";
  const { group, sculpture } = createRealisticSculpture(options, 33, 40, green);
  addSmoothPlinth(sculpture, green, 10.8);
  const stem = mesh(new THREE.CylinderGeometry(1.5, 2.2, 27, 18), green, false);
  stem.name = "rose_reinforced_stem";
  stem.position.y = 16;
  sculpture.add(stem);
  addRealisticLeaf(sculpture, "rose_left_leaf", new THREE.Vector3(0, 13, 0), 9.2, 4.6, green, 2.72, 0.3, 0.12, 1.55);
  addRealisticLeaf(sculpture, "rose_right_leaf", new THREE.Vector3(0, 19, 0), 8.8, 4.4, green, -0.48, 0.3, -0.12, 1.55);

  const outerBloom = mesh(radialBloomGeometry(7, 4.7, 9.8, 3), options.primaryColor, false);
  outerBloom.name = "rose_continuous_outer_petals";
  outerBloom.position.set(0, 31, 0);
  outerBloom.rotation.z = 0.12;
  sculpture.add(outerBloom);
  const innerColor = detailColor(options.primaryColor, -0.035);
  const innerBloom = mesh(radialBloomGeometry(5, 2.8, 6.4, 3.2), innerColor, false);
  innerBloom.name = "rose_continuous_inner_petals";
  innerBloom.position.set(0, 31.6, 1.15);
  innerBloom.rotation.z = -0.22;
  sculpture.add(innerBloom);
  const roseHeart = mesh(new THREE.SphereGeometry(3.25, 20, 14), detailColor(options.primaryColor, -0.07), false);
  roseHeart.name = "rose_rolled_heart";
  roseHeart.scale.set(0.9, 1.1, 0.62);
  roseHeart.position.set(0, 32.1, 2.1);
  sculpture.add(roseHeart);
  return group;
}

function buildLemon(options: ModelOptions) {
  const green = "#55784d";
  const { group, sculpture } = createRealisticSculpture(options, 30, 33, options.primaryColor);
  addSmoothPlinth(sculpture, options.primaryColor, 10.5, 4.2);
  const fruit = mesh(new THREE.SphereGeometry(9, 28, 18), options.primaryColor, false);
  fruit.name = "smooth_lemon_body";
  fruit.scale.set(0.83, 1.08, 0.83);
  fruit.position.y = 13.8;
  sculpture.add(fruit);
  const lowerNipple = mesh(new THREE.SphereGeometry(2.2, 18, 10), options.primaryColor, false);
  lowerNipple.name = "lemon_lower_nipple";
  lowerNipple.scale.y = 0.7;
  lowerNipple.position.y = 4.2;
  sculpture.add(lowerNipple);
  const upperNipple = mesh(new THREE.SphereGeometry(2.3, 18, 10), options.primaryColor, false);
  upperNipple.name = "lemon_upper_nipple";
  upperNipple.scale.y = 0.75;
  upperNipple.position.y = 23.4;
  sculpture.add(upperNipple);
  const stem = cylinderBetween(
    new THREE.Vector3(0, 22.3, 0),
    new THREE.Vector3(-0.7, 28, 0),
    1.35,
    0.78,
    green,
    false,
    16,
  );
  stem.name = "lemon_stem";
  sculpture.add(stem);
  addRealisticLeaf(sculpture, "lemon_leaf", new THREE.Vector3(-0.4, 26, 0), 8.6, 4.4, green, -0.45, 0.22, 0.16, 1.5);
  return group;
}

function buildBamboo(options: ModelOptions) {
  const green = options.primaryColor;
  const caneCount = Math.round(shapeValue(options, "caneCount", 3));
  const nodeCount = Math.round(shapeValue(options, "nodeCount", 4));
  const caneThickness = shapeValue(options, "caneThickness", 1);
  const leafDensity = Math.round(shapeValue(options, "leafDensity", 3));
  const { group, sculpture } = createRealisticSculpture(options, 31, 43, green);
  addSmoothPlinth(sculpture, green, 10.7);
  const canes = [
    { x: -5, z: -0.8, height: 31, radius: 2.05 },
    { x: 0, z: 0.7, height: 38, radius: 2.3 },
    { x: 5, z: -0.2, height: 34, radius: 2.1 },
    { x: -6.5, z: 4.5, height: 27, radius: 1.9 },
    { x: 6.8, z: 4.8, height: 29, radius: 1.85 },
  ].slice(0, caneCount).map((cane) => ({ ...cane, radius: cane.radius * caneThickness }));
  canes.forEach(({ x, z, height, radius }, caneIndex) => {
    const cane = mesh(new THREE.CylinderGeometry(radius * 0.92, radius, height, 22), green, false);
    cane.name = `smooth_bamboo_cane_${caneIndex + 1}`;
    cane.position.set(x, 3.2 + height / 2, z);
    sculpture.add(cane);
    for (let node = 1; node <= nodeCount; node += 1) {
      const ring = mesh(new THREE.CylinderGeometry(radius + 0.32, radius + 0.32, 0.78, 22), detailColor(green, 0.035), false);
      ring.name = `bamboo_node_${caneIndex + 1}_${node}`;
      ring.position.set(x, 3.2 + node * height / (nodeCount + 1), z);
      sculpture.add(ring);
    }
    const cap = mesh(new THREE.SphereGeometry(radius, 20, 10), green, false);
    cap.name = `bamboo_cane_cap_${caneIndex + 1}`;
    cap.scale.y = 0.35;
    cap.position.set(x, 3.2 + height, z);
    sculpture.add(cap);
  });

  [
    { root: new THREE.Vector3(0, 28, 0.7), tip: new THREE.Vector3(8, 32, 0.5), yaw: 0.1 },
    { root: new THREE.Vector3(5, 23, -0.2), tip: new THREE.Vector3(11, 27, 0.2), yaw: -0.05 },
    { root: new THREE.Vector3(-5, 20, -0.8), tip: new THREE.Vector3(-11, 24, -0.2), yaw: Math.PI },
    { root: new THREE.Vector3(0, 20, 0.7), tip: new THREE.Vector3(-7, 23.5, -2.6), yaw: Math.PI + 0.2 },
    { root: new THREE.Vector3(5, 17, -0.2), tip: new THREE.Vector3(10.5, 20.5, 2.8), yaw: -0.2 },
  ].slice(0, leafDensity).forEach(({ root, tip, yaw }, index) => {
    const branch = cylinderBetween(root, tip, 1.05, 0.62, green, false, 14);
    branch.name = `bamboo_leaf_branch_${index + 1}`;
    sculpture.add(branch);
    const leafJoint = mesh(new THREE.SphereGeometry(2.8, 16, 10), green, false);
    leafJoint.name = `bamboo_fused_leaf_joint_${index + 1}`;
    leafJoint.position.copy(tip);
    sculpture.add(leafJoint);
    addRealisticLeaf(sculpture, `bamboo_leaf_${index + 1}_a`, tip, 8, 3.6, green, yaw, 0.3, 0.12, 1.45);
    addRealisticLeaf(sculpture, `bamboo_leaf_${index + 1}_b`, tip.clone().add(new THREE.Vector3(0, -0.7, 0)), 7.4, 3.3, green, yaw + 0.7, 0.24, -0.1, 1.45);
  });
  return group;
}

function buildReindeer(options: ModelOptions) {
  const brown = options.primaryColor;
  const darkBrown = "#6b4934";
  const { group, sculpture } = createRealisticSculpture(options, 38, 48, brown);
  addSmoothPlinth(sculpture, brown, 11.2, 4.5);

  const body = mesh(new THREE.SphereGeometry(10.8, 26, 18), brown, false);
  body.name = "reindeer_rounded_body";
  body.scale.set(1.12, 1.2, 0.9);
  body.position.set(0, 15.2, 0);
  sculpture.add(body);

  const head = mesh(new THREE.SphereGeometry(8.7, 26, 18), brown, false);
  head.name = "reindeer_fused_head";
  head.scale.set(1.04, 1.02, 0.9);
  head.position.set(0, 30, 0.2);
  sculpture.add(head);

  const muzzle = mesh(new THREE.SphereGeometry(4.2, 22, 14), brown, false);
  muzzle.name = "reindeer_short_muzzle";
  muzzle.scale.set(1.12, 0.72, 0.52);
  muzzle.position.set(0, 27.8, 7.2);
  sculpture.add(muzzle);
  const nose = mesh(new THREE.SphereGeometry(1.9, 18, 12), darkBrown, false);
  nose.name = "reindeer_round_nose";
  nose.position.set(0, 29.1, 9.2);
  sculpture.add(nose);

  [-1, 1].forEach((side) => {
    const ear = mesh(new THREE.SphereGeometry(3.35, 20, 14), brown, false);
    ear.name = `reindeer_${side < 0 ? "left" : "right"}_ear`;
    ear.scale.set(1.05, 0.55, 0.42);
    ear.rotation.z = side * 0.48;
    ear.position.set(side * 7.15, 34.2, 0.3);
    sculpture.add(ear);

    const eye = mesh(new THREE.SphereGeometry(0.55, 14, 10), darkBrown, false);
    eye.name = `reindeer_${side < 0 ? "left" : "right"}_eye`;
    eye.position.set(side * 2.75, 31.6, 7.65);
    sculpture.add(eye);

    const root = new THREE.Vector3(side * 4.1, 36, 0);
    const crown = new THREE.Vector3(side * 5.15, 44.3, 0);
    const antler = cylinderBetween(root, crown, 2.35, 1.9, darkBrown, false, 18);
    antler.name = `reindeer_${side < 0 ? "left" : "right"}_antler_stem`;
    sculpture.add(antler);
    const branch = cylinderBetween(
      new THREE.Vector3(side * 4.75, 40.3, 0),
      new THREE.Vector3(side * 8.05, 43.2, 0),
      1.95,
      1.65,
      darkBrown,
      false,
      16,
    );
    branch.name = `reindeer_${side < 0 ? "left" : "right"}_antler_branch`;
    sculpture.add(branch);
  });

  [-1, 1].forEach((side) => {
    const hoof = mesh(new THREE.SphereGeometry(4.3, 20, 14), darkBrown, false);
    hoof.name = `reindeer_${side < 0 ? "left" : "right"}_front_hoof`;
    hoof.scale.set(0.9, 0.62, 0.82);
    hoof.position.set(side * 5.5, 7.1, 5.2);
    sculpture.add(hoof);
  });
  return group;
}

function buildSanta(options: ModelOptions) {
  const red = options.primaryColor;
  const white = "#f5f1e7";
  const skin = "#e7b18f";
  const charcoal = "#2d2928";
  const gold = "#d9ad3f";
  const { group, sculpture } = createRealisticSculpture(options, 35, 45, red);
  addSmoothPlinth(sculpture, red, 10.9, 4.4);

  // Keep the main silhouette continuous. The previous body was assembled from
  // several near-tangent spheres and tori, which produced broken-looking
  // interleaved surfaces in the live preview and unreliable boolean seams.
  const body = mesh(closedLatheGeometry([
    new THREE.Vector2(0, 23.4),
    new THREE.Vector2(5.65, 23.1),
    new THREE.Vector2(7.55, 20.5),
    new THREE.Vector2(8.85, 16.4),
    new THREE.Vector2(9.05, 12.6),
    new THREE.Vector2(8.25, 7.2),
    new THREE.Vector2(6.7, 3.7),
    new THREE.Vector2(0, 3.5),
  ], 32), red, false);
  body.name = "santa_continuous_suit_body";
  body.scale.z = 0.92;
  sculpture.add(body);

  const belt = mesh(new THREE.CylinderGeometry(9.2, 9.25, 1.45, 32), charcoal, false);
  belt.name = "santa_clean_belt_band";
  belt.scale.z = 0.92;
  belt.position.set(0, 13.7, 0);
  sculpture.add(belt);
  const buckle = mesh(new THREE.BoxGeometry(3.9, 3.25, 1.15), gold, false);
  buckle.name = "santa_belt_buckle";
  buckle.position.set(0, 13.7, 8.85);
  sculpture.add(buckle);

  const head = mesh(new THREE.SphereGeometry(6.25, 30, 20), skin, false);
  head.name = "santa_face";
  head.scale.set(0.97, 1.02, 0.92);
  head.position.set(0, 26.8, 0.05);
  sculpture.add(head);

  const beard = mesh(new THREE.SphereGeometry(5.1, 26, 18), white, false);
  beard.name = "santa_single_beard_mass";
  beard.scale.set(0.88, 1.08, 0.5);
  beard.position.set(0, 23.25, 4.9);
  sculpture.add(beard);
  [
    [-2.75, 20.1, 5.2, 1.85],
    [0, 19.25, 5.45, 2.25],
    [2.75, 20.1, 5.2, 1.85],
  ].forEach(([x, y, z, radius], index) => {
    const tuft = mesh(new THREE.SphereGeometry(radius, 18, 12), white, false);
    tuft.name = `santa_beard_tuft_${index + 1}`;
    tuft.scale.set(0.9, 1.16, 0.62);
    tuft.position.set(x, y, z);
    sculpture.add(tuft);
  });

  [-1, 1].forEach((side) => {
    const moustache = mesh(new THREE.SphereGeometry(1.85, 18, 12), white, false);
    moustache.name = `santa_moustache_${side < 0 ? "left" : "right"}`;
    moustache.scale.set(1.05, 0.38, 0.46);
    moustache.rotation.z = side * 0.22;
    moustache.position.set(side * 1.55, 26.2, 6.05);
    sculpture.add(moustache);
    const eye = mesh(new THREE.SphereGeometry(0.56, 14, 10), charcoal, false);
    eye.name = `santa_eye_${side < 0 ? "left" : "right"}`;
    eye.position.set(side * 1.95, 28.85, 5.72);
    sculpture.add(eye);
  });
  const nose = mesh(new THREE.SphereGeometry(1.22, 18, 12), skin, false);
  nose.name = "santa_round_nose";
  nose.position.set(0, 26.85, 6.52);
  sculpture.add(nose);

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Vector3(side * 6.75, 19.2, 0);
    const wrist = new THREE.Vector3(side * 10.55, 13.9, 1.05);
    const arm = cylinderBetween(shoulder, wrist, 2.55, 2.1, red, false, 20);
    arm.name = `santa_${side < 0 ? "left" : "right"}_sleeve`;
    sculpture.add(arm);
    const gloveJoint = wrist.clone().add(new THREE.Vector3(side * 1.3, -1.8, 0.25));
    const cuff = cylinderBetween(wrist, gloveJoint, 2.18, 2.12, white, false, 20);
    cuff.name = `santa_${side < 0 ? "left" : "right"}_cuff`;
    sculpture.add(cuff);
    const mitten = mesh(new THREE.SphereGeometry(2.18, 20, 14), charcoal, false);
    mitten.name = `santa_${side < 0 ? "left" : "right"}_mitten`;
    mitten.scale.set(0.82, 1, 0.8);
    mitten.position.copy(gloveJoint).add(new THREE.Vector3(side * 0.65, -0.55, 0.05));
    sculpture.add(mitten);
  });

  const hatBrim = mesh(new THREE.CylinderGeometry(6.3, 6.2, 1.65, 32), white, false);
  hatBrim.name = "santa_hat_fur_brim";
  hatBrim.position.set(0, 32.25, 0);
  sculpture.add(hatBrim);
  const hat = mesh(new THREE.ConeGeometry(5.95, 11.2, 32), red, false);
  hat.name = "santa_tapered_hat";
  hat.position.set(0, 38.0, 0);
  sculpture.add(hat);
  const pom = mesh(new THREE.SphereGeometry(1.95, 20, 14), white, false);
  pom.name = "santa_hat_pom";
  pom.position.set(0, 44.05, 0);
  sculpture.add(pom);
  return group;
}

function buildChristmasTree(options: ModelOptions) {
  const green = options.primaryColor;
  const trunkColor = "#6f5138";
  const gold = "#dfb33f";
  const red = "#c5373d";
  const tierCount = Math.round(shapeValue(options, "tierCount", 5));
  const crownFullness = shapeValue(options, "crownFullness", 1);
  const ornamentCount = Math.round(shapeValue(options, "leafDensity", 24));
  const starSize = shapeValue(options, "tipRoundness", 1);
  const { group, sculpture } = createRealisticSculpture(options, 36, 48, green);
  addSmoothPlinth(sculpture, trunkColor, 10.9, 4.4);

  const trunk = mesh(new THREE.CylinderGeometry(2.3, 3.8, 33, 20), trunkColor, false);
  trunk.name = "christmas_tree_reinforced_trunk";
  trunk.position.y = 18.5;
  sculpture.add(trunk);

  const layers = Array.from({ length: tierCount }, (_, index) => {
    const progress = tierCount === 1 ? 1 : index / (tierCount - 1);
    return {
      radius: THREE.MathUtils.lerp(17, 5.5, progress) * crownFullness,
      height: THREE.MathUtils.lerp(15, 9.5, progress),
      y: THREE.MathUtils.lerp(12.2, 34.5, progress),
      rotation: index % 2 ? Math.PI / 12 : 0,
    };
  });
  const treeProfile = [new THREE.Vector2(0, 38.8)];
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    treeProfile.push(
      new THREE.Vector2(layer.radius * 0.38, layer.y + layer.height * 0.28),
      new THREE.Vector2(layer.radius, layer.y - layer.height * 0.43),
    );
  }
  treeProfile.push(new THREE.Vector2(0, 4.2));
  const crown = mesh(closedLatheGeometry(treeProfile, 36), green, false);
  crown.name = "christmas_tree_continuous_tiered_crown";
  sculpture.add(crown);

  for (let index = 0; index < ornamentCount; index += 1) {
    const layer = layers[index % layers.length];
    const ring = Math.floor(index / layers.length);
    const angle = ring * 2.399 + index * Math.PI * 2 / ornamentCount;
    const radius = layer.radius * 0.65;
    const bauble = mesh(
      new THREE.SphereGeometry(index % 3 === 0 ? 1.35 : 1.2, 16, 10),
      index % 3 === 0 ? gold : red,
      false,
    );
    bauble.name = `christmas_tree_bauble_${index + 1}`;
    bauble.position.set(
      Math.cos(angle) * radius,
      layer.y - layer.height * 0.09,
      Math.sin(angle) * radius,
    );
    sculpture.add(bauble);
  }

  const star = mesh(starPrismGeometry(4.15 * starSize, 1.9 * starSize, 2), gold, false);
  star.name = "christmas_tree_fused_star";
  star.position.y = 40.2;
  sculpture.add(star);
  return group;
}

function buildSnowman(options: ModelOptions) {
  const snow = options.primaryColor;
  const charcoal = "#293136";
  const red = "#b8333c";
  const orange = "#dc7a2c";
  const branchColor = "#73533c";
  const { group, sculpture } = createRealisticSculpture(options, 34, 46, snow);
  addSmoothPlinth(sculpture, snow, 10.9, 4.4);

  const snowBody = mesh(closedLatheGeometry([
    new THREE.Vector2(0, 38.1),
    new THREE.Vector2(3.2, 37.4),
    new THREE.Vector2(5.5, 34.7),
    new THREE.Vector2(5.7, 31.8),
    new THREE.Vector2(5.1, 29.2),
    new THREE.Vector2(3.8, 27.3),
    new THREE.Vector2(5.7, 27),
    new THREE.Vector2(6.7, 24.1),
    new THREE.Vector2(6.65, 20.5),
    new THREE.Vector2(5.5, 17.2),
    new THREE.Vector2(4.8, 16),
    new THREE.Vector2(7.1, 16.6),
    new THREE.Vector2(8.2, 13.3),
    new THREE.Vector2(8.15, 9),
    new THREE.Vector2(6.7, 5.1),
    new THREE.Vector2(0, 3),
  ], 32), snow, false);
  snowBody.name = "snowman_continuous_three_ball_body";
  snowBody.scale.z = 0.94;
  sculpture.add(snowBody);

  const scarf = mesh(new THREE.TorusGeometry(5.35, 1.15, 10, 32), red, false);
  scarf.name = "snowman_scarf_collar";
  scarf.rotation.x = Math.PI / 2;
  scarf.position.set(0, 27.6, 0);
  sculpture.add(scarf);
  const scarfTail = mesh(new THREE.BoxGeometry(3.5, 9.5, 1.8), red, false);
  scarfTail.name = "snowman_scarf_tail";
  scarfTail.rotation.z = -0.22;
  scarfTail.position.set(3.8, 23.5, 5.2);
  sculpture.add(scarfTail);

  const hatBrim = mesh(new THREE.BoxGeometry(13, 1.6, 11), charcoal, false);
  hatBrim.name = "snowman_hat_brim";
  hatBrim.position.y = 37.5;
  sculpture.add(hatBrim);
  const hatCrown = mesh(new THREE.CylinderGeometry(4.4, 4.75, 7.2, 28), charcoal, false);
  hatCrown.name = "snowman_hat_crown";
  hatCrown.position.y = 41.3;
  sculpture.add(hatCrown);
  const hatBand = mesh(new THREE.CylinderGeometry(4.82, 4.82, 1.25, 28), red, false);
  hatBand.name = "snowman_hat_band";
  hatBand.position.y = 38.6;
  sculpture.add(hatBand);

  [-1, 1].forEach((side) => {
    const eye = mesh(new THREE.SphereGeometry(0.65, 14, 10), charcoal, false);
    eye.name = `snowman_eye_${side < 0 ? "left" : "right"}`;
    eye.position.set(side * 1.9, 33.8, 5.25);
    sculpture.add(eye);
    const armStart = new THREE.Vector3(side * 5.2, 23.2, 0);
    const armEnd = new THREE.Vector3(side * 13.1, 26.4, 0.6);
    const arm = cylinderBetween(armStart, armEnd, 1.25, 0.82, branchColor, false, 12);
    arm.name = `snowman_branch_arm_${side < 0 ? "left" : "right"}`;
    sculpture.add(arm);
    [-1, 1].forEach((fork) => {
      const twig = cylinderBetween(
        armEnd.clone().add(new THREE.Vector3(side * -0.7, -0.25, 0)),
        armEnd.clone().add(new THREE.Vector3(side * 2.35, fork * 2.2, fork * 0.8)),
        0.78,
        0.45,
        branchColor,
        false,
        10,
      );
      twig.name = `snowman_${side < 0 ? "left" : "right"}_twig_${fork < 0 ? "lower" : "upper"}`;
      sculpture.add(twig);
    });
  });
  const nose = mesh(new THREE.ConeGeometry(1.25, 5, 18), orange, false);
  nose.name = "snowman_carrot_nose";
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 32.3, 6.8);
  sculpture.add(nose);
  [19.3, 23.1].forEach((y, index) => {
    const button = mesh(new THREE.SphereGeometry(0.9, 14, 10), charcoal, false);
    button.name = `snowman_coal_button_${index + 1}`;
    button.position.set(0, y, 6.15);
    sculpture.add(button);
  });
  return group;
}

function buildGiftBox(options: ModelOptions) {
  const red = options.primaryColor;
  const gold = "#deb23f";
  const { group, sculpture } = createRealisticSculpture(options, 32, 31, red);
  addSmoothPlinth(sculpture, red, 11, 4.4);

  const box = mesh(new THREE.BoxGeometry(21, 18, 21), red, false);
  box.name = "gift_box_body";
  box.position.y = 12.5;
  sculpture.add(box);
  const lid = mesh(new THREE.BoxGeometry(23, 3.2, 23), detailColor(red, 0.045), false);
  lid.name = "gift_box_lid";
  lid.position.y = 22;
  sculpture.add(lid);
  const ribbonFront = mesh(new THREE.BoxGeometry(3.4, 19.5, 22.1), gold, false);
  ribbonFront.name = "gift_vertical_ribbon";
  ribbonFront.position.y = 13.5;
  sculpture.add(ribbonFront);
  const ribbonSide = mesh(new THREE.BoxGeometry(22.1, 19.5, 3.4), gold, false);
  ribbonSide.name = "gift_cross_ribbon";
  ribbonSide.position.y = 13.5;
  sculpture.add(ribbonSide);

  [-1, 1].forEach((side) => {
    const loop = mesh(new THREE.TorusGeometry(3.2, 1.05, 12, 28), gold, false);
    loop.name = `gift_bow_loop_${side < 0 ? "left" : "right"}`;
    loop.scale.set(1.15, 0.72, 0.72);
    loop.rotation.z = side * 0.28;
    loop.position.set(side * 3.25, 24.4, 0);
    sculpture.add(loop);
    const tail = mesh(new THREE.BoxGeometry(2.2, 8.5, 1.8), gold, false);
    tail.name = `gift_bow_tail_${side < 0 ? "left" : "right"}`;
    tail.rotation.z = side * 0.62;
    tail.position.set(side * 2.4, 24, 0);
    sculpture.add(tail);
  });
  const knot = mesh(new THREE.SphereGeometry(2.35, 18, 12), gold, false);
  knot.name = "gift_bow_knot";
  knot.scale.z = 0.82;
  knot.position.set(0, 24.3, 0);
  sculpture.add(knot);
  return group;
}

function buildCandyCane(options: ModelOptions) {
  const red = options.primaryColor;
  const white = "#f7f1e5";
  const { group, sculpture } = createRealisticSculpture(options, 29, 39, red);
  addSmoothPlinth(sculpture, red, 10.7, 4.4);
  const caneShape = new THREE.Shape();
  caneShape.moveTo(-8.5, 3.1);
  caneShape.lineTo(-8.5, 27.5);
  caneShape.bezierCurveTo(-8.5, 34.8, -3.4, 37.6, 1.5, 36.5);
  caneShape.bezierCurveTo(6.5, 35.4, 9, 31.2, 9, 25.2);
  caneShape.lineTo(3, 25.2);
  caneShape.bezierCurveTo(3, 29.2, 1.4, 31.2, -1.1, 31.2);
  caneShape.bezierCurveTo(-3.1, 31.2, -2.5, 28.4, -2.5, 26.1);
  caneShape.lineTo(-2.5, 3.1);
  caneShape.closePath();
  const caneGeometry = new THREE.ExtrudeGeometry(caneShape, {
    depth: 6.4,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.55,
    bevelThickness: 0.5,
    curveSegments: 16,
  });
  caneGeometry.translate(0, 0, -3.2);
  caneGeometry.computeVertexNormals();
  const cane = mesh(caneGeometry, red, false);
  cane.name = "candy_cane_continuous_rounded_body";
  sculpture.add(cane);

  const addStripe = (name: string, x: number, y: number, length: number, rotation: number) => {
    [-1, 1].forEach((side) => {
      const stripe = mesh(new THREE.BoxGeometry(length, 1.35, 1.5), white, false);
      stripe.name = `${name}_${side < 0 ? "back" : "front"}`;
      stripe.rotation.z = rotation;
      stripe.position.set(x, y, side * 3);
      sculpture.add(stripe);
    });
  };
  [9.5, 15.5, 21.5, 27].forEach((y, index) => {
    addStripe(`candy_cane_straight_stripe_${index + 1}`, -5.5, y, 5.4, -0.42);
  });
  [
    { x: -3, y: 33.6, length: 4.2, rotation: -0.62 },
    { x: 2.35, y: 33.8, length: 4.1, rotation: 0.18 },
    { x: 6.1, y: 28.4, length: 4.3, rotation: -0.45 },
  ].forEach(({ x, y, length, rotation }, index) => {
    addStripe(`candy_cane_hook_stripe_${index + 1}`, x, y, length, rotation);
  });
  return group;
}

function buildChristmasBell(options: ModelOptions) {
  const gold = options.primaryColor;
  const red = "#b8323c";
  const { group, sculpture } = createRealisticSculpture(options, 31, 40, gold);
  addSmoothPlinth(sculpture, gold, 10.8, 4.4);
  const support = mesh(new THREE.CylinderGeometry(2.5, 3.4, 13, 20), gold, false);
  support.name = "bell_hidden_reinforced_support";
  support.position.y = 9;
  sculpture.add(support);

  const bellProfile = [
    new THREE.Vector2(0, 31),
    new THREE.Vector2(2.5, 31),
    new THREE.Vector2(4.6, 28.7),
    new THREE.Vector2(5.7, 24.8),
    new THREE.Vector2(7.2, 18.6),
    new THREE.Vector2(9.5, 13.3),
    new THREE.Vector2(10.7, 11.4),
    new THREE.Vector2(10.7, 10),
    new THREE.Vector2(0, 10),
  ];
  const bell = mesh(closedLatheGeometry(bellProfile, 32), gold, false);
  bell.name = "solid_flared_christmas_bell";
  sculpture.add(bell);
  const rim = mesh(new THREE.TorusGeometry(10.15, 1.15, 12, 36), detailColor(gold, 0.055), false);
  rim.name = "bell_raised_rim";
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 11.2;
  sculpture.add(rim);
  const clapperStem = mesh(new THREE.CylinderGeometry(1.2, 1.2, 5.2, 16), detailColor(gold, -0.04), false);
  clapperStem.name = "bell_clapper_stem";
  clapperStem.position.y = 8.2;
  sculpture.add(clapperStem);
  const clapper = mesh(new THREE.SphereGeometry(2.45, 20, 14), detailColor(gold, -0.04), false);
  clapper.name = "bell_clapper";
  clapper.position.y = 5.9;
  sculpture.add(clapper);
  const crown = mesh(new THREE.SphereGeometry(2.5, 20, 14), gold, false);
  crown.name = "bell_bow_mount";
  crown.scale.y = 0.82;
  crown.position.y = 30.7;
  sculpture.add(crown);

  [-1, 1].forEach((side) => {
    const loop = mesh(new THREE.TorusGeometry(3.2, 1, 12, 28), red, false);
    loop.name = `bell_bow_loop_${side < 0 ? "left" : "right"}`;
    loop.scale.set(1.18, 0.76, 0.7);
    loop.rotation.z = side * 0.3;
    loop.position.set(side * 3.1, 32.3, 0);
    sculpture.add(loop);
  });
  const knot = mesh(new THREE.SphereGeometry(2.25, 18, 12), red, false);
  knot.name = "bell_bow_knot";
  knot.scale.z = 0.82;
  knot.position.y = 32.1;
  sculpture.add(knot);
  return group;
}

function buildMushroom(options: ModelOptions) {
  const stemGroup = prepareTopper(options, options.accentColor);
  stemGroup.name = "mushroom_stem";
  const sx = options.topperWidth / 32;
  const sy = options.topperHeight / 34;
  // The outer cap may vary inside the requested topper envelope, but its
  // central press-fit socket must never be rescaled with that decorative
  // variation. Cap the outer-only factor instead of scaling the whole part.
  const capDiameter = Math.min(shapeValue(options, "capDiameter", 1), 32 / 27.6);
  const capDome = shapeValue(options, "capDome", 1);
  const stemThickness = shapeValue(options, "stemThickness", 1);
  const gillCount = Math.round(shapeValue(options, "gillCount", 12));
  const topY = ADAPTER_STANDARD.totalHeight - 0.05;
  const stemSculpture = new THREE.Group();
  stemSculpture.position.y = topY;
  stemSculpture.scale.set(sx, sy, sx);
  const foot = mesh(new THREE.CylinderGeometry(8.7, 10.2, 3.8, 12), options.accentColor, options.faceted);
  foot.name = "mushroom_root_plinth";
  foot.position.y = 1.9;
  stemSculpture.add(foot);
  const stemProfile = [
    new THREE.Vector2(0, 20.6),
    new THREE.Vector2(4.1 * stemThickness, 20.6),
    new THREE.Vector2(4.25 * stemThickness, 15.5),
    new THREE.Vector2(5 * stemThickness, 9.5),
    new THREE.Vector2(5.8 * stemThickness, 5.4),
    new THREE.Vector2(6.1 * stemThickness, 3.2),
    new THREE.Vector2(0, 3.2),
  ];
  const stem = mesh(closedLatheGeometry(stemProfile, options.faceted ? 10 : 24), options.accentColor, options.faceted);
  stem.name = "faceted_mushroom_stem";
  stemSculpture.add(stem);
  const collar = mesh(new THREE.TorusGeometry(4.25 * stemThickness, 0.72, 6, 12), options.accentColor, options.faceted);
  collar.name = "stem_socket_shoulder";
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 19.6;
  stemSculpture.add(collar);
  const stemKey = mesh(new THREE.CylinderGeometry(2.92, 3.16, 4, 10), options.accentColor, options.faceted);
  stemKey.name = "tapered_press_fit_key";
  stemKey.position.y = 22.35;
  stemSculpture.add(stemKey);
  stemGroup.add(stemSculpture);

  const capGroup = new THREE.Group();
  capGroup.name = "mushroom_cap";
  capGroup.userData.topperArtworkRoot = true;
  capGroup.position.y = topY;
  capGroup.scale.set(sx, sy, sx);
  const capProfile = [
    new THREE.Vector2(0, 20.25 + (28 - 20.25) * capDome),
    new THREE.Vector2(5.4 * capDiameter, 20.25 + (27.5 - 20.25) * capDome),
    new THREE.Vector2(10.4 * capDiameter, 20.25 + (25.3 - 20.25) * capDome),
    new THREE.Vector2(13.8 * capDiameter, 20.25 + (21.8 - 20.25) * capDome),
    new THREE.Vector2(12.7 * capDiameter, 20.25),
    new THREE.Vector2(4.35, 19.75),
    new THREE.Vector2(3.38, 20.5),
    new THREE.Vector2(3.38, 24.15),
    new THREE.Vector2(0, 24.15),
  ];
  const cap = mesh(closedLatheGeometry(capProfile, options.faceted ? 12 : 28), options.primaryColor, options.faceted);
  cap.name = "mushroom_cap_with_socket";
  capGroup.add(cap);

  const gillColor = detailColor(options.primaryColor, 0.1);
  for (let index = 0; index < gillCount; index += 1) {
    const angle = index * Math.PI * 2 / gillCount;
    const gill = mesh(new THREE.BoxGeometry(7.9 * capDiameter, 0.58, 0.66), gillColor, options.faceted);
    gill.name = `fused_gill_${index + 1}`;
    gill.position.set(Math.cos(angle) * 7.9 * capDiameter, 20.18, -Math.sin(angle) * 7.9 * capDiameter);
    gill.rotation.y = angle;
    capGroup.add(gill);
  }

  return { stemGroup, capGroup };
}

function markColorRole(object: THREE.Object3D, role: "primary" | "secondary" | "detail" | "adapter") {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.userData.aiColorRole = role;
  });
}

export function createModel(options: ModelOptions): ModelBuild {
  const integrated = options.connectionMode === "integrated";
  const assembly = new THREE.Group();
  assembly.name = options.externalMesh ? "tripo_mesh_assembly" : options.aiProgram ? "ai_custom_assembly" : `${options.modelId}_assembly`;
  const printableRoot = integrated ? new THREE.Group() : assembly;
  if (integrated) {
    printableRoot.name = `${options.modelId}_integrated_print`;
    assembly.add(printableRoot);
  }
  // One-piece artwork may cover most of the adapter face. Omitting the logo
  // recess there prevents its cutter from carving loose islands where a wide
  // topper and the adapter overlap at their shared seating plane. Detachable
  // adapters keep the visible engraving.
  const adapter = buildAdapter(options, !integrated);
  printableRoot.add(adapter);
  const parts: PrintablePart[] = integrated ? [] : [
    { id: "adapter", label: "Universal adapter · Ø41 face down", object: adapter, color: options.accentColor, printFlipZ: true },
  ];

  if (options.externalMesh) {
    const topper = buildExternalMeshTopper(options, options.externalMesh);
    if (integrated) {
      printableRoot.add(buildIntegratedBaseJoint(options), topper);
    } else {
      const pinGroup = buildConnectorPin(options, "tripo_mesh_double_ended_connector_pin");
      printableRoot.add(pinGroup, topper);
      const directSocket = topper.userData.externalMeshMountMode === "direct-socket";
      parts.push(
        { id: "connector-pin", label: "Double-ended connector pin", object: pinGroup, color: options.primaryColor },
        {
          id: "topper",
          label: directSocket ? "Direct socketed Tripo mesh" : "Reinforced socketed Tripo mesh",
          object: topper,
          color: options.primaryColor,
        },
      );
    }
  } else if (options.aiProgram) {
    const topper = buildAiSculpture(options, options.aiProgram);
    if (integrated) {
      printableRoot.add(buildIntegratedBaseJoint(options), topper);
    } else {
      const pinGroup = buildConnectorPin(options, "ai_custom_double_ended_connector_pin");
      printableRoot.add(pinGroup, topper);
      parts.push(
        { id: "connector-pin", label: "Double-ended connector pin", object: pinGroup, color: options.primaryColor },
        {
          id: "topper",
          label: "Flush socketed AI sculpture",
          object: topper,
          color: options.primaryColor,
          palette: [options.primaryColor, options.secondaryColor ?? "#d8a33e", options.detailColor ?? "#f4eee2"],
        },
      );
    }
  } else if (options.modelId === "mushroom") {
    const { stemGroup, capGroup } = buildMushroom(options);
    constrainTopperArtwork(stemGroup, options);
    if (integrated) {
      const widthScale = options.topperWidth / 32;
      const heightScale = options.topperHeight / 34;
      const topY = ADAPTER_STANDARD.totalHeight - 0.05;
      markColorRole(stemGroup, "adapter");
      printableRoot.add(
        buildIntegratedBaseJoint(options),
        stemGroup,
        capGroup,
        buildIntegratedJoint(
          "integrated_hidden_mushroom_cap_joint",
          topY + 18.8 * heightScale,
          topY + 24.45 * heightScale,
          3.55 * widthScale,
          options.accentColor,
          "adapter",
        ),
      );
    } else {
      const pinGroup = buildConnectorPin(options, "mushroom_double_ended_connector_pin");
      printableRoot.add(pinGroup, stemGroup, capGroup);
      parts.push(
        { id: "connector-pin", label: "Double-ended connector pin", object: pinGroup, color: options.primaryColor },
        { id: "stem", label: "Flush socketed mushroom stem", object: stemGroup, color: options.accentColor },
        { id: "cap", label: "Mushroom cap", object: capGroup, color: options.primaryColor },
      );
    }
  } else if (options.modelId === "clover") {
    const { pinGroup, trunkGroup, crownGroup } = buildCloverKit(options);
    trunkGroup.userData.topperArtworkRoot = true;
    crownGroup.userData.topperArtworkRoot = true;
    if (integrated) {
      const stemTop = 16.8 * (options.topperHeight / 33);
      const crownBase = ADAPTER_STANDARD.totalHeight + stemTop;
      printableRoot.add(
        buildIntegratedBaseJoint(options),
        trunkGroup,
        crownGroup,
        buildIntegratedJoint(
          "integrated_hidden_clover_crown_joint",
          crownBase - 0.65,
          crownBase + KIT_CROWN_SOCKET_DEPTH + 0.55,
          KIT_CROWN_SOCKET_RADIUS + 0.25,
          options.primaryColor,
        ),
      );
    } else {
      if (!pinGroup) throw new Error("Detachable clover connector is unavailable");
      printableRoot.add(pinGroup, trunkGroup, crownGroup);
      parts.push(
        { id: "connector-pin", label: "Double-ended connector pin", object: pinGroup, color: options.primaryColor },
        { id: "trunk", label: "Flat-bottom clover trunk", object: trunkGroup, color: options.primaryColor },
        { id: "crown", label: "Rounded clover crown", object: crownGroup, color: options.primaryColor },
      );
    }
  } else {
    const builders: Partial<Record<ModelId, (value: ModelOptions) => THREE.Group>> = {
      sprout: buildSprout,
      pine: buildPine,
      cactus: buildCactus,
      pumpkin: buildPumpkin,
      acorn: buildAcorn,
      bonsai: buildBonsai,
      strawberry: buildStrawberry,
      lotus: buildLotus,
      aloe: buildAloe,
      snakeplant: buildSnakePlant,
      eggplant: buildEggplant,
      grapes: buildGrapes,
      sunflower: buildSunflower,
      snail: buildSnail,
      frog: buildFrog,
      hedgehog: buildHedgehog,
      tomato: buildTomato,
      carrot: buildCarrot,
      chili: buildChili,
      basil: buildBasil,
      rosemary: buildRosemary,
      parsley: buildParsley,
      daisy: buildDaisy,
      rose: buildRose,
      lemon: buildLemon,
      bamboo: buildBamboo,
      santa: buildSanta,
      "christmas-tree": buildChristmasTree,
      snowman: buildSnowman,
      reindeer: buildReindeer,
      "gift-box": buildGiftBox,
      "candy-cane": buildCandyCane,
      "christmas-bell": buildChristmasBell,
    };
    const builder = builders[options.modelId] ?? buildSprout;
    const topper = constrainTopperArtwork(builder(options), options);
    if (integrated) {
      printableRoot.add(buildIntegratedBaseJoint(options), topper);
    } else {
      const pinGroup = buildConnectorPin(options);
      printableRoot.add(pinGroup, topper);
      parts.push(
        { id: "connector-pin", label: "Double-ended connector pin", object: pinGroup, color: options.primaryColor },
        { id: "topper", label: `Flush socketed ${options.modelId} body`, object: topper, color: options.primaryColor },
      );
    }
  }

  if (integrated) {
    parts.push({
      id: "integrated",
      label: "One-piece adapter and topper",
      object: printableRoot,
      color: options.primaryColor,
      palette: [
        options.primaryColor,
        options.secondaryColor ?? "#d8a33e",
        options.detailColor ?? "#f4eee2",
        options.accentColor,
      ],
    });
  }

  assembly.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  assembly.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(assembly);
  const size = bounds.getSize(new THREE.Vector3());
  const artworkBounds = new THREE.Box3();
  assembly.traverse((child) => {
    if (child.userData.topperArtworkRoot === true) artworkBounds.expandByObject(child);
  });
  const artworkSize = artworkBounds.isEmpty()
    ? new THREE.Vector3(options.topperWidth, options.topperHeight, options.topperWidth)
    : artworkBounds.getSize(new THREE.Vector3());
  return {
    assembly,
    parts,
    measurements: {
      width: Number(Math.max(size.x, size.z).toFixed(1)),
      height: Number(size.y.toFixed(1)),
      topperWidth: Number(Math.max(artworkSize.x, artworkSize.z).toFixed(1)),
      topperHeight: Number(artworkSize.y.toFixed(1)),
      lowerDiameter: ADAPTER_STANDARD.lowerDiameter,
      upperDiameter: ADAPTER_STANDARD.upperDiameter,
    },
  };
}

export function cloneForPrint(object: THREE.Object3D) {
  const clone = object.clone(true);
  clone.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(clone);
  clone.position.y -= bounds.min.y;
  clone.updateMatrixWorld(true);
  return clone;
}

export function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((entry) => entry.dispose());
  });
}
