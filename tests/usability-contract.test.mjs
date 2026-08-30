import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const [studio, podStyler, landingPage, modelFactory, globalCss, podCss] = await Promise.all([
  readFile(new URL("../components/Studio.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/PodStyler.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/LandingPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../lib/model-factory.ts", import.meta.url), "utf8"),
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
  assert.match(globalCss, /\.hero-copy > p, \.standard-copy > p \{ font-size: 16px;/);
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
  assert.match(globalCss, /html \{ overflow-x: clip; scroll-behavior: smooth; \}/);
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
  assert.match(landingPage, /official-mesh-browser/);
  assert.match(landingPage, /Loading 3D preview…/);
  assert.doesNotMatch(landingPage, /landing-official-preview|officialPreview/);
  assert.match(globalCss, /\.landing-model\[data-ready="true"\] \.landing-model-loading/);
});

test("landing 3D pauses rendering when previews or the page are hidden", () => {
  assert.match(landingPage, /const renderVisibilityObserver = new IntersectionObserver/);
  assert.match(landingPage, /document\.addEventListener\("visibilitychange", handleDocumentVisibility\)/);
  assert.match(landingPage, /mount\.setAttribute\("data-rendering", "false"\)/);
  assert.match(landingPage, /renderVisibilityObserver\.disconnect\(\)/);
});

test("landing hero cycles visual model choices while keeping the live model front-facing", () => {
  assert.match(landingPage, /FEATURED_MODELS: ModelId\[\] = \["monstera-cluster", "tomato-pal", "reindeer", "orbit-astronaut"\]/);
  assert.match(landingPage, /INITIAL_GALLERY_MODELS: ModelId\[\] = \["monstera-cluster", "tomato-pal", "reindeer", "orbit-astronaut"\]/);
  assert.match(landingPage, /\}, 5000\);/);
  assert.match(landingPage, /item\.officialMesh\.previewPath/);
  assert.match(landingPage, /definition\.officialMesh \? Math\.PI \/ 2 : 0/);
  assert.match(landingPage, /controls\.autoRotate = false/);
  assert.match(landingPage, /controls\.enabled = interactive/);
  assert.match(landingPage, /Math\.sin\(frontAzimuth\) \* cameraOrbit/);
  assert.match(landingPage, /Math\.cos\(frontAzimuth\) \* cameraOrbit/);
  assert.doesNotMatch(landingPage, /controls\.minAzimuthAngle|controls\.maxAzimuthAngle/);
  assert.match(globalCss, /\.featured-switcher \{[^}]*grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
});

test("landing page explains the standard, open source path and local Tripo boundary", () => {
  assert.match(landingPage, /THE SHARED LETPOT STANDARD/);
  assert.match(landingPage, /Topper with blind socket/);
  assert.match(landingPage, /Explore the GitHub repo/);
  assert.match(landingPage, /Your Key never reaches the LetPot Maker server/);
  assert.match(landingPage, /View all \{filteredGalleryModels\.length \|\| models\.length\} in Studio/);
  assert.match(landingPage, /monstera-cluster\.jpg/);
  assert.match(globalCss, /\.socket-cutaway::before/);
});

test("Studio library search, stable Mine order, camera framing and adaptive environment stay explicit", () => {
  assert.match(studio, /aria-label=\{libraryMode === "official" \? "Search Official model titles" : "Search Mine titles"\}/);
  assert.match(studio, /item\.name\.toLowerCase\(\)\.includes\(normalizedLibraryQuery\)/);
  assert.match(studio, /title\.toLowerCase\(\)\.includes\(normalizedLibraryQuery\)/);
  assert.match(studio, /className="tag-filter-toggle" aria-expanded=\{tagsExpanded\}/);
  assert.match(studio, /visibleMineCreations\.map/);
  assert.match(studio, /applyTripoDesign\(metadata, parsed, false\)/);
  assert.match(studio, /framedModelRef\.current !== modelKey/);
  assert.match(studio, /previousOffset\.multiplyScalar\(scale\)/);
  assert.match(studio, /Match preview environment/);
  assert.match(studio, /samplePreviewPalette/);
  assert.match(studio, /aria-label="Filter designs by style"/);
  assert.match(studio, /useState<"all" \| ModelStyleFamily>\("soft-sculpt"\)/);
  assert.match(studio, /modelStyleFamily\(item\) === activeStyle/);
  assert.match(studio, /No ready-made match yet/);
  assert.match(studio, /<button onClick=\{\(\) => setAiOpen\(true\)\}>AI Generate<\/button><button className="secondary"/);
  assert.match(globalCss, /\.library-search input::-webkit-search-cancel-button/);
});

test("Studio hides stale geometry behind an explicit model loading state", () => {
  assert.match(studio, /const \[previewStatus, setPreviewStatus\] = useState<PreviewStatus \| null>/);
  assert.match(studio, /selected\.officialMesh \? "Loading the bundled 3D mesh…" : "Preparing the procedural 3D model…"/);
  assert.match(studio, /targetKey: `official:\$\{selected\.id\}:\$\{selected\.officialMesh \? "mesh" : "procedural"\}`/);
  assert.match(studio, /onPresented\(modelKey\)/);
  assert.match(studio, /current\.targetKey === presentedKey/);
  assert.match(studio, /data-preview-state=\{previewStatus\?\.kind\}/);
  assert.match(studio, /viewport-shell \$\{previewStatus \? "is-pending" : ""\}/);
  assert.match(studio, /LOADING 3D MODEL/);
  assert.match(studio, /setPreviewStatus\(\{ kind: "error", modelId: selected\.id/);
  assert.match(globalCss, /\.viewport-shell\.is-pending \{ opacity: 0; pointer-events: none; \}/);
  assert.match(globalCss, /\.stage-preview-status \{[^}]*background: var\(--surface\)/);
});

test("Official meshes are prefetched, cached and report real transfer progress", () => {
  assert.match(studio, /preloadOfficialMesh\(item\)/);
  assert.match(studio, /onProgress: \(\{ ratio \}\)/);
  assert.match(studio, /stage-preview-progress/);
  assert.match(globalCss, /\.stage-preview-progress \{/);
});

test("Topper dimensions default to 65 mm and preserve aspect ratio", () => {
  assert.match(studio, /const \[topperAspectLocked, setTopperAspectLocked\] = useState\(true\)/);
  assert.match(studio, /Keep proportions/);
  assert.match(studio, /topperWidth: roundToStep\(topperHeight \* ratio\)/);
  assert.match(studio, /topperHeight: roundToStep\(topperWidth \/ ratio\)/);
  assert.match(globalCss, /\.aspect-lock-row \{/);
});

test("Studio keeps advanced inspector information collapsed behind accessible help", () => {
  assert.match(studio, /function InfoTip/);
  assert.match(studio, /role="tooltip"/);
  assert.match(studio, /<b>Print setup<\/b>/);
  assert.match(studio, /<b>Fine tune shape<\/b>/);
  assert.match(studio, /<b>Preview options<\/b>/);
  assert.match(studio, /<b>Model &amp; print info<\/b>/);
  assert.doesNotMatch(studio, /<b>Base &amp; fit<\/b>/);
  assert.match(globalCss, /\.info-tip:hover > span\[role="tooltip"\], \.info-tip:focus-within/);
});

test("Official neural meshes, including Santa, stay single-color", () => {
  assert.doesNotMatch(modelFactory, /paletteStudy|paintOfficialMeshStudy/);
  assert.match(modelFactory, /printableMesh\.userData\.aiColorRole = "primary"/);
  assert.doesNotMatch(studio, /Experimental three-color mesh|Beard \+ trim|Santa color study/);
});

test("all procedural Studio cards have checked-in geometry renders", async () => {
  const previews = (await readdir(new URL("../public/models/previews/lowpoly/", import.meta.url)))
    .filter((filename) => filename.endsWith(".jpg"));
  assert.equal(previews.length, 18);
  const lowPolyIds = ["sprout", "pine", "cactus", "mushroom", "pumpkin", "acorn", "bonsai", "strawberry", "clover", "lotus", "aloe", "snakeplant", "eggplant", "grapes", "sunflower", "snail", "frog", "hedgehog"];
  const realisticIds = ["tomato", "carrot", "chili", "basil", "rosemary", "parsley", "daisy", "rose", "lemon", "bamboo"];
  await Promise.all(lowPolyIds.map((id) => access(new URL(`../public/models/previews/lowpoly/${id}.jpg`, import.meta.url))));
  await Promise.all(realisticIds.map((id) => access(new URL(`../public/models/previews/procedural/${id}.jpg`, import.meta.url))));
  assert.match(studio, /const collection = definition\.style === "lowpoly" \? "lowpoly" : "procedural"/);
});

test("Studio asset tags stay on one line and summarize hidden tags", () => {
  assert.match(studio, /const visibleTags = subjectTags\.slice\(0, 2\)/);
  assert.match(studio, /className="asset-tags-more"/);
  assert.match(globalCss, /\.asset-tags \{[^}]*flex-wrap: nowrap;[^}]*overflow: hidden;/);
});
