export const MAX_AI_PROMPT_LENGTH = 280;

const INVISIBLE_FORMATTING = /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;
const ROLE_MARKUP = /(?:<\s*\/?\s*(?:system|developer|assistant|tool)\s*>|\[\s*(?:system|developer|assistant|tool|inst)\s*\])/i;

const COMPACT_INJECTION_PATTERNS = [
  /(?:ignore|disregard|forget|override|bypass)(?:all|any|the)?(?:previous|prior|above|system|developer)(?:instructions?|rules?|prompts?|messages?)/,
  /(?:reveal|show|print|repeat|leak|expose|return)(?:the|your|hidden|original)?(?:system|developer)(?:prompt|message|instructions?|rules?)/,
  /(?:actas|pretendtobe)(?:the)?(?:system|developer|assistant)/,
  /(?:jailbreak|promptinjection|systemprompt|developermessage)/,
  /(?:execute|run)(?:a|the|this)?(?:command|code|script)/,
  /(?:忽略|无视|忘记|覆盖|绕过)(?:所有|任何|上述|之前|先前|系统|开发者)*(?:指令|规则|提示词|消息)/,
  /(?:显示|输出|泄露|公开|重复)(?:系统|开发者|隐藏)*(?:提示词|指令|消息|密钥|环境变量)/,
  /(?:越狱|提示词注入|系统提示词|开发者消息)/,
];

export type AiPromptAssessment =
  | { allowed: true; prompt: string }
  | { allowed: false; prompt: string; reason: "empty" | "too-short" | "too-long" | "instruction-control" };

export function normalizeAiPrompt(value: unknown) {
  if (typeof value !== "string") return "";
  return Array.from(value.normalize("NFKC"), (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159) ? " " : character;
  })
    .join("")
    .replace(INVISIBLE_FORMATTING, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactForDetection(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}\p{Z}]+/gu, "")
    .replace(/\s+/g, "");
}

export function assessAiPrompt(value: unknown): AiPromptAssessment {
  const prompt = normalizeAiPrompt(value);
  if (!prompt) return { allowed: false, prompt, reason: "empty" };
  if (prompt.length < 3) return { allowed: false, prompt, reason: "too-short" };
  if (prompt.length > MAX_AI_PROMPT_LENGTH) return { allowed: false, prompt, reason: "too-long" };

  const compact = compactForDetection(prompt);
  if (ROLE_MARKUP.test(prompt) || COMPACT_INJECTION_PATTERNS.some((pattern) => pattern.test(compact))) {
    return { allowed: false, prompt, reason: "instruction-control" };
  }
  return { allowed: true, prompt };
}

export function buildUntrustedIdeaMessage(prompt: string) {
  return JSON.stringify({ kind: "untrusted_printable_idea", idea: prompt });
}
