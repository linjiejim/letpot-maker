"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ModelDefinition,
  ModelId,
  ModelOptions,
  ModelTag,
} from "../lib/model-factory";

export type LandingModel = Pick<
  ModelDefinition,
  "id" | "number" | "name" | "subtitle" | "parts" | "style" | "tags" | "defaults" | "officialMesh"
> & {
  shape: ModelOptions["shape"];
};

type LandingPageProps = {
  models: LandingModel[];
  adapterStandard: {
    lowerDiameter: number;
    upperDiameter: number;
    totalHeight: number;
  };
};

const FEATURED_MODELS: ModelId[] = ["monstera-cluster", "tomato-pal", "reindeer", "orbit-astronaut"];
const INITIAL_GALLERY_MODELS: ModelId[] = ["monstera-cluster", "tomato-pal", "reindeer", "orbit-astronaut"];
const MODEL_STYLE_FAMILIES = ["soft-sculpt", "low-poly", "smooth-organic"] as const;
type ModelStyleFamily = typeof MODEL_STYLE_FAMILIES[number];
const MODEL_TAGS: ModelTag[] = ["veggie", "herbs", "tree", "fruit", "flower", "animal", "christmas", "plant", "space", "insect", "ocean", "holiday", "pet", "other"];
const STYLE_LABELS: Record<ModelStyleFamily, string> = {
  "soft-sculpt": "Soft Sculpt",
  "low-poly": "Low Poly",
  "smooth-organic": "Smooth",
};

function modelStyleFamily(definition: Pick<LandingModel, "style" | "officialMesh">): ModelStyleFamily {
  if (definition.officialMesh) return "soft-sculpt";
  return definition.style === "lowpoly" ? "low-poly" : "smooth-organic";
}
const TAG_LABELS: Record<ModelTag, string> = {
  lowpoly: "Low poly",
  realistic: "Realistic",
  veggie: "Veggie",
  herbs: "Herbs",
  tree: "Tree",
  fruit: "Fruit",
  flower: "Flower",
  animal: "Animal",
  christmas: "Christmas",
  plant: "Plant",
  space: "Space",
  insect: "Insect",
  ocean: "Ocean",
  holiday: "Holiday",
  pet: "Pet",
  other: "Other",
};

function optionsFor(modelId: ModelId, models: LandingModel[]): ModelOptions {
  const definition = models.find((item) => item.id === modelId) ?? models[0];
  return {
    modelId: definition.id,
    connectionMode: "detachable",
    ...definition.defaults,
    faceted: definition.style === "lowpoly",
    shape: definition.shape,
  };
}

function LiveModel({
  modelId,
  models,
  interactive = false,
}: {
  modelId: ModelId;
  models: LandingModel[];
  interactive?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || shouldLoad || interactive) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "240px" },
    );
    observer.observe(mount);
    return () => observer.disconnect();
  }, [interactive, shouldLoad]);

  useEffect(() => {
    if (!interactive || shouldLoad) return;
    const load = () => setShouldLoad(true);
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const idle = idleWindow.requestIdleCallback(load, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(idle);
    }

    const timer = globalThis.setTimeout(load, 350);
    return () => globalThis.clearTimeout(timer);
  }, [interactive, shouldLoad]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !shouldLoad) return;

    let cancelled = false;
    let disposeScene: (() => void) | undefined;
    const definition = models.find((model) => model.id === modelId) ?? models[0];

    void Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
      import("../lib/model-factory"),
      import("../lib/official-mesh-browser"),
    ]).then(async ([THREE, { OrbitControls }, { createModel, disposeObject }, { loadOfficialMesh }]) => {
      if (cancelled) return;

      const officialSource = definition.officialMesh ? await loadOfficialMesh(definition) : null;
      if (cancelled) {
        if (officialSource) disposeObject(officialSource.object);
        return;
      }
      const build = createModel({
        ...optionsFor(modelId, models),
        externalMesh: officialSource?.object,
      });
      if (officialSource) disposeObject(officialSource.object);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(interactive ? 31 : 34, 1, 0.1, 600);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, interactive ? 1.5 : 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.enablePan = false;
      controls.enableZoom = interactive;
      controls.enabled = interactive;
      controls.autoRotate = false;

      scene.add(new THREE.HemisphereLight("#fffdf5", "#607362", 2.9));
      const key = new THREE.DirectionalLight("#fff8e7", 5.2);
      key.position.set(55, 88, 58);
      key.castShadow = true;
      scene.add(key);
      const fill = new THREE.DirectionalLight("#c6e5cb", 2.1);
      fill.position.set(-45, 28, -34);
      scene.add(fill);

      const presentationRig = new THREE.Group();
      presentationRig.name = "landing_hero_presentation_rig";
      presentationRig.add(build.assembly);
      scene.add(presentationRig);
      const bounds = new THREE.Box3().setFromObject(build.assembly);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const diameter = Math.max(size.x, size.y, size.z);
      controls.target.copy(center);
      const cameraOrbit = diameter * 2.24;
      // The optimized Tripo GLBs retain their authored front on +X; procedural models face +Z.
      const frontAzimuth = definition.officialMesh ? Math.PI / 2 : 0;
      camera.position.set(
        Math.sin(frontAzimuth) * cameraOrbit,
        center.y + diameter * 0.72,
        Math.cos(frontAzimuth) * cameraOrbit,
      );
      camera.lookAt(center);
      controls.update();

      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(size.x, size.z) * 0.8, 48),
        new THREE.ShadowMaterial({ color: "#24472d", opacity: 0.14 }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.05;
      shadow.receiveShadow = true;
      scene.add(shadow);

      const resize = () => {
        const width = Math.max(mount.clientWidth, 1);
        const height = Math.max(mount.clientHeight, 1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      let frame = 0;
      let running = false;
      let visible = true;
      let controlsActive = false;
      let presentationMotion = 1;
      const handleControlsStart = () => { controlsActive = true; };
      const handleControlsEnd = () => { controlsActive = false; };
      controls.addEventListener("start", handleControlsStart);
      controls.addEventListener("end", handleControlsEnd);
      const render = () => {
        if (cancelled || !visible || document.hidden) {
          frame = 0;
          running = false;
          mount.setAttribute("data-rendering", "false");
          return;
        }
        if (!interactive && !reduceMotion) build.assembly.rotation.y += 0.0032;
        if (interactive && !reduceMotion) {
          presentationMotion += ((controlsActive ? 0 : 1) - presentationMotion) * 0.075;
          const time = performance.now() * 0.001;
          presentationRig.position.set(
            Math.sin(time * 0.72 + 0.9) * diameter * 0.011 * presentationMotion,
            Math.sin(time * 1.08) * diameter * 0.022 * presentationMotion,
            0,
          );
          presentationRig.rotation.z = Math.sin(time * 0.62 + 1.8) * 0.012 * presentationMotion;
          const breathingScale = 1 + Math.sin(time * 0.86 + 1.7) * 0.012 * presentationMotion;
          presentationRig.scale.setScalar(breathingScale);
        }
        controls.update();
        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(render);
      };
      const startRendering = () => {
        if (running || cancelled || !visible || document.hidden) return;
        running = true;
        mount.setAttribute("data-rendering", "true");
        render();
      };
      const stopRendering = () => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        running = false;
        mount.setAttribute("data-rendering", "false");
      };
      const renderVisibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) startRendering();
        else stopRendering();
      }, { rootMargin: "80px" });
      const handleDocumentVisibility = () => {
        if (document.hidden) stopRendering();
        else startRendering();
      };
      renderVisibilityObserver.observe(mount);
      document.addEventListener("visibilitychange", handleDocumentVisibility);
      startRendering();
      setIsReady(true);

      disposeScene = () => {
        stopRendering();
        resizeObserver.disconnect();
        renderVisibilityObserver.disconnect();
        document.removeEventListener("visibilitychange", handleDocumentVisibility);
        controls.removeEventListener("start", handleControlsStart);
        controls.removeEventListener("end", handleControlsEnd);
        controls.dispose();
        renderer.dispose();
        shadow.geometry.dispose();
        shadow.material.dispose();
        disposeObject(build.assembly);
        renderer.domElement.remove();
      };
    }).catch(() => {
      if (!cancelled) mount.setAttribute("data-preview-error", "true");
    });

    return () => {
      cancelled = true;
      disposeScene?.();
    };
  }, [interactive, modelId, models, shouldLoad]);

  return (
    <div className={`landing-model ${interactive ? "interactive" : ""}`} ref={mountRef} data-ready={isReady} aria-label={`${modelId} live 3D preview`} aria-busy={!isReady}>
      <span className="landing-model-loading" aria-hidden="true">Loading 3D preview…</span>
    </div>
  );
}

export function LandingPage({ models, adapterStandard }: LandingPageProps) {
  const [featuredId, setFeaturedId] = useState<ModelId>(FEATURED_MODELS[0]);
  const [featuredPaused, setFeaturedPaused] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [galleryStyle, setGalleryStyle] = useState<"all" | ModelStyleFamily>("soft-sculpt");
  const [galleryTag, setGalleryTag] = useState<"all" | ModelTag>("all");
  const [galleryQuery, setGalleryQuery] = useState("");
  const [galleryOrder, setGalleryOrder] = useState<ModelId[]>(INITIAL_GALLERY_MODELS);
  const featured = useMemo(
    () => models.find((item) => item.id === featuredId) ?? models[0],
    [featuredId, models],
  );
  const filteredGalleryModels = useMemo(() => {
    const query = galleryQuery.trim().toLowerCase();
    return models.filter((item) => {
      const matchesStyle = galleryStyle === "all" || modelStyleFamily(item) === galleryStyle;
      const matchesTag = galleryTag === "all" || item.tags.includes(galleryTag);
      const searchText = [item.name, item.subtitle, item.style, ...item.tags].join(" ").toLowerCase();
      return matchesStyle && matchesTag && (!query || searchText.includes(query));
    });
  }, [galleryQuery, galleryStyle, galleryTag, models]);
  const galleryModelIds = useMemo(() => {
    const availableIds = new Set(filteredGalleryModels.map((item) => item.id));
    const preferredIds = galleryOrder.filter((id) => availableIds.has(id));
    const remainingIds = filteredGalleryModels.map((item) => item.id).filter((id) => !preferredIds.includes(id));
    return [...preferredIds, ...remainingIds].slice(0, 4);
  }, [filteredGalleryModels, galleryOrder]);
  const galleryStudioHref = useMemo(() => {
    const search = new URLSearchParams();
    const query = galleryQuery.trim();
    if (query) search.set("q", query);
    if (galleryStyle !== "all") search.set("style", galleryStyle);
    if (galleryTag !== "all") search.set("tag", galleryTag);
    const suffix = search.toString();
    return `/studio${suffix ? `?${suffix}` : ""}`;
  }, [galleryQuery, galleryStyle, galleryTag]);

  useEffect(() => {
    const updateNav = () => setNavScrolled(window.scrollY > 18);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  useEffect(() => {
    if (featuredPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      setFeaturedId((current) => {
        const currentIndex = FEATURED_MODELS.indexOf(current);
        return FEATURED_MODELS[(currentIndex + 1) % FEATURED_MODELS.length];
      });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [featuredId, featuredPaused]);

  useEffect(() => {
    const nextIndex = (FEATURED_MODELS.indexOf(featuredId) + 1) % FEATURED_MODELS.length;
    const nextModel = models.find((item) => item.id === FEATURED_MODELS[nextIndex]);
    if (!nextModel?.officialMesh) return;

    let cancelled = false;
    const preload = () => {
      if (cancelled) return;
      void import("../lib/official-mesh-browser")
        .then(({ preloadOfficialMesh }) => preloadOfficialMesh(nextModel))
        .catch(() => undefined);
    };
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const idle = idleWindow.requestIdleCallback(preload, { timeout: 1800 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idle);
      };
    }
    const timer = window.setTimeout(preload, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [featuredId, models]);

  const chooseGalleryTag = (tag: "all" | ModelTag) => {
    setGalleryTag(tag);
    setGalleryOrder([]);
  };

  const chooseGalleryStyle = (style: "all" | ModelStyleFamily) => {
    setGalleryStyle(style);
    setGalleryTag("all");
    setGalleryOrder([]);
  };

  const randomizeGallery = () => {
    const shuffled = [...filteredGalleryModels];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    setGalleryOrder(shuffled.map((item) => item.id));
  };

  return (
    <main className="landing-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className={`landing-nav-shell ${navScrolled ? "scrolled" : ""}`}>
        <div className="landing-nav">
          <a className="brand" href="/" aria-label="LetPot Maker home">
            <span className="brand-mark" aria-hidden="true" />
            <span><b>LetPot</b> Maker</span>
          </a>
          <nav aria-label="Project navigation">
            <a href="#gallery">Discover</a>
            <a href="#system">Maker system</a>
            <a href="#workflow">Build guide</a>
            <a href="/pod-styler">Pod Styler</a>
          </nav>
          <div className="landing-nav-actions">
            <a className="landing-github-link" href="https://github.com/linjiejim/letpot-maker" target="_blank" rel="noreferrer" aria-label="View LetPot Maker on GitHub">GitHub <span>↗</span></a>
            <a className="landing-nav-cta" href="/studio">Open Maker Studio <span>→</span></a>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="main-content">
        <div className="hero-copy">
          <span className="landing-kicker"><i /> THE OPEN LETPOT MAKER PLAYGROUND</span>
          <h1>Make your LetPot<br /><em>unmistakably yours.</em></h1>
          <p>Find ready-to-print 3D assets, customize modular accessories, and build beyond the pod—from playful garden companions to practical upgrades.</p>
          <div className="hero-actions">
            <a className="landing-primary-cta" href="#gallery">Explore 3D assets <span>→</span></a>
            <a className="landing-secondary-cta" href="/studio">Start making</a>
          </div>
          <ul className="hero-facts" aria-label="Maker library highlights">
            <li><b>{models.length} assets</b><span>Ready to explore</span></li>
            <li><b>STL · OBJ · 3MF</b><span>Practical maker formats</span></li>
            <li><b>Modular by design</b><span>Built to remix</span></li>
          </ul>
        </div>

        <div className="hero-product">
          <div className="hero-orbit" aria-hidden="true" />
          <div
            className="hero-preview-card"
            onPointerDown={() => setFeaturedPaused(true)}
            onPointerUp={() => setFeaturedPaused(false)}
            onPointerCancel={() => setFeaturedPaused(false)}
          >
            <LiveModel key={featuredId} modelId={featuredId} models={models} interactive />
            <div className="hero-model-meta">
              <span>LIVE PARAMETRIC MODEL · DRAG TO ROTATE</span>
              <div><h2>{featured.name}</h2><b>{featured.parts} detachable parts</b></div>
            </div>
          </div>
          <div
            className="featured-switcher"
            role="group"
            aria-label="Choose featured model"
            onPointerEnter={() => setFeaturedPaused(true)}
            onPointerLeave={() => setFeaturedPaused(false)}
            onFocusCapture={() => setFeaturedPaused(true)}
            onBlurCapture={() => setFeaturedPaused(false)}
          >
            {FEATURED_MODELS.map((modelId) => {
              const item = models.find((model) => model.id === modelId)!;
              return (
                <button
                  type="button"
                  key={modelId}
                  className={featuredId === modelId ? "active" : ""}
                  onClick={() => setFeaturedId(modelId)}
                  aria-pressed={featuredId === modelId}
                >
                  {item.officialMesh?.previewPath && (
                    // These checked-in thumbnails are already compact 512 px JPEGs; native images avoid a runtime transform for four tiny UI assets.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.officialMesh.previewPath}
                      alt=""
                      width={96}
                      height={104}
                      loading={modelId === FEATURED_MODELS[0] ? "eager" : "lazy"}
                      decoding="async"
                    />
                  )}
                  <span className="featured-switcher-copy"><small>{item.number}</small><b>{item.name}</b></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-gallery" id="gallery">
        <div className="gallery-heading">
          <span className="section-kicker">BROWSE THE MAKER LIBRARY</span>
          <h2>Find a solid start.<br /><em>Then make it yours.</em></h2>
          <p>Search and filter printable assets by subject or style. Every preview is rendered from the same geometry used by the Studio and export pipeline—not a concept image.</p>
        </div>
        <div className="gallery-browser">
          <div className="gallery-browser-heading">
            <div><span>LETPOT MAKER · COLLECTION 01</span><h3>What do you want to make?</h3><p>Explore {models.length} printable starting points, with more accessory types planned.</p></div>
            <button type="button" onClick={randomizeGallery} disabled={!filteredGalleryModels.length} aria-label={galleryTag === "all" ? "Show random models" : `Show random ${TAG_LABELS[galleryTag].toLowerCase()} models`}><i aria-hidden="true">↝</i> Random pick</button>
          </div>
          <label className="gallery-search" htmlFor="asset-search">
            <span>SEARCH THE LIBRARY</span>
            <div><i aria-hidden="true">⌕</i><input id="asset-search" type="search" value={galleryQuery} onChange={(event) => { setGalleryQuery(event.target.value); setGalleryOrder([]); }} placeholder="Try cactus, flower, animal, Christmas…" autoComplete="off" /></div>
          </label>
          <div className="gallery-styles" role="group" aria-label="Filter models by style">
            {MODEL_STYLE_FAMILIES.map((style) => (
              <button type="button" key={style} className={galleryStyle === style ? "active" : ""} onClick={() => chooseGalleryStyle(style)} aria-pressed={galleryStyle === style}><span>{STYLE_LABELS[style]}</span><b>{models.filter((item) => modelStyleFamily(item) === style).length}</b></button>
            ))}
            <button type="button" className={galleryStyle === "all" ? "active" : ""} onClick={() => chooseGalleryStyle("all")} aria-pressed={galleryStyle === "all"}><span>All styles</span><b>{models.length}</b></button>
          </div>
          <div className="gallery-tags" role="group" aria-label="Filter models by tag">
            <button type="button" className={galleryTag === "all" ? "active" : ""} onClick={() => chooseGalleryTag("all")} aria-pressed={galleryTag === "all"}><span>All subjects</span><b>{models.filter((item) => galleryStyle === "all" || modelStyleFamily(item) === galleryStyle).length}</b></button>
            {MODEL_TAGS.map((tag) => {
              const count = models.filter((item) => (galleryStyle === "all" || modelStyleFamily(item) === galleryStyle) && item.tags.includes(tag)).length;
              if (!count) return null;
              return <button type="button" key={tag} className={galleryTag === tag ? "active" : ""} onClick={() => chooseGalleryTag(tag)} aria-pressed={galleryTag === tag}><span>{TAG_LABELS[tag]}</span><b>{count}</b></button>;
            })}
          </div>
          <div className="gallery-result-note">
            <div><span>{galleryQuery ? `Results for “${galleryQuery}”` : galleryTag === "all" ? galleryStyle === "all" ? "All printable assets" : STYLE_LABELS[galleryStyle] : TAG_LABELS[galleryTag]}</span><b>{filteredGalleryModels.length ? `Showing ${galleryModelIds.length} of ${filteredGalleryModels.length}` : "No matching assets yet"}</b></div>
            <a href={galleryStudioHref}>View all {filteredGalleryModels.length || models.length} in Studio <span>→</span></a>
          </div>
        </div>
        <div className="gallery-models">
          {galleryModelIds.map((modelId) => {
            const item = models.find((model) => model.id === modelId)!;
            const subjectTag = item.tags.find((tag) => MODEL_TAGS.includes(tag));
            return (
              <article key={modelId}>
                <a className="gallery-card-link" href={`/studio?model=${modelId}`} aria-label={`Open ${item.name} in Studio`}>
                  <div className="gallery-live"><LiveModel modelId={modelId} models={models} /></div>
                  <div className="gallery-card-copy">
                    <div><span>{item.number} · {STYLE_LABELS[modelStyleFamily(item)]}{subjectTag ? ` · ${TAG_LABELS[subjectTag]}` : ""}</span><h3>{item.name}</h3><p>{item.subtitle}</p></div>
                    <i aria-hidden="true">↗</i>
                  </div>
                </a>
              </article>
            );
          })}
          {!galleryModelIds.length && <div className="gallery-empty"><span>NO MATCH YET</span><h3>Try a broader idea.</h3><p>Clear the search or choose another category. The library is designed to keep growing.</p><button type="button" onClick={() => { setGalleryQuery(""); setGalleryStyle("all"); setGalleryTag("all"); setGalleryOrder([]); }}>Show all assets</button></div>}
        </div>
      </section>

      <section className="maker-standard" id="system">
        <div className="standard-copy">
          <span className="section-kicker">THE SHARED LETPOT STANDARD</span>
          <h2>One standard beneath every idea.</h2>
          <p>The character, plant or useful accessory can change completely while the hidden connection stays predictable. LetPot Maker owns the socket, pin and adapter geometry so every Official model starts from the same measured fit.</p>
          <dl className="standard-facts">
            <div><dt>{models.length}</dt><dd>Checked-in models</dd></div>
            <div><dt>Ø{adapterStandard.lowerDiameter} / Ø{adapterStandard.upperDiameter}</dt><dd>Locked pod adapter</dd></div>
            <div><dt>{adapterStandard.totalHeight.toFixed(1)} mm</dt><dd>Adapter height</dd></div>
          </dl>
          <p className="standard-mode-note"><b>Detachable by default.</b> Print the artwork, reusable connector and adapter separately—or choose integrated mode to fuse the printable assembly into one solid.</p>
        </div>
        <div className="standard-exploded">
          <div className="standard-exploded-heading"><span>EXPLODED ASSEMBLY</span><b>Detachable mode · 3 printable parts</b></div>
          <ol className="assembly-stack" aria-label="Standard detachable topper assembly">
            <li>
              <div className="assembly-part topper-part" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/models/official/plants/previews/monstera-cluster.jpg" alt="" width={164} height={164} loading="lazy" decoding="async" />
                <span className="socket-cutaway"><i /></span>
              </div>
              <div><span>01 · ARTWORK</span><b>Topper with blind socket</b><p>Artwork stays inside the selected width and height envelope; the socket remains hidden in its underside.</p></div>
            </li>
            <li>
              <div className="assembly-part pin-part" aria-hidden="true"><i /></div>
              <div><span>02 · CONNECTOR</span><b>Reusable double-ended pin</b><p>A keyed hex connector makes color changes and replacement parts straightforward.</p></div>
            </li>
            <li>
              <div className="assembly-part adapter-part" aria-hidden="true"><i /></div>
              <div><span>03 · ADAPTER</span><b>Locked Ø{adapterStandard.lowerDiameter} / Ø{adapterStandard.upperDiameter} base</b><p>This code-owned interface does not stretch when the artwork proportions change.</p></div>
            </li>
            <li>
              <div className="assembly-part pod-part" aria-hidden="true"><i /></div>
              <div><span>04 · EXISTING HARDWARE</span><b>Your LetPot pod opening</b><p>The printed adapter seats on the pod without modifying the growing system.</p></div>
            </li>
          </ol>
          <p className="standard-rule">Change everything above the socket. Keep the fit below it.</p>
        </div>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="workflow-heading">
          <span className="section-kicker">A PRACTICAL MAKER FLOW</span>
          <div><h2>From “what if?” to a physical thing.</h2><p>Start with something proven, shape it around your idea, and leave the Studio with files you can actually use.</p></div>
        </div>
        <ol aria-label="Four-step design workflow">
          <li className="choose"><span>01</span><i aria-hidden="true" /><div><b>Discover</b><p>Search the maker library or describe a new printable idea with AI Generate.</p></div></li>
          <li className="tune"><span>02</span><i aria-hidden="true" /><div><b>Customize</b><p>Tune scale, proportions, details, and colors inside tested ranges.</p></div></li>
          <li className="check"><span>03</span><i aria-hidden="true" /><div><b>Validate</b><p>Rotate the assembly and review dimensions, parts, fit, and print guidance.</p></div></li>
          <li className="print"><span>04</span><i aria-hidden="true" /><div><b>Make &amp; share</b><p>Export 3MF, STL, or OBJ files, test the result, and feed your learnings back.</p></div></li>
        </ol>
      </section>

      <section className="community-section">
        <div className="community-copy">
          <span className="section-kicker">OPEN SOURCE · LOCAL FIRST</span>
          <h2>Built to inspect, remix, and trust.</h2>
          <p>The models, geometry rules, validators and export pipeline are open for review. Growers can start with a finished design; model makers can trace exactly how the shared fit and printable files are produced.</p>
          <ul>
            <li>Inspect the same geometry used by the browser preview and export pipeline.</li>
            <li>Contribute a model, print profile, fit note, material choice or real-world photo.</li>
            <li>Help expand the shared standard beyond toppers into useful LetPot accessories.</li>
          </ul>
          <div className="community-actions">
            <a href="https://github.com/linjiejim/letpot-maker" target="_blank" rel="noreferrer">Explore the GitHub repo <span>↗</span></a>
            <a href="https://github.com/linjiejim/letpot-maker/tree/main/docs" target="_blank" rel="noreferrer">Read the project docs</a>
          </div>
        </div>
        <aside className="local-privacy-card">
          <span>TRIPO · BRING YOUR OWN KEY</span>
          <h3>Your Key never reaches the LetPot Maker server.</h3>
          <p>Direct mesh generation goes from the browser through a loopback-only helper on this device to Tripo. The helper keeps no history, while the returned GLB stays in this browser.</p>
          <div><i>01</i><span><b>Memory by default</b>The Key is cleared when the dialog closes unless you explicitly remember it.</span></div>
          <div><i>02</i><span><b>Browser-local cache</b>Generated GLBs stay in local IndexedDB and are never published automatically.</span></div>
          <div><i>03</i><span><b>Standardized output</b>The app adds the same locked socket, pin and adapter before export.</span></div>
          <a href="/studio">Open AI Generate <span>→</span></a>
        </aside>
      </section>

      <section className="landing-final-cta">
        <span className="landing-kicker"><i /> YOUR NEXT BUILD STARTS HERE</span>
        <h2>Find it. Remix it.<br />Make it yours.</h2>
        <a href="/studio">Open Maker Studio <span>→</span></a>
      </section>

      <footer className="landing-footer">
        <a className="brand" href="/"><span className="brand-mark" aria-hidden="true" /><span><b>LetPot</b> Maker</span></a>
        <p>Open tools and printable assets for people who want more from their LetPot.<br />Independent community project; not an official LetPot product.</p>
        <div><a href="#gallery">Library</a><a href="#workflow">Build guide</a><a href="/pod-styler">Pod Styler</a><a href="/studio">Maker Studio</a><a href="https://github.com/linjiejim/letpot-maker">Source code</a></div>
      </footer>
    </main>
  );
}
