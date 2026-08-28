# AI printable-idea generation

## What it does

`AI Generate` offers two distinct paths. `Bounded shape` asks the configured application provider for declarative JSON geometry, never executable code or an opaque mesh. `Direct mesh · Tripo` uses Tripo's official v3 SDK through a loopback-only helper on the user's device, downloads an untextured GLB, and passes it into the same Three.js and Manifold export pipeline.

It has two modes:

1. `library` can select any of the 35 checked-in models. The six original parametric families retain their full bounded controls:

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
- Bounded prompts are 3–280 normalized characters and recipes use localStorage. Tripo prompts are 3–640 characters and downloaded or explicitly imported GLBs use IndexedDB. There are no application accounts, server history, or community publishing.

## Device-local Tripo mesh path

Tripo's authenticated API does not currently accept the browser's CORS preflight, and Tripo's own quick start warns against exposing API Keys in client-side code. A standard web page therefore cannot make this BYOK request directly. The local path runs `npm run tripo:bridge`, binding a small helper only to `127.0.0.1:4318`; it accepts configured localhost origins (plus explicit `TRIPO_BRIDGE_ORIGINS`), stores nothing, and uses Node's environment-proxy support for devices that require `HTTP_PROXY` or `HTTPS_PROXY`.

The helper uses the official `@vastai/tripo-sdk` against the selected global (`https://openapi.tripo3d.ai/v3`) or China (`https://openapi.tripo3d.com/v3`) region. It submits `text-to-model` with either Tripo v3.1 or P1, disables textures and PBR, requests at most 10,000 faces, exposes sanitized task progress to the browser, and downloads the short-lived model URL immediately. The network-generation path limits parsed meshes to 25,000 faces. The explicit local-file importer accepts a reviewed GLB up to 40 MB and 100,000 faces; it never performs a network request. IndexedDB retains up to 12 recent GLBs across both sources.

Privacy and credential flow are deliberately narrow:

1. The user enters a `tsk_…` key into a password field. By default it remains only in React memory for the open dialog and is cleared on success or close. An explicit `Remember Key in this browser` checkbox can instead keep it in this origin's localStorage until the user turns the option off.
2. The browser sends the key and printable prompt only to the loopback helper on the same device. No request touches `/api/ai-generate` or another LetPot Maker application-server route.
3. The helper forwards the request to the selected Tripo region, retaining the Key only for the active request. It never writes Keys, prompts, task URLs, or meshes to disk and never logs them.
4. The expiring result URL is downloaded immediately by the helper, returned to the browser, parsed as GLB, and stored in IndexedDB with task/model metadata. The remote URL is never persisted, and the Key is never stored with the mesh.
5. Reloading a creation reads the GLB from IndexedDB. Deleting it removes that local binary record.

This is BYOK, not secret isolation: browser JavaScript, extensions, developer tools, the loopback helper, and Tripo necessarily see the key while a request runs. Optional localStorage persistence is not encrypted. Users should create a dedicated revocable key, apply a hard credit cap, avoid reusing a production key, and leave `Remember` off on shared devices. The Key is sent to Tripo for authentication but is never uploaded to, proxied through, logged by, or stored on the LetPot Maker application server.

Current Tripo API billing charges the selected model's base generation plus any requested texture tier. This flow explicitly uses `texture: false` and `pbr: false`, so one v3.1 generation uses 10 credits and one P1 generation uses 30 credits. The unused texture surcharges are +10 credits for standard, +20 for detailed, and +30 for extreme. Tripo freezes credits when a task starts, deducts them on success, and refunds failed or expired tasks according to its [current billing documentation](https://platform.tripo3d.ai/docs/billing). Pricing is provider-controlled and can change; the linked Tripo page is authoritative.

The neural mesh controls only the topper silhouette. `lib/model-factory.ts` centers it and constrains the artwork to the selected 20–80 × 25–100 mm maximum envelope, then adds a code-owned transition, connector core, blind hex socket, detachable double-ended pin, and locked Ø33/Ø41 adapter. The same envelope fitter also prevents stock and bounded-AI signature controls from pushing decorative geometry beyond the selected topper width or height. Integrated mode adds the standard hidden fused core. Export still requires one connected, closed Manifold solid; a visually plausible Tripo result can therefore be rejected until the prompt is simplified or the mesh is repaired.

### Local official-candidate workflow

Maintainers can generate reproducible review candidates without putting a Key, mesh or prompt into the application server. Set `TRIPO_API_KEY` only in the local process environment, then run `npm run tripo:candidates`; optionally restrict the batch with `npm run tripo:candidates -- --ids=santa,snowman`. The script uses the official v3 SDK with the pinned H3.1 snapshot, a fixed per-subject seed, 10,000-face limit, standard geometry, and texture, PBR, UV export, quad topology, smart low-poly and part generation explicitly disabled. It immediately downloads the expiring GLB and provider preview, validates the same standard socket assembly through Manifold, and writes only non-secret metadata into the gitignored `tools/tripo-review/public/candidates/` directory.

For a single-image reference, supply exactly one library candidate plus a local PNG, JPEG or WebP: `npm run tripo:candidates -- --ids=snowman --image=/absolute/path/snowman.png`. The image is uploaded directly from the local maintainer process to Tripo, never through the LetPot application server. Image-to-3D uses the same pinned no-texture geometry settings and currently costs 20 credits on H3.1. The ignored review manifest records the generation mode and a local copy of the input image, but never the API Key or an expiring provider URL.

Use `--face-limit=50000` for a higher-density comparison. The local maintainer reviewer and explicit local-file importer accept up to 100,000 faces, while the direct network-generation path retains its 25,000-face performance limit. A face-limit suffix keeps high-density GLBs alongside the 10k baseline instead of overwriting it.

At the expected 70 × 100 mm maximum, source face count should follow silhouette complexity rather than scale linearly with millimetres. Start at 25–35k faces for rounded characters, fruit and simple solids; 35–45k for fabric folds, pumpkins and layered herbs; and 45–60k for antlers, leaf edges or insect silhouettes. More than 60k is useful only when the reference actually contains printable fine geometry. A 0.4 mm nozzle and normal layer heights erase many smaller differences while extra triangles increase browser boolean time and file size.

Before promoting a neural candidate, normalize it into a browser-portable closed GLB with `npm run tripo:prepare -- /absolute/input.glb /absolute/output.glb`. This local, credit-free step fits the source to a 70 × 100 mm review envelope, uses Node Manifold to weld provider seams, requires one final connected closed solid, and exports a fresh GLB without the LetPot adapter. Its result line reports source faces → closed faces so topology repair is never mistaken for extra detail. Import that prepared file in Studio → Mine; Studio then applies the selected 20–80 × 25–100 mm envelope, standard socket and adapter before STL, OBJ or Bambu 3MF export.

Run `npm run tripo:review` and open `http://127.0.0.1:4320` to compare local candidates using the production `model-factory` adapter, envelope fitter and direct-socket fallback logic. This review surface is a local Vite tool and is not part of the deployed application. Generated files remain ignored until a maintainer deliberately promotes an approved mesh into the checked-in library.

### Bundled official meshes

Approved image-to-3D candidates live under `public/models/official/`, alongside a non-secret manifest and lightweight preview. Their source GLBs are repaired locally before promotion and contain only the subject: no API Key, provider URL, display tray, connector or adapter. Studio fetches these same-origin static assets on demand, verifies the recorded face count, then applies the selected width/height envelope and the code-owned direct blind socket, connector pin and fixed Ø33/Ø41 adapter. Bundled models therefore require no Tripo account or credits at runtime. The Christmas Friends collection ships Santa, Snowman, Christmas Tree and Reindeer in both detachable and one-piece export paths.

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
