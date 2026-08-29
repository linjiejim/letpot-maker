import { ModelVersion, type ImageToModelParams, type TextToModelParams } from "@vastai/tripo-sdk";
import { buildTripoPrompt } from "./tripo-protocol";

export const TRIPO_CANDIDATE_FACE_LIMIT = 10_000;
export const TRIPO_CANDIDATE_CREDITS = 10;
export const TRIPO_IMAGE_CANDIDATE_CREDITS = 20;

export interface TripoCandidateSpec {
  id: string;
  name: string;
  prompt: string;
  negativePrompt: string;
  modelSeed: number;
  topperWidth: number;
  topperHeight: number;
  color: string;
}

export interface TripoCandidateInspection {
  meshCount: number;
  faceCount: number;
  mountMode: "direct-socket" | "reinforced-transition" | "unknown";
  manifoldValid: boolean;
  manifoldError?: string;
  width: number;
  height: number;
  topperWidth: number;
  topperHeight: number;
}

export interface TripoCandidateManifestEntry extends TripoCandidateSpec {
  taskId: string;
  modelVersion: string;
  expectedCredits: number;
  creditsConsumed?: number;
  createdAt: string;
  glb: string;
  preview?: string;
  byteLength: number;
  generationMode?: "text-to-3d" | "image-to-3d";
  inputImage?: string;
  requestedFaceLimit?: number;
  inspection: TripoCandidateInspection;
}

function cleanNegativePrompt(value: string) {
  return value.replace(/[^\x20-\x7e\u00c0-\uffff]/g, " ").replace(/\s+/g, " ").trim().slice(0, 255);
}

export function validateTripoCandidateSpec(spec: TripoCandidateSpec) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.id)) throw new Error("Candidate id must be a lowercase slug.");
  if (!spec.name.trim()) throw new Error("Candidate name is required.");
  if (!Number.isInteger(spec.modelSeed) || spec.modelSeed < 0) throw new Error("Candidate model seed must be a non-negative integer.");
  if (spec.topperWidth < 20 || spec.topperWidth > 80) throw new Error("Candidate topper width must be between 20 and 80 mm.");
  if (spec.topperHeight < 25 || spec.topperHeight > 100) throw new Error("Candidate topper height must be between 25 and 100 mm.");
  if (!/^#[0-9a-f]{6}$/i.test(spec.color)) throw new Error("Candidate color must be a six-digit hex value.");
  return { ...spec, name: spec.name.trim(), negativePrompt: cleanNegativePrompt(spec.negativePrompt) };
}

export function buildTripoCandidateRequest(spec: TripoCandidateSpec): TextToModelParams {
  const valid = validateTripoCandidateSpec(spec);
  return {
    prompt: buildTripoPrompt(valid.prompt),
    negative_prompt: valid.negativePrompt,
    model: ModelVersion.H3_1,
    model_seed: valid.modelSeed,
    face_limit: TRIPO_CANDIDATE_FACE_LIMIT,
    texture: false,
    pbr: false,
    export_uv: false,
    quad: false,
    smart_low_poly: false,
    generate_parts: false,
    geometry_quality: "standard",
  };
}

export function buildTripoImageCandidateRequest(
  fileToken: string,
  modelSeed: number,
  faceLimit = TRIPO_CANDIDATE_FACE_LIMIT,
): ImageToModelParams {
  if (!/^file_[a-z0-9_-]+$/i.test(fileToken)) throw new Error("A Tripo file token is required for image-to-3D.");
  if (!Number.isInteger(modelSeed) || modelSeed < 0) throw new Error("Candidate model seed must be a non-negative integer.");
  if (!Number.isInteger(faceLimit) || faceLimit < 1_000 || faceLimit > 1_500_000) {
    throw new Error("H3.1 standard image candidate face limit must be between 1,000 and 1,500,000.");
  }
  return {
    file_token: fileToken,
    model: ModelVersion.H3_1,
    enable_image_autofix: false,
    model_seed: modelSeed,
    face_limit: faceLimit,
    texture: false,
    pbr: false,
    export_uv: false,
    quad: false,
    smart_low_poly: false,
    generate_parts: false,
    geometry_quality: "standard",
  };
}

export const CHRISTMAS_TRIPO_CANDIDATES: readonly TripoCandidateSpec[] = [
  {
    id: "santa",
    name: "Minimal Santa",
    prompt: "A minimalist compact friendly Santa Claus figurine consisting only of the character. Use one smooth rounded egg-shaped body that widens all the way to the bottom, a short soft hat deeply fused to the head, a large smooth beard deeply fused into the torso, and a moustache and smiling face made from broad shallow relief. The character's rounded torso itself touches the ground across a broad centered area. No arms and no props.",
    negativePrompt: "stand, base, disk, platform, pedestal, plinth, floor, ground, tray, arms, hands, gift, sack, legs, separate accessories, floating pompom, thin beard strands, hair strands, hollow shell, text, texture, color pattern",
    modelSeed: 25_120_001,
    topperWidth: 35,
    topperHeight: 45,
    color: "#b92f34",
  },
  {
    id: "snowman",
    name: "Minimal Snowman",
    prompt: "A minimalist stout friendly snowman figurine consisting only of the character. Use exactly two smooth large snowballs with deep overlap; flatten only the underside of the lower snowball so the character itself has a broad ground contact. Fuse a soft winter cap into the head and a short thick scarf flat into the body. Make the eyes, smile and exactly two buttons shallow recessed details. No arms, ground snow or projecting carrot nose.",
    negativePrompt: "stand, base, disk, platform, pedestal, plinth, floor, ground snow, snowflakes, tray, stick arms, hands, broom, carrot projection, separate scarf tail, thin fabric, three snowballs, floating parts, hollow shell, text, texture, color pattern",
    modelSeed: 25_120_002,
    topperWidth: 34,
    topperHeight: 46,
    color: "#eef3ed",
  },
  {
    id: "christmas-tree",
    name: "Minimal Christmas Tree",
    prompt: "A minimalist compact Christmas tree figurine consisting only of the tree. Build it as one fully filled solid tapered cone with exactly three smooth thick rounded overlapping foliage tiers. Put one small star as shallow recessed relief on the front of the top tier, never protruding beyond the tree silhouette. The lowest foliage tier is a completely solid filled dome that reaches the center axis and extends to a broad flat bottom. No trunk, underside cavity, center hole or ornaments.",
    negativePrompt: "stand, base, disk, platform, pedestal, plinth, floor, ground, tray, hollow underside, cavity, center hole, separate star, ornaments, baubles, lights, garland, thin branches, needles, visible trunk, floating parts, hollow shell, text, texture, color pattern",
    modelSeed: 25_120_003,
    topperWidth: 36,
    topperHeight: 48,
    color: "#315b3e",
  },
  {
    id: "reindeer",
    name: "Minimal Reindeer",
    prompt: "A minimalist compact seated friendly reindeer figurine consisting only of the character. Use one pear-shaped rounded body that widens to the bottom, a large rounded head deeply joined to the torso, and short feet fused flat into the body. Use two simple thick antler nubs, each with only one rounded branch and deeply fused into the head silhouette. Make the eyes, nose and smile broad shallow relief. The seated body itself touches the ground broadly. No accessories.",
    negativePrompt: "stand, base, disk, platform, pedestal, plinth, floor, ground, tray, thin antlers, many branching antler tips, standing legs, separate limbs, collar, bell, scarf, sleigh, floating parts, hollow shell, text, texture, color pattern",
    modelSeed: 25_120_004,
    topperWidth: 36,
    topperHeight: 45,
    color: "#8b6547",
  },
] as const;
