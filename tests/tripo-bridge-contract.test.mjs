import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bridge, browserClient] = await Promise.all([
  readFile(new URL("../scripts/tripo-local-bridge.ts", import.meta.url), "utf8"),
  readFile(new URL("../lib/tripo-mesh.ts", import.meta.url), "utf8"),
]);

test("Tripo helper is loopback-only and origin restricted", () => {
  assert.match(bridge, /const HOST = "127\.0\.0\.1"/);
  assert.match(bridge, /url\.hostname === "localhost" \|\| url\.hostname === "127\.0\.0\.1"/);
  assert.match(bridge, /TRIPO_BRIDGE_ORIGINS/);
  assert.match(bridge, /Access-Control-Allow-Private-Network/);
});

test("Tripo helper keeps mesh generation untextured and does not write request data", () => {
  assert.match(bridge, /texture: false/);
  assert.match(bridge, /pbr: false/);
  assert.doesNotMatch(bridge, /writeFile|appendFile|createWriteStream/);
  assert.doesNotMatch(bridge, /console\.(?:log|error)\([^\n]*apiKey/);
});

test("browser client uses only the local bridge for authenticated requests", () => {
  assert.match(browserClient, /http:\/\/127\.0\.0\.1:4318/);
  assert.doesNotMatch(browserClient, /new TripoClient/);
  assert.match(browserClient, /Local Tripo bridge is not running/);
});
