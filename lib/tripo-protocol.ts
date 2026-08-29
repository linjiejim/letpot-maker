import { ModelVersion } from "@vastai/tripo-sdk";

export const TRIPO_BASE_URLS = {
  global: "https://openapi.tripo3d.ai/v3",
  china: "https://openapi.tripo3d.com/v3",
} as const;

export type TripoRegion = keyof typeof TRIPO_BASE_URLS;

export const TRIPO_REGION_OPTIONS = [
  { id: "global", label: "Global · tripo3d.ai" },
  { id: "china", label: "China · tripo3d.com" },
] as const satisfies ReadonlyArray<{ id: TripoRegion; label: string }>;

export const TRIPO_MODEL_OPTIONS = [
  { id: ModelVersion.H3_1, label: "Tripo v3.1 · 10 credits", meshCredits: 10 },
  { id: ModelVersion.P1, label: "Tripo P1 · 30 credits", meshCredits: 30 },
] as const;

export type TripoModelVersion = typeof TRIPO_MODEL_OPTIONS[number]["id"];

const PRINTABLE_PROMPT_SUFFIX = [
  "Design this as a compact FDM-printable hydroponic pod topper.",
  "Use one connected watertight solid with no floating pieces, no text, and no thin fragile details.",
  "The subject's own body must reach a broad centered bottom contact; do not add a stand, pedestal, platform, plinth, base disk, floor, ground plane, tray, or support plate.",
  "Keep the object upright and centered; the mounting socket and adapter will be added separately.",
].join(" ");

function cleanText(value: string, maxLength: number) {
  return value.replace(/[^\x20-\x7e\u00c0-\uffff]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function buildTripoPrompt(prompt: string) {
  const clean = cleanText(prompt, 640);
  if (clean.length < 3) throw new Error("Describe the mesh with at least three characters.");
  return `${clean}. ${PRINTABLE_PROMPT_SUFFIX}`.slice(0, 1024);
}

export function validateTripoApiKey(apiKey: string) {
  const clean = apiKey.trim();
  if (!/^tsk_[A-Za-z0-9_-]{8,}$/.test(clean)) {
    throw new Error("Enter a valid Tripo API key beginning with tsk_.");
  }
  return clean;
}

export function validateTripoModelVersion(modelVersion: string): TripoModelVersion {
  const match = TRIPO_MODEL_OPTIONS.find(({ id }) => id === modelVersion);
  if (!match) throw new Error("Choose a supported Tripo model version.");
  return match.id;
}

export function validateTripoRegion(region: string): TripoRegion {
  if (region !== "global" && region !== "china") throw new Error("Choose a supported Tripo API region.");
  return region;
}
