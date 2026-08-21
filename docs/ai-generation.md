# AI printable-idea generation

## What it does

`Generate a printable idea` is a constrained recipe generator, not text-to-mesh. The configured language model interprets a short description, selects one existing geometry family, and proposes bounded parameters. The browser then builds the model through the same Three.js and Manifold pipeline used by manual Studio edits.

The AI-enabled families are:

| Family | Variable shape controls |
| --- | --- |
| Little Sprout | 2–5 leaf pairs, leaf size/spread, stem thickness |
| Alpine Pine | 3–5 crown tiers, crown fullness, trunk thickness, tip roundness |
| Round Cactus | 1–4 arms, body plumpness, arm rise, 6–10 ribs |
| Forest Cap | cap diameter/dome, stem thickness, 8–16 gills |
| Tomato Vine | 1–5 fruit, fruit size, branch spread, 3–7 leaves |
| Bamboo Stalks | 3–5 canes, 3–6 nodes, cane thickness, 1–5 leaf clusters |

Every recipe is normalized to a 25–50 mm topper height, 20–40 mm topper width, two hex colors, a surface-style flag, and only the parameter keys defined for the selected family. The six documented family-name aliases are normalized to their internal IDs; all other template IDs and unsupported keys are rejected or discarded, and out-of-range numbers are snapped back into the supported range.

## Product boundary

- It can remix the six silhouettes above; it cannot invent a seventh topology or generate arbitrary mesh/code.
- A prompt such as “a friendly octopus” can only be approximated by the closest supported family. It cannot create true tentacles.
- It currently makes small pod toppers around the locked LetPot adapter. It does not generate load-bearing mounts, replacement parts, enclosures, organizers, or device-specific mechanisms.
- Automated checks cover connected manifold geometry and export construction. They do not prove real-world fit, material suitability, food-contact safety, strength, or support-free printing on every printer.
- The prompt is 3–280 normalized characters. Recipes are saved in browser storage only; there are no accounts, server history, or community publishing.

## Provider configuration

The page intentionally does not identify the configured model. The server uses the standard OpenAI chat-completions `messages` format and reads the API key, base URL, and model ID entirely from environment variables. Forks can choose any provider that supports this interface:

```dotenv
AI_API_KEY=your_minimax_key
AI_BASE_URL=https://api.minimaxi.com/v1
AI_MODEL=MiniMax-M3
```

Use `https://api.minimax.io/v1` for international MiniMax keys. MiniMax coding-plan keys issued in China can require `https://api.minimaxi.com/v1`; verify the host documented for the key being used.

For another compatible endpoint, only the environment changes:

```dotenv
AI_API_KEY=your_kimi_key
AI_BASE_URL=https://api.kimi.com/coding/v1
AI_MODEL=k3-256k
```

`AI_BASE_URL` may be either a `/v1`-style base URL or the full `/chat/completions` URL. The UI and API response do not expose the selected model.

This workload is small constrained classification and parameter extraction. Very large context windows, multimodality, coding benchmarks, and agent tooling should not materially change the shapes that can be produced because geometry remains code-defined. Evaluate providers with a fixed prompt set and compare valid-recipe rate, family-selection quality, p50/p95 latency, rejection rate, and cost before selecting a production model.

## Prompt-injection boundary

The route uses defense in depth:

1. User input is normalized with NFKC, invisible formatting is removed, and explicit English/Chinese role-changing, prompt-stealing, jailbreak, and command-execution patterns are rejected before an API call.
2. The remaining idea is serialized as an untrusted JSON data record, separate from the system instructions.
3. The model has no tools, database, filesystem, browser, or access to the API key value. It can only return text.
4. The response must contain a JSON recipe. Application code allowlists the template, shape keys, types, numeric ranges, colors, and text lengths before use.
5. Provider response size and request time are bounded, provider errors are not echoed to the browser, and responses are marked `no-store`.

Prompt-injection detection is not a mathematical guarantee. The durable security boundary is least privilege plus deterministic output validation: even a disobedient model cannot add executable code or an unsupported geometry path. Continue adversarial regression testing when prompts, providers, tools, persistence, or publishing capabilities change. Public-facing deployments should also add request rate limits at the reverse proxy to protect API quota.
