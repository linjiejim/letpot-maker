import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const serverUrl = new URL("../dist/server/index.js", import.meta.url);
  serverUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(serverUrl.href);
  return handler(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }));
}

test("reports production health", async () => {
  const response = await render("/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", service: "letpot-maker" });
});

test("renders the LetPot Maker homepage and searchable asset library", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>LetPot Maker — Find, remix and print 3D accessories/i);
  assert.match(html, /Make your LetPot/);
  assert.match(html, /Open Maker Studio/);
  assert.match(html, /BROWSE THE MAKER LIBRARY/);
  assert.match(html, /SEARCH THE LIBRARY/);
  assert.match(html, /THE MAKER ROADMAP/);
  assert.match(html, /http:\/\/localhost\/og-maker\.png/);
  assert.doesNotMatch(html, /3D Garden Lab|Garden Lab is growing/);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("renders the separate parametric Studio", async () => {
  const response = await render("/studio");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Maker Studio — LetPot Maker<\/title>/i);
  assert.match(html, /Maker Library/);
  assert.match(html, /My Creations/);
  assert.match(html, /Little Sprout/);
  assert.match(html, /Festive Fir/);
  assert.match(html, /Sweet Basil/);
  assert.match(html, /Tomato Vine/);
  assert.match(html, /Realistic/);
  assert.match(html, /Veggie/);
  assert.match(html, /Christmas/);
  assert.match(html, /Jolly Santa/);
  assert.match(html, /Export all/);
  assert.match(html, /Bambu 3MF/);
  assert.match(html, /AI Generate/);
  assert.match(html, /SIGNATURE/);
  assert.match(html, /Base &amp; fit/);
  assert.match(html, /fixed standard/);
  assert.match(html, /Ø33.*Ø41/);
  assert.doesNotMatch(html, /Lower seat diameter|Top cover diameter|Logo cover thickness/);
  assert.doesNotMatch(html, /og-maker\.png/);
  assert.doesNotMatch(html, /Parametric workspace|Export selected|New design|Detachable by design/i);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("renders the interactive Pod Styler", async () => {
  const response = await render("/pod-styler");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Pod Styler · LetPot Maker<\/title>/i);
  assert.match(html, /Choose LetPot model/);
  assert.match(html, /LPH-MAX/);
  assert.match(html, /LPH-SE/);
  assert.match(html, /LPH-AIR/);
  assert.match(html, /LPH-MINI/);
  assert.match(html, /Character selection/);
  assert.match(html, /Filter characters by tag/);
  assert.match(html, /Shift \+ click pods to select several/);
  assert.match(html, /Try a mix/);
  assert.doesNotMatch(html, /og-maker\.png/);
});
