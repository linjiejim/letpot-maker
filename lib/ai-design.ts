import {
  getDefaultShapeParameters,
  MODEL_LIBRARY,
  type ModelId,
  type ShapeParameterKey,
} from "./model-factory";

export const AI_TEMPLATE_IDS = [
  "sprout",
  "pine",
  "cactus",
  "mushroom",
  "tomato",
  "bamboo",
] as const satisfies readonly ModelId[];

export type AiTemplateId = typeof AI_TEMPLATE_IDS[number];

export interface AiDesignRecipe {
  name: string;
  subtitle: string;
  templateId: AiTemplateId;
  topperHeight: number;
  topperWidth: number;
  primaryColor: string;
  accentColor: string;
  faceted: boolean;
  shape: Partial<Record<ShapeParameterKey, number>>;
  creativeNote: string;
}

const TEMPLATE_SET = new Set<string>(AI_TEMPLATE_IDS);
const TEMPLATE_ALIASES: Record<string, AiTemplateId> = {
  "little-sprout": "sprout",
  "alpine-pine": "pine",
  "round-cactus": "cactus",
  "forest-cap": "mushroom",
  "tomato-vine": "tomato",
  "bamboo-stalks": "bamboo",
};
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stepPrecision(step: number) {
  const text = String(step);
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
}

function snap(value: number, min: number, max: number, step: number) {
  const clamped = clamp(value, min, max);
  const stepped = min + Math.round((clamped - min) / step) * step;
  return Number(stepped.toFixed(stepPrecision(step)));
}

function shortText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= maxLength) return clean;
  const candidate = clean.slice(0, maxLength - 1);
  const wordBreak = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, wordBreak > maxLength * 0.6 ? wordBreak : candidate.length).trim()}…`;
}

function color(value: unknown, fallback: string) {
  return typeof value === "string" && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

export function normalizeAiRecipe(value: unknown): AiDesignRecipe {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The AI provider did not return a model recipe");
  }
  const input = value as Record<string, unknown>;
  const rawTemplateId = typeof input.templateId === "string"
    ? input.templateId.trim().toLowerCase().replace(/[\s_]+/g, "-")
    : "";
  const templateId = TEMPLATE_SET.has(rawTemplateId)
    ? rawTemplateId as AiTemplateId
    : TEMPLATE_ALIASES[rawTemplateId] ?? null;
  if (!templateId) {
    const safeDiagnostic = rawTemplateId.replace(/[^a-z0-9-]/g, "").slice(0, 48) || "empty";
    throw new Error(`The AI provider selected an unsupported model family (${safeDiagnostic})`);
  }

  const definition = MODEL_LIBRARY.find((item) => item.id === templateId);
  if (!definition) throw new Error("The selected model family is unavailable");
  const rawShape = input.shape && typeof input.shape === "object" && !Array.isArray(input.shape)
    ? input.shape as Record<string, unknown>
    : {};
  const shape = getDefaultShapeParameters(definition);
  for (const parameter of definition.parameters ?? []) {
    shape[parameter.key] = snap(
      finiteNumber(rawShape[parameter.key], parameter.defaultValue),
      parameter.min,
      parameter.max,
      parameter.step,
    );
  }

  return {
    name: shortText(input.name, `AI ${definition.name}`, 34),
    subtitle: shortText(input.subtitle, definition.subtitle, 68),
    templateId,
    topperHeight: snap(finiteNumber(input.topperHeight, definition.defaults.topperHeight), 25, 50, 0.5),
    topperWidth: snap(finiteNumber(input.topperWidth, definition.defaults.topperWidth), 20, 40, 0.5),
    primaryColor: color(input.primaryColor, definition.defaults.primaryColor),
    accentColor: color(input.accentColor, definition.defaults.accentColor),
    faceted: typeof input.faceted === "boolean" ? input.faceted : definition.style === "lowpoly",
    shape,
    creativeNote: shortText(input.creativeNote, "A print-safe custom variation.", 140),
  };
}

export function getAiTemplateCatalog() {
  return AI_TEMPLATE_IDS.map((id) => {
    const definition = MODEL_LIBRARY.find((item) => item.id === id);
    if (!definition) throw new Error(`Missing AI template ${id}`);
    return {
      templateId: id,
      family: definition.name,
      character: definition.subtitle,
      parameters: (definition.parameters ?? []).map(({ key, label, min, max, step, unit }) => ({
        key,
        label,
        min,
        max,
        step,
        unit: unit ?? "",
      })),
    };
  });
}
