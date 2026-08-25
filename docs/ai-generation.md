# AI printable-idea generation

## What it does

`Generate a printable idea` is a bounded text-to-3D system. The configured language model returns declarative JSON geometry, never executable code or an opaque mesh. The browser compiles that geometry through the same Three.js and Manifold pipeline used by manual Studio edits.

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

Every sculpture recipe is normalized to a 25–50 mm topper height, 20–40 mm topper width, no more than 24 declared nodes or 64 geometry nodes after symmetry expansion, no more than two torus nodes, normalized coordinates and feature sizes, three hex colors, and a surface-style flag. Unsupported kinds and fields are discarded, out-of-range numbers are clamped, duplicate IDs are repaired, forward or unknown attachment references are repaired to a safe earlier parent, clearly floating children are pulled back into their parent, and arbitrary code is never evaluated.

## Product boundary

- It can invent new low-poly topology by composing bounded primitives. It is strongest for iconic houses, toys, characters, fruit, flowers, animals and simple product silhouettes. Front-facing discs and face-radial repetition specifically cover sliced fruit, seed clusters, portholes and repeated facial details without requiring dozens of declared nodes.
- It does not synthesize a free-form neural mesh. Highly organic anatomy, realistic faces, cloth and intricate surface texture remain outside this lightweight path.
- It currently makes small pod toppers around the locked LetPot adapter. It does not generate load-bearing mounts, replacement parts, enclosures, organizers, or device-specific mechanisms.
- The adapter and connection geometry are always code-owned. The AI cannot change their dimensions. Studio offers a flush detachable mode, where the hex pin enters a blind socket embedded directly inside the subject, and a one-piece mode, where a hidden internal core fuses the adapter and topper into one exported manifold.
- The three sculpture colors survive boolean solidification as face materials in Bambu 3MF. STL remains single-color because STL has no material model.
- Export rejects disconnected or invalid solids, and automated fixtures cover houses, a character, complex fruit, a many-limbed animal and a vehicle. These checks do not prove real-world fit, material suitability, food-contact safety, strength, or support-free printing on every printer.
- The prompt is 3–280 normalized characters. Recipes are saved in browser storage only; there are no accounts, server history, or community publishing.

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
