type AiRateEntry = {
  count: number;
  windowStartedAt: number;
};

type AiRateLimitState = {
  activeRequests: number;
  clients: Map<string, AiRateEntry>;
};

type AiRateLimitConfig = {
  maxConcurrency: number;
  maxRequests: number;
  windowMs: number;
};

type AiAdmission =
  | {
      allowed: true;
      release: () => void;
    }
  | {
      allowed: false;
      reason: "busy" | "rate-limit";
      retryAfterSeconds: number;
    };

const DEFAULT_MAX_CONCURRENCY = 2;
const DEFAULT_MAX_REQUESTS = 5;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 5_000;

declare global {
  var __letpotAiRateLimitState: AiRateLimitState | undefined;
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) return fallback;
  return parsed;
}

function getConfig(): AiRateLimitConfig {
  return {
    maxConcurrency: boundedInteger(process.env.AI_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY, 1, 10),
    maxRequests: boundedInteger(process.env.AI_RATE_LIMIT_MAX, DEFAULT_MAX_REQUESTS, 1, 100),
    windowMs: boundedInteger(process.env.AI_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS, 10_000, 24 * 60 * 60 * 1000),
  };
}

function getState() {
  globalThis.__letpotAiRateLimitState ??= {
    activeRequests: 0,
    clients: new Map(),
  };
  return globalThis.__letpotAiRateLimitState;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  // Caddy appends the direct peer to X-Forwarded-For. Using the right-most
  // value prevents a public client from rotating a user-supplied first value.
  const directPeer = forwardedFor?.at(-1) || request.headers.get("x-real-ip")?.trim();
  return directPeer?.slice(0, 128) || "unknown-client";
}

function pruneExpiredClients(state: AiRateLimitState, now: number, windowMs: number) {
  for (const [client, entry] of state.clients) {
    if (now - entry.windowStartedAt >= windowMs) state.clients.delete(client);
  }
  while (state.clients.size >= MAX_TRACKED_CLIENTS) {
    const oldestClient = state.clients.keys().next().value as string | undefined;
    if (!oldestClient) break;
    state.clients.delete(oldestClient);
  }
}

export function acquireAiRequest(request: Request, now = Date.now()): AiAdmission {
  const config = getConfig();
  const state = getState();
  pruneExpiredClients(state, now, config.windowMs);

  if (state.activeRequests >= config.maxConcurrency) {
    return { allowed: false, reason: "busy", retryAfterSeconds: 5 };
  }

  const client = getClientKey(request);
  const existing = state.clients.get(client);
  if (existing && now - existing.windowStartedAt < config.windowMs && existing.count >= config.maxRequests) {
    return {
      allowed: false,
      reason: "rate-limit",
      retryAfterSeconds: Math.max(1, Math.ceil((config.windowMs - (now - existing.windowStartedAt)) / 1000)),
    };
  }

  if (!existing || now - existing.windowStartedAt >= config.windowMs) {
    state.clients.set(client, { count: 1, windowStartedAt: now });
  } else {
    existing.count += 1;
    // Refresh insertion order so bounded cleanup removes least-recently-used clients first.
    state.clients.delete(client);
    state.clients.set(client, existing);
  }
  state.activeRequests += 1;

  let released = false;
  return {
    allowed: true,
    release() {
      if (released) return;
      released = true;
      state.activeRequests = Math.max(0, state.activeRequests - 1);
    },
  };
}

export function resetAiRateLimitState() {
  delete globalThis.__letpotAiRateLimitState;
}
