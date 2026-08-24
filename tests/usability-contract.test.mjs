import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [studio, podStyler, globalCss, podCss] = await Promise.all([
  readFile(new URL("../components/Studio.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/PodStyler.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../components/PodStyler.module.css", import.meta.url), "utf8"),
]);

test("Studio dialog traps and restores keyboard focus", () => {
  assert.match(studio, /aria-labelledby="ai-modal-title"/);
  assert.match(studio, /previousFocusRef/);
  assert.match(studio, /event\.key !== "Tab"/);
  assert.match(studio, /aria-haspopup="dialog"/);
});

test("full-screen tools expose skip links and visible focus styles", () => {
  assert.match(studio, /href="#studio-workspace"/);
  assert.match(podStyler, /href="#pod-styler-workspace"/);
  assert.match(globalCss, /\.studio-shell :where\([^}]+\):focus-visible/);
  assert.match(podCss, /\.page :where\([^}]+\):focus-visible/);
});

test("primary copy and form controls use the readable type contract", () => {
  assert.match(globalCss, /\.hero-copy > p, \.intro-copy p \{ font-size: 16px;/);
  assert.match(globalCss, /\.ai-prompt-field input \{ min-height: 48px; font-size: 16px;/);
  assert.match(globalCss, /\.control-group label[^}]+font-size: 14px;/);
  assert.match(podCss, /\.filters button \{ min-height: 44px; font-size: 13px;/);
});
