import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [studio, podStyler, landingPage, globalCss, podCss] = await Promise.all([
  readFile(new URL("../components/Studio.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/PodStyler.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/LandingPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../components/PodStyler.module.css", import.meta.url), "utf8"),
]);

test("Studio dialog traps and restores keyboard focus", () => {
  assert.match(studio, /aria-labelledby="ai-modal-title"/);
  assert.match(studio, /previousFocusRef/);
  assert.match(studio, /event\.key !== "Tab"/);
  assert.match(studio, /aria-haspopup="dialog"/);
});

test("Tripo BYOK is opt-in for browser persistence and visibly bypasses the app server", () => {
  assert.match(studio, /Remember Key in this browser/);
  assert.match(studio, /TRIPO_API_KEY_STORAGE_KEY/);
  assert.match(studio, /Never uploaded to the LetPot Maker server/);
  assert.match(studio, /Browser → local bridge → Tripo → local cache/);
  assert.match(studio, /npm run tripo:bridge/);
  assert.match(studio, /texture\/PBR off/);
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

test("all product surfaces inherit one documented token system", () => {
  assert.doesNotMatch(globalCss, /Light-only LetPot brand convergence/);
  assert.match(globalCss, /--text-xs: 12px;/);
  assert.match(globalCss, /--focus-ring: #2e8b3d;/);
  assert.match(podCss, /--green-700: var\(--primary-700\);/);
  assert.match(podCss, /--ink: var\(--fg\);/);
});

test("Studio foundations do not redeclare exact component selectors", () => {
  const foundation = globalCss.split("/* Public project introduction. */")[0];
  const selectors = [
    ".studio-shell",
    ".topbar",
    ".brand",
    ".workspace",
    ".library-panel",
    ".stage",
    ".view-tools",
    ".inspector-panel",
  ];

  for (const selector of selectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.equal(
      [...foundation.matchAll(new RegExp(`^${escaped} \\{`, "gm"))].length,
      1,
      `${selector} should have one foundation rule`,
    );
  }
});

test("mobile Studio keeps the preview primary and exposes explicit workspace tabs", () => {
  assert.match(studio, /data-mobile-panel=\{mobilePanel\}/);
  assert.match(studio, /aria-label="Mobile Studio workspace"/);
  assert.match(studio, /aria-controls="studio-preview"/);
  assert.match(studio, /aria-controls="studio-library"/);
  assert.match(studio, /aria-controls="studio-adjustments"/);
  assert.match(globalCss, /workspace\[data-mobile-panel="library"\] \.library-panel/);
  assert.match(globalCss, /workspace\[data-mobile-panel="adjust"\] \.inspector-panel/);
});

test("Pod Styler offers a keyboard-operable pod picker", () => {
  assert.match(podStyler, /className=\{styles\.podPicker\} role="group"/);
  assert.match(podStyler, /aria-pressed=\{selectedPods\.includes\(index\)\}/);
  assert.match(podStyler, /selectPodFromPicker/);
  assert.match(podCss, /\.podPicker button \{[^}]+44px/);
});

test("landing 3D waits for idle time and exposes loading feedback", () => {
  assert.match(landingPage, /const \[shouldLoad, setShouldLoad\] = useState\(false\)/);
  assert.match(landingPage, /requestIdleCallback/);
  assert.match(landingPage, /Loading 3D preview…/);
  assert.match(globalCss, /\.landing-model\[data-ready="true"\] \.landing-model-loading/);
});
