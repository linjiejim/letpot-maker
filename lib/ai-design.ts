import {
  getDefaultShapeParameters,
  MODEL_LIBRARY,
  type ModelId,
  type ShapeParameterKey,
} from "./model-factory";
import {
  normalizeAiShapeProgram,
  type AiShapeProgram,
} from "./ai-shape-program";

export const AI_TEMPLATE_IDS: readonly ModelId[] = MODEL_LIBRARY.map((definition) => definition.id);

export type AiTemplateId = ModelId;
export type AiDesignMode = "library" | "sculpture";

export interface AiDesignRecipe {
  mode: AiDesignMode;
  name: string;
  subtitle: string;
  templateId: AiTemplateId;
  topperHeight: number;
  topperWidth: number;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  detailColor: string;
  faceted: boolean;
  shape: Partial<Record<ShapeParameterKey, number>>;
  program?: AiShapeProgram;
  creativeNote: string;
}

const TEMPLATE_SET = new Set<string>(AI_TEMPLATE_IDS);
const LEGACY_PARAMETRIC_IDS = new Set<ModelId>(["sprout", "pine", "cactus", "mushroom", "tomato", "bamboo"]);
const LEGACY_TEMPLATE_ALIASES: Record<string, AiTemplateId> = {
  "little-sprout": "sprout",
  "alpine-pine": "pine",
  "round-cactus": "cactus",
  "forest-cap": "mushroom",
  "tomato-vine": "tomato",
  "bamboo-stalks": "bamboo",
};
const TEMPLATE_ALIASES = Object.fromEntries([
  ...Object.entries(LEGACY_TEMPLATE_ALIASES),
  ...MODEL_LIBRARY.map((definition) => [
    definition.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    definition.id,
  ] as const),
]) as Record<string, AiTemplateId>;
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
  const mode: AiDesignMode = input.mode === "sculpture" || input.program ? "sculpture" : "library";
  const rawTemplateId = typeof input.templateId === "string"
    ? input.templateId.trim().toLowerCase().replace(/[\s_]+/g, "-")
    : "";
  const templateId = TEMPLATE_SET.has(rawTemplateId)
    ? rawTemplateId as AiTemplateId
    : TEMPLATE_ALIASES[rawTemplateId] ?? (input.program ? "sprout" : null);
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

  const program = mode === "sculpture" ? normalizeAiShapeProgram(input.program) : undefined;
  const libraryHeightRange: [number, number] = LEGACY_PARAMETRIC_IDS.has(templateId)
    ? [25, 50]
    : [definition.defaults.topperHeight, definition.defaults.topperHeight];
  const libraryWidthRange: [number, number] = LEGACY_PARAMETRIC_IDS.has(templateId)
    ? [20, 40]
    : [definition.defaults.topperWidth, definition.defaults.topperWidth];
  const heightRange = mode === "sculpture" ? [25, 50] as const : libraryHeightRange;
  const widthRange = mode === "sculpture" ? [20, 40] as const : libraryWidthRange;

  return {
    mode,
    name: shortText(input.name, `AI ${definition.name}`, 34),
    subtitle: shortText(input.subtitle, definition.subtitle, 68),
    templateId,
    topperHeight: snap(finiteNumber(input.topperHeight, definition.defaults.topperHeight), heightRange[0], heightRange[1], 0.5),
    topperWidth: snap(finiteNumber(input.topperWidth, definition.defaults.topperWidth), widthRange[0], widthRange[1], 0.5),
    primaryColor: color(input.primaryColor, definition.defaults.primaryColor),
    accentColor: color(input.accentColor, definition.defaults.accentColor),
    secondaryColor: color(input.secondaryColor, "#d8a33e"),
    detailColor: color(input.detailColor, "#f4eee2"),
    faceted: typeof input.faceted === "boolean" ? input.faceted : definition.style === "lowpoly",
    shape,
    program,
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
