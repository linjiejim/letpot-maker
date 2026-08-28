# AI printable-idea generation

## What it does

`AI Generate` offers two distinct paths. `Bounded shape` asks the configured application provider for declarative JSON geometry, never executable code or an opaque mesh. `Direct mesh · Tripo` uses Tripo's official v3 browser SDK with a key entered by the current user, downloads an untextured GLB, and passes it into the same Three.js and Manifold export pipeline.

It has two modes:

1. `library` can select any of the 34 checked-in models. The six original parametric families retain their full bounded controls:

| Family | Variable shape controls |
| --- | --- |
| Little Sprout | 2–5 leaf pairs, leaf size/spread, stem thickness |
| Alpine Pine | 3–5 crown tiers, crown fullness, trunk thickness, tip roundness |
| Round Cactus | 1–4 arms, body plumpness, arm rise, 6–10 ribs |
| Forest Cap | cap diameter/dome, stem thickness, 8–16 gills |
| Tomato Vine | 1–5 fruit, fruit size, branch spread, 3–7 leaves |
| Bamboo Stalks | 3–5 canes, 3–6 nodes, cane thickness, 1–5 leaf clusters |

   The remaining library models stay at their verified nominal dimensions because their geometry was not designed for arbitrary non-uniform scaling.

2. `sculpture` can compose a new printable subject from fourteen allowlisted closed-solid nodes: ellipsoid, rounded box, cylinder, cone, capsule, torus, pitched roof, front-facing disc, half-disc, dome, organic drop, leaf, star and heart. Nodes support bounded position, size and rotation, three semantic colors, mirror symmetry, radial repetition around the vertical axis or visible face, additive geometry and up to five shallow decorative cutters. Each additive node attaches to the locked core or an earlier node, and the compiler inserts a printable fusion bridge from inside the parent solid. Elevated nodes mistakenly aimed at the core are repaired to the nearest earlier solid so details do not turn into visible support spokes.

Every sculpture recipe is normalized to a 25–100 mm topper height, 20–80 mm topper width, no more than 24 declared nodes or 64 geometry nodes after symmetry expansion, no more than two torus nodes, normalized coordinates and feature sizes, three hex colors, and a surface-style flag. Unsupported kinds and fields are discarded, out-of-range numbers are clamped, duplicate IDs are repaired, forward or unknown attachment references are repaired to a safe earlier parent, clearly floating children are pulled back into their parent, and arbitrary code is never evaluated.

## Product boundary

- It can invent new low-poly topology by composing bounded primitives. It is strongest for iconic houses, toys, characters, fruit, flowers, animals and simple product silhouettes. Front-facing discs and face-radial repetition specifically cover sliced fruit, seed clusters, portholes and repeated facial details without requiring dozens of declared nodes.
- The bounded path does not synthesize a free-form neural mesh. The separate Tripo path can create richer topology, but imported neural geometry is untrusted and does not inherit the bounded path's topology guarantees.
- It currently makes small pod toppers around the locked LetPot adapter. It does not generate load-bearing mounts, replacement parts, enclosures, organizers, or device-specific mechanisms.
- The adapter and connection geometry are always code-owned. The AI cannot change their dimensions. Studio offers a flush detachable mode, where the hex pin enters a blind socket embedded directly inside the subject, and a one-piece mode, where a hidden internal core fuses the adapter and topper into one exported manifold.
- The three sculpture colors survive boolean solidification as face materials in Bambu 3MF. STL remains single-color because STL has no material model.
- Export rejects disconnected or invalid solids, and automated fixtures cover houses, a character, complex fruit, a many-limbed animal and a vehicle. These checks do not prove real-world fit, material suitability, food-contact safety, strength, or support-free printing on every printer.
- Bounded prompts are 3–280 normalized characters and recipes use localStorage. Tripo prompts are 3–640 characters and downloaded GLBs use IndexedDB. There are no application accounts, server history, or community publishing.

## Direct Tripo mesh path

The direct path uses the official `@vastai/tripo-sdk` against `https://openapi.tripo3d.ai/v3`. It submits `text-to-model` with either Tripo v3.1 or P1, disables textures and PBR, requests at most 10,000 faces, polls the task, and downloads the short-lived model URL immediately. The UI limits cached files to 40 MB and parsed meshes to 25,000 faces; IndexedDB retains up to 12 recent GLBs.

Privacy and credential flow are deliberately narrow:

1. The user enters a `tsk_…` key into a password field. By default it remains only in React memory for the open dialog and is cleared on success or close. An explicit `Remember Key in this browser` checkbox can instead keep it in this origin's localStorage until the user turns the option off.
2. The official SDK sends the key and printable prompt directly from the browser to Tripo. No request touches `/api/ai-generate` or another LetPot Maker server route.
3. The expiring result URL is downloaded immediately, parsed as GLB, and stored in IndexedDB with task/model metadata. The remote URL is never persisted, and the Key is never stored with the mesh.
4. Reloading a creation reads the GLB from IndexedDB. Deleting it removes that local binary record.

This is BYOK, not secret isolation: browser JavaScript, extensions, developer tools, and Tripo necessarily see the key while a request runs. Optional localStorage persistence is not encrypted. Tripo's general guidance recommends backend-held keys. Users choosing direct mode should create a dedicated revocable key, apply a hard credit cap, avoid reusing a production key, and leave `Remember` off on shared devices. The Key is sent to Tripo for authentication but is never uploaded to, proxied through, logged by, or stored on the LetPot Maker server.

Current Tripo API billing charges the selected model's base generation plus any requested texture tier. This flow explicitly uses `texture: false` and `pbr: false`, so one v3.1 generation uses 10 credits and one P1 generation uses 30 credits. The unused texture surcharges are +10 credits for standard, +20 for detailed, and +30 for extreme. Tripo freezes credits when a task starts, deducts them on success, and refunds failed or expired tasks according to its [current billing documentation](https://platform.tripo3d.ai/docs/billing). Pricing is provider-controlled and can change; the linked Tripo page is authoritative.

The neural mesh controls only the topper silhouette. `lib/model-factory.ts` rescales it into the 20–80 × 25–100 mm envelope and adds a code-owned transition, connector core, blind hex socket, detachable double-ended pin, and locked Ø33/Ø41 adapter. Integrated mode instead adds the same hidden fused core used by standard components. Export still requires one connected, closed Manifold solid; a visually plausible Tripo result can therefore be rejected until the prompt is simplified or the mesh is repaired.

## Provider configuration

The page intentionally does not identify the configured model. The server uses the standard OpenAI chat-completions `messages` format and reads the API key, base URL, and model ID entirely from environment variables. Forks can choose any provider that supports this interface:

```dotenv
AI_API_KEY=your_minimax_key
AI_BASE_URL=https://api.minimaxi.com/v1
AI_MODEL=MiniMax-M3
AI_DISABLE_THINKING=true
```

Use `https://api.minimax.io/v1` for international MiniMax keys. MiniMax coding-plan keys issued in China can require `https://api.minimaxi.com/v1`; verify the host documented for the key being used.

For another compatible endpoint, only the environment changes:

```dotenv
AI_API_KEY=your_kimi_key
AI_BASE_URL=https://api.kimi.com/coding/v1
AI_MODEL=k3-256k
```

`AI_BASE_URL` may be either a `/v1`-style base URL or the full `/chat/completions` URL. The UI and API response do not expose the selected model.

`AI_DISABLE_THINKING=true` sends MiniMax's optional `thinking: { type: "disabled" }` request field so the constrained recipe uses the output budget for JSON rather than hidden reasoning. Leave it false for providers that do not support that field.

Public deployments enforce an in-process quota by the right-most reverse-proxy client address: five accepted generations per ten minutes and at most two simultaneous provider requests. Override these conservative defaults with `AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_MS`, and `AI_MAX_CONCURRENCY`. The provider account should still have a hard spend/quota cap; application limits are protection against casual abuse, not billing isolation across multiple replicas.

This workload is bounded JSON geometry generation, not neural mesh inference. A small capable language model is sufficient and should remain much cheaper than a commercial text-to-mesh call. Evaluate providers with the checked-in subject fixtures and compare valid-program rate, recognizable silhouette, connected-solid rate, p50/p95 latency, rejection rate, output tokens and cost before selecting a production model.

## Prompt-injection boundary

The route uses defense in depth:

1. User input is normalized with NFKC, invisible formatting is removed, and explicit English/Chinese role-changing, prompt-stealing, jailbreak, and command-execution patterns are rejected before an API call.
2. The remaining idea is serialized as an untrusted JSON data record, separate from the system instructions.
3. The model has no tools, database, filesystem, browser, or access to the API key value. It can only return text.
4. The response must contain a JSON recipe. Application code allowlists model IDs, node kinds, operations, attachment order, counts, shape keys, types, numeric ranges, colors, and text lengths before use.
5. Provider response size and request time are bounded, provider errors are not echoed to the browser, and responses are marked `no-store`.
6. The compiled shape still passes through Manifold. Export stops if the result is not exactly one connected, watertight topper solid.
7. Per-client request windows and a global concurrency ceiling limit anonymous quota consumption. Runtime state is intentionally ephemeral and resets when the single production container restarts.

Prompt-injection detection is not a mathematical guarantee. The durable security boundary is least privilege plus deterministic output validation: even a disobedient model cannot add executable code or an unsupported geometry path. Continue adversarial regression testing when prompts, providers, tools, persistence, or publishing capabilities change. For multiple application replicas or stricter abuse controls, move the counter to a shared rate-limit service or enforce an additional reverse-proxy limit.
