# LetPot Maker architecture

## Overview

LetPot Maker is a client-heavy React application packaged as a standalone Node.js service. It keeps the current maker workflow local: browse a checked-in collection, construct Three.js geometry in the browser, customize bounded parameters, and export files without uploading the model to a server.

```text
Model definitions + parameters
          │
          ▼
   Three.js assembly ───────────────► live homepage / Studio / Pod Styler
          │
          ▼
 Manifold solidification
          │
          ├────────► STL parts
          ├────────► OBJ assembly
          ├────────► Bambu 3MF project
          └────────► JSON manifest
```

## Main surfaces

### Homepage

`components/LandingPage.tsx` is the product entry point. It renders live library assets, supports text and tag filtering, and routes a selected asset into the Studio through a `model` query parameter.

### Maker Studio

`components/Studio.tsx` owns the interactive authoring flow. It selects a model definition, maintains parameter and color state, renders the assembly, stores optional AI recipes in localStorage and direct Tripo GLBs in IndexedDB, and packages exports on demand.

### Pod Styler

`components/PodStyler.tsx` is a device-layout sandbox. It places low-poly collection assets on measured pod positions for four current layouts. It is a planning preview, not engineering validation of the device itself.

## Geometry source of truth

`lib/model-factory.ts` is the authoritative model catalog and geometry source. A definition contains identity, tags, defaults, bounded parameters, parts, and manufacturing guidance. `createModel()` turns those inputs into the Three.js assembly used everywhere else. Its shared connection layer supports a flush detachable pin/socket embedded inside the subject and an optional one-piece adapter/topper union with a hidden internal core.

The browser preview is not exported directly as overlapping display meshes. `lib/solidify.ts` converts meshes through Manifold boolean operations so each exported part is a connected watertight solid.

`lib/three-mf.ts` arranges solid parts for the supported Bambu printer profiles and writes standards-based 3MF packages.

## Generated assets

`scripts/generate-assets.ts` rebuilds `public/models/` from the model factory. The directory is checked in so people can download known outputs without running the generation toolchain.

Validation scripts enforce:

- no open or non-manifold STL edges;
- one connected component per printable part;
- the locked adapter geometry and print orientation;
- valid geometry across supported parameter ranges;
- valid A1 mini and P1S 3MF structure and plate placement;
- constrained AI recipes that still produce printable solids.

## Optional AI path

`app/api/ai-generate/route.ts` sends a short text prompt to a provider-neutral OpenAI chat-completions endpoint configured entirely through environment variables. `lib/ai-prompt-security.ts` normalizes and screens direct instruction-control attempts, then serializes accepted input as an untrusted JSON data record. The server prompt can choose any checked-in library model or return a bounded declarative shape program. `lib/ai-shape-program.ts` allowlists and normalizes geometry nodes; `lib/ai-design.ts` validates the surrounding recipe before the Studio uses it. `lib/model-factory.ts` compiles accepted nodes into connected Three.js solids around the locked adapter and selected connection mode. Semantic node colors, plus the integrated adapter color, are carried through Manifold and emitted as 3MF face materials.

The endpoint returns a recipe, not arbitrary executable code or an opaque mesh. Created recipes are stored only in the browser.

The independent direct-mesh path in `lib/tripo-mesh.ts` uses a user-entered Tripo key through `scripts/tripo-local-bridge.ts`, a helper bound only to `127.0.0.1`. The helper uses Tripo's v3 SDK to submit and poll the task, then downloads the expiring GLB without involving a LetPot Maker application-server route. The browser validates the GLB's basic size and triangle bounds and stores it through `lib/local-mesh-cache.ts`. The key remains in dialog memory by default; explicit browser-local persistence uses a dedicated localStorage entry and never stores the key with the mesh. The imported silhouette remains untrusted; `lib/model-factory.ts` alone owns the transition, socket, connector and adapter, and `lib/solidify.ts` rejects exports that are not one connected closed solid.

See `docs/ai-generation.md` for the exact shape boundary, provider configuration, and prompt-injection threat boundary.

## Runtime and deployment

`vite.config.ts` uses Vinext directly. `next.config.mjs` selects standalone output, and the production build emits `dist/standalone/server.js` together with only the runtime dependencies and public assets it needs.

`Dockerfile` builds that standalone output in a Node 22 build stage and copies it into a smaller non-root runtime image. `compose.yaml` adds restart behavior, a read-only filesystem, a temporary `/tmp`, private loopback binding, and an HTTP health check.

The bounded-AI route reads provider settings from the container environment. The loopback Tripo helper is a separate opt-in device process, not part of the deployed application container; hosted origins must be explicitly allowlisted with `TRIPO_BRIDGE_ORIGINS`. Direct-mesh binaries live in each user's IndexedDB. There is no server database, user-account layer, persistent server volume, Sites integration, Cloudflare binding, or Worker entry point.
