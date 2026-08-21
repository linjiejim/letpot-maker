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

`components/Studio.tsx` owns the interactive authoring flow. It selects a model definition, maintains parameter and color state, renders the assembly, stores optional AI recipes in browser storage, and packages exports on demand.

### Pod Styler

`components/PodStyler.tsx` is a device-layout sandbox. It places low-poly collection assets on measured pod positions for four current layouts. It is a planning preview, not engineering validation of the device itself.

## Geometry source of truth

`lib/model-factory.ts` is the authoritative model catalog and geometry source. A definition contains identity, tags, defaults, bounded parameters, parts, and manufacturing guidance. `createModel()` turns those inputs into the Three.js assembly used everywhere else.

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

`app/api/ai-generate/route.ts` sends a short text prompt to a provider-neutral OpenAI chat-completions endpoint configured entirely through environment variables. `lib/ai-prompt-security.ts` normalizes and screens direct instruction-control attempts, then serializes accepted input as an untrusted JSON data record. The server prompt restricts the response to existing template families and bounded numeric parameters. `lib/ai-design.ts` validates and normalizes the returned recipe again before the Studio uses it.

The endpoint returns a recipe, not arbitrary executable code or a mesh. Created recipes are stored only in the browser today.

See `docs/ai-generation.md` for the exact shape boundary, provider configuration, and prompt-injection threat boundary.

## Runtime and deployment

`vite.config.ts` uses Vinext directly. `next.config.mjs` selects standalone output, and the production build emits `dist/standalone/server.js` together with only the runtime dependencies and public assets it needs.

`Dockerfile` builds that standalone output in a Node 22 build stage and copies it into a smaller non-root runtime image. `compose.yaml` adds restart behavior, a read-only filesystem, a temporary `/tmp`, private loopback binding, and an HTTP health check.

The AI route reads provider settings from the container environment. There is no database, user-account layer, persistent server volume, Sites integration, Cloudflare binding, or Worker entry point.
