import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { TripoClient, type Task } from "@vastai/tripo-sdk";
import {
  buildTripoPrompt,
  TRIPO_BASE_URLS,
  validateTripoApiKey,
  validateTripoModelVersion,
  validateTripoRegion,
} from "../lib/tripo-protocol";

const HOST = "127.0.0.1";
const parsedPort = Number(process.env.TRIPO_BRIDGE_PORT ?? 4318);
const PORT = Number.isInteger(parsedPort) && parsedPort >= 1024 && parsedPort <= 65_535 ? parsedPort : 4318;
const MAX_BODY_BYTES = 16 * 1024;
const MAX_MODEL_BYTES = 40 * 1024 * 1024;
const EXTRA_ORIGINS = new Set(
  (process.env.TRIPO_BRIDGE_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

type BridgePayload = {
  apiKey?: unknown;
  prompt?: unknown;
  modelVersion?: unknown;
  region?: unknown;
  taskId?: unknown;
};

function allowedOrigin(origin: string | undefined) {
  if (!origin) return false;
  if (EXTRA_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function applyCors(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;
  if (!allowedOrigin(origin)) return false;
  response.setHeader("Access-Control-Allow-Origin", origin!);
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Private-Network", "true");
  response.setHeader("Vary", "Origin");
  return true;
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

async function readPayload(request: IncomingMessage): Promise<BridgePayload> {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.byteLength;
    if (received > MAX_BODY_BYTES) throw new Error("The local bridge request is too large.");
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The local bridge request is invalid.");
  return parsed as BridgePayload;
}

function clientFor(payload: BridgePayload) {
  const apiKey = validateTripoApiKey(typeof payload.apiKey === "string" ? payload.apiKey : "");
  const region = validateTripoRegion(typeof payload.region === "string" ? payload.region : "global");
  return new TripoClient({
    apiKey,
    baseUrl: TRIPO_BASE_URLS[region],
    retries: 1,
    timeoutMs: 60_000,
  });
}

function taskIdFrom(payload: BridgePayload) {
  const taskId = typeof payload.taskId === "string" ? payload.taskId.trim() : "";
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(taskId)) throw new Error("The Tripo task identifier is invalid.");
  return taskId;
}

function publicTask(task: Task) {
  return {
    taskId: task.task_id,
    status: task.status,
    progress: Math.max(0, Math.min(100, Number(task.progress) || 0)),
    error: task.error_msg ? String(task.error_msg).slice(0, 240) : undefined,
  };
}

function safeError(error: unknown) {
  const candidate = error instanceof Error ? error : new Error("Unknown local bridge error");
  const status = "status" in candidate && typeof candidate.status === "number" ? candidate.status : undefined;
  if (status === 401 || /401|unauthor|authentication|api key/i.test(candidate.message)) {
    return { status: 401, error: "Tripo rejected this API key for the selected region." };
  }
  if (status === 402 || /402|balance|credit|payment/i.test(candidate.message)) {
    return { status: 402, error: "The Tripo account does not have enough API credits." };
  }
  if (status === 429 || /429|rate|limit/i.test(candidate.message)) {
    return { status: 429, error: "Tripo is rate-limiting this key. Wait briefly and try again." };
  }
  if (/valid|supported|invalid|too large/i.test(candidate.message)) {
    return { status: 400, error: candidate.message.slice(0, 240) };
  }
  if (/network|fetch|timeout|aborted|ECONN|ENOTFOUND|EAI_AGAIN/i.test(candidate.message)) {
    return { status: 502, error: "The local bridge could not reach Tripo. Check this device's network or proxy." };
  }
  return { status: 502, error: "Tripo could not complete this local bridge request." };
}

const server = createServer(async (request, response) => {
  const hasCors = applyCors(request, response);
  if (request.method === "OPTIONS") {
    response.writeHead(hasCors ? 204 : 403, { "Cache-Control": "no-store" });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true, storage: "none", upstream: "Tripo only" });
    return;
  }

  if (!hasCors) {
    sendJson(response, 403, { error: "This browser origin is not allowed by the local bridge." });
    return;
  }
  if (request.method !== "POST") {
    sendJson(response, 404, { error: "Local bridge route not found." });
    return;
  }

  try {
    const payload = await readPayload(request);
    const client = clientFor(payload);

    if (request.url === "/v1/tasks") {
      const prompt = buildTripoPrompt(typeof payload.prompt === "string" ? payload.prompt : "");
      const modelVersion = validateTripoModelVersion(typeof payload.modelVersion === "string" ? payload.modelVersion : "");
      const taskId = await client.textToModel({
        prompt,
        model: modelVersion,
        face_limit: 10_000,
        texture: false,
        pbr: false,
        quad: false,
        generate_parts: false,
      });
      if (!taskId) throw new Error("Tripo returned no task identifier.");
      sendJson(response, 201, { taskId });
      return;
    }

    if (request.url === "/v1/tasks/status") {
      const task = await client.getTask(taskIdFrom(payload));
      sendJson(response, 200, publicTask(task));
      return;
    }

    if (request.url === "/v1/tasks/download") {
      const task = await client.getTask(taskIdFrom(payload));
      if (task.status !== "success") throw new Error(`Tripo task is not ready (${task.status}).`);
      const downloaded = await client.downloadModel(task);
      if (!downloaded?.data.byteLength) throw new Error("Tripo returned no downloadable mesh.");
      if (downloaded.data.byteLength > MAX_MODEL_BYTES) throw new Error("The generated GLB exceeds the 40 MB local mesh limit.");
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Length": downloaded.data.byteLength,
        "Content-Type": downloaded.contentType || "model/gltf-binary",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(Buffer.from(downloaded.data));
      return;
    }

    sendJson(response, 404, { error: "Local bridge route not found." });
  } catch (error) {
    const safe = safeError(error);
    sendJson(response, safe.status, { error: safe.error });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Tripo local bridge ready at http://${HOST}:${PORT}`);
  console.log("Keys are accepted per request, kept only in memory, and never logged or stored.");
});
