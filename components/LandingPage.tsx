"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ADAPTER_STANDARD,
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  getDefaultShapeParameters,
  MODEL_LIBRARY,
  MODEL_TAGS,
  type ModelId,
  type ModelOptions,
  type ModelTag,
} from "../lib/model-factory";

const FEATURED_MODELS: ModelId[] = ["christmas-tree", "basil", "mushroom", "santa"];
const INITIAL_GALLERY_MODELS: ModelId[] = ["cactus", "christmas-tree", "bamboo", "basil"];
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
  other: "Other",
};

function optionsFor(modelId: ModelId): ModelOptions {
  const definition = MODEL_LIBRARY.find((item) => item.id === modelId) ?? MODEL_LIBRARY[0];
  return {
    ...DEFAULT_OPTIONS,
    modelId: definition.id,
    ...definition.defaults,
    faceted: definition.style === "lowpoly",
    shape: getDefaultShapeParameters(definition),
  };
}

function LiveModel({ modelId, interactive = false }: { modelId: ModelId; interactive?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const build = createModel(optionsFor(modelId));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(interactive ? 31 : 34, 1, 0.1, 600);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.enableZoom = interactive;
    controls.enabled = interactive;
    controls.autoRotate = interactive;
    controls.autoRotateSpeed = 0.55;

    scene.add(new THREE.HemisphereLight("#fffdf5", "#607362", 2.9));
    const key = new THREE.DirectionalLight("#fff8e7", 5.2);
    key.position.set(55, 88, 58);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight("#c6e5cb", 2.1);
    fill.position.set(-45, 28, -34);
    scene.add(fill);

    scene.add(build.assembly);
    const bounds = new THREE.Box3().setFromObject(build.assembly);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const diameter = Math.max(size.x, size.y, size.z);
    controls.target.copy(center);
    camera.position.set(diameter * 1.45, center.y + diameter * 0.72, diameter * 1.7);
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
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let frame = 0;
    const render = () => {
      frame = window.requestAnimationFrame(render);
      if (!interactive) build.assembly.rotation.y += 0.0032;
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
      disposeObject(build.assembly);
      mount.removeChild(renderer.domElement);
    };
  }, [interactive, modelId]);

  return <div className={`landing-model ${interactive ? "interactive" : ""}`} ref={mountRef} aria-label={`${modelId} live 3D preview`} />;
}

export function LandingPage() {
  const [featuredId, setFeaturedId] = useState<ModelId>(FEATURED_MODELS[0]);
  const [navScrolled, setNavScrolled] = useState(false);
  const [galleryTag, setGalleryTag] = useState<"all" | ModelTag>("all");
  const [galleryQuery, setGalleryQuery] = useState("");
  const [galleryOrder, setGalleryOrder] = useState<ModelId[]>(INITIAL_GALLERY_MODELS);
  const featured = useMemo(
    () => MODEL_LIBRARY.find((item) => item.id === featuredId) ?? MODEL_LIBRARY[0],
    [featuredId],
  );
  const filteredGalleryModels = useMemo(() => {
    const query = galleryQuery.trim().toLowerCase();
    return MODEL_LIBRARY.filter((item) => {
      const matchesTag = galleryTag === "all" || item.tags.includes(galleryTag);
      const searchText = [item.name, item.subtitle, item.style, ...item.tags].join(" ").toLowerCase();
      return matchesTag && (!query || searchText.includes(query));
    });
  }, [galleryQuery, galleryTag]);
  const galleryModelIds = useMemo(() => {
    const availableIds = new Set(filteredGalleryModels.map((item) => item.id));
    const preferredIds = galleryOrder.filter((id) => availableIds.has(id));
    const remainingIds = filteredGalleryModels.map((item) => item.id).filter((id) => !preferredIds.includes(id));
    return [...preferredIds, ...remainingIds].slice(0, 4);
  }, [filteredGalleryModels, galleryOrder]);

  useEffect(() => {
    const updateNav = () => setNavScrolled(window.scrollY > 18);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  const chooseGalleryTag = (tag: "all" | ModelTag) => {
    setGalleryTag(tag);
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
          <a className="landing-nav-cta" href="/studio">Open Maker Studio <span>→</span></a>
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
            <li><b>{MODEL_LIBRARY.length} assets</b><span>Ready to explore</span></li>
            <li><b>STL · OBJ · 3MF</b><span>Practical maker formats</span></li>
            <li><b>Modular by design</b><span>Built to remix</span></li>
          </ul>
        </div>

        <div className="hero-product">
          <div className="hero-orbit" aria-hidden="true" />
          <div className="hero-preview-card">
            <LiveModel key={featuredId} modelId={featuredId} interactive />
            <div className="hero-model-meta">
              <span>LIVE PARAMETRIC MODEL · DRAG TO ROTATE</span>
              <div><h2>{featured.name}</h2><b>{featured.parts} detachable parts</b></div>
            </div>
          </div>
          <div className="featured-switcher" aria-label="Choose featured model">
            {FEATURED_MODELS.map((modelId) => {
              const item = MODEL_LIBRARY.find((model) => model.id === modelId)!;
              return <button key={modelId} className={featuredId === modelId ? "active" : ""} onClick={() => setFeaturedId(modelId)}><span>{item.number}</span>{item.name}</button>;
            })}
          </div>
        </div>
      </section>

      <section className="landing-intro" id="about">
        <div>
          <span className="section-kicker">A MAKER PLATFORM, NOT A CHARACTER SHELF</span>
          <h2>One growing system.<br />Infinite ways to build.</h2>
        </div>
        <div className="intro-copy">
          <p>LetPot Maker starts with printable pod accessories because they are small, useful, and easy to experiment with. Every asset is a practical starting point you can inspect, tune, and print.</p>
          <p>That first collection is the foundation, not the boundary. The same maker library can grow into organizers, mounts, labels, light helpers, replacement pieces, and ideas the community has not imagined yet.</p>
        </div>
      </section>

      <section className="system-grid" id="system">
        <article>
          <span className="system-number">01</span>
          <div className="system-icon adapter-icon" aria-hidden="true"><i /></div>
          <h3>Find a solid starting point</h3>
          <p>Browse real 3D assets by style or subject instead of starting from a blank canvas. Every result opens directly in the Maker Studio with its printable geometry intact.</p>
          <b>{MODEL_LIBRARY.length} tested assets in the first collection</b>
        </article>
        <article>
          <span className="system-number">02</span>
          <div className="system-icon connector-icon" aria-hidden="true"><i /></div>
          <h3>Remix a shared system</h3>
          <p>A measured Ø{ADAPTER_STANDARD.lowerDiameter}/{ADAPTER_STANDARD.upperDiameter} mm adapter and reusable connector language keep today&apos;s pod collection compatible while leaving room for new accessory families.</p>
          <b>Change the idea without breaking the fit</b>
        </article>
        <article>
          <span className="system-number">03</span>
          <div className="system-icon solid-icon" aria-hidden="true"><i /></div>
          <h3>Make it real</h3>
          <p>Adjust within print-aware ranges, inspect the assembled model, and export watertight parts for common maker workflows. The browser preview and download pipeline share the same source geometry.</p>
          <b>STL, OBJ and Bambu 3MF exports</b>
        </article>
      </section>

      <section className="landing-gallery" id="gallery">
        <div className="gallery-heading">
          <span className="section-kicker">BROWSE THE MAKER LIBRARY</span>
          <h2>Find a solid start.<br /><em>Then make it yours.</em></h2>
          <p>Search and filter printable assets by subject or style. Every preview is rendered from the same geometry used by the Studio and export pipeline—not a concept image.</p>
        </div>
        <div className="gallery-browser">
          <div className="gallery-browser-heading">
            <div><span>LETPOT MAKER · COLLECTION 01</span><h3>What do you want to make?</h3><p>Explore {MODEL_LIBRARY.length} printable starting points, with more accessory types planned.</p></div>
            <button type="button" onClick={randomizeGallery} disabled={!filteredGalleryModels.length} aria-label={galleryTag === "all" ? "Show random models" : `Show random ${TAG_LABELS[galleryTag].toLowerCase()} models`}><i aria-hidden="true">↝</i> Random pick</button>
          </div>
          <label className="gallery-search" htmlFor="asset-search">
            <span>SEARCH THE LIBRARY</span>
            <div><i aria-hidden="true">⌕</i><input id="asset-search" type="search" value={galleryQuery} onChange={(event) => { setGalleryQuery(event.target.value); setGalleryOrder([]); }} placeholder="Try cactus, flower, animal, Christmas…" autoComplete="off" /></div>
          </label>
          <div className="gallery-tags" role="group" aria-label="Filter models by tag">
            <button type="button" className={galleryTag === "all" ? "active" : ""} onClick={() => chooseGalleryTag("all")} aria-pressed={galleryTag === "all"}><span>All</span><b>{MODEL_LIBRARY.length}</b></button>
            {MODEL_TAGS.map((tag) => (
              <button type="button" key={tag} className={galleryTag === tag ? "active" : ""} onClick={() => chooseGalleryTag(tag)} aria-pressed={galleryTag === tag}><span>{TAG_LABELS[tag]}</span><b>{MODEL_LIBRARY.filter((item) => item.tags.includes(tag)).length}</b></button>
            ))}
          </div>
          <div className="gallery-result-note"><span>{galleryQuery ? `Results for “${galleryQuery}”` : galleryTag === "all" ? "All printable assets" : TAG_LABELS[galleryTag]}</span><b>{filteredGalleryModels.length ? `Showing ${galleryModelIds.length} of ${filteredGalleryModels.length}` : "No matching assets yet"}</b></div>
        </div>
        <div className="gallery-models">
          {galleryModelIds.map((modelId) => {
            const item = MODEL_LIBRARY.find((model) => model.id === modelId)!;
            return (
              <article key={modelId}>
                <div className="gallery-live"><LiveModel modelId={modelId} /></div>
                <div className="gallery-card-copy">
                  <div><span>{item.number} · {item.style}</span><h3>{item.name}</h3><p>{item.subtitle}</p></div>
                  <a href={`/studio?model=${modelId}`} aria-label={`Open ${item.name} in Studio`}><span>Open</span>↗</a>
                </div>
              </article>
            );
          })}
          {!galleryModelIds.length && <div className="gallery-empty"><span>NO MATCH YET</span><h3>Try a broader idea.</h3><p>Clear the search or choose another category. The library is designed to keep growing.</p><button type="button" onClick={() => { setGalleryQuery(""); setGalleryTag("all"); setGalleryOrder([]); }}>Show all assets</button></div>}
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
          <span className="section-kicker">BUILT TO GROW IN THE OPEN</span>
          <h2>A shared workshop for LetPot makers.</h2>
          <p>LetPot Maker is being organized for open-source collaboration: clear geometry rules, reproducible assets, and a focused contribution path for growers, 3D-printing beginners, and model designers.</p>
          <ul>
            <li>Print an asset and share fit notes, material choices, and photos.</li>
            <li>Remix existing models through safe parameters or contribute a new design.</li>
            <li>Help expand beyond pod toppers into useful LetPot accessories.</li>
          </ul>
        </div>
        <aside className="local-privacy-card">
          <span>THE MAKER ROADMAP</span>
          <h3>Start focused. Expand carefully.</h3>
          <p>The current release proves the library, customization, and export loop. New accessory families can plug into the same experience as their dimensions and safety rules are validated.</p>
          <div><i>01</i> Now · printable pod collection</div>
          <div><i>02</i> Next · community asset format</div>
          <div><i>03</i> Later · broader accessory families</div>
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
        <div><a href="#gallery">Library</a><a href="#workflow">Build guide</a><a href="/pod-styler">Pod Styler</a><a href="/studio">Maker Studio</a></div>
      </footer>
    </main>
  );
}
