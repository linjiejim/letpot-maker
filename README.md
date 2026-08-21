# LetPot Maker

LetPot Maker is an independent, open-source library and browser studio for designing, previewing, and exporting printable 3D accessories for LetPot indoor gardens.

The project started from a simple gap: small hydroponic accessories are easy to imagine but hard to share reliably when fit dimensions, print orientation, and source geometry are undocumented. LetPot Maker keeps those constraints in code so a design can be previewed, remixed, regenerated, and checked from the same source of truth.

![LetPot Maker library and browser studio](public/og-maker.png)

> LetPot Maker is a community project, not an official LetPot product. LetPot is a trademark of its respective owner. The included models are prototypes and are not certified replacement or safety-critical parts.

## Current capabilities

- Browse and filter 34 checked-in printable designs.
- Preview the same parametric geometry used by the export pipeline.
- Customize dimensions, model-specific details, colors, and surface style.
- Export watertight STL parts, OBJ assemblies, manifests, and Bambu Studio 3MF projects.
- Arrange low-poly accessories across four LetPot device layouts in Pod Styler.
- Turn a text idea into a constrained model recipe through an optional, provider-neutral AI endpoint.
- Validate model parameters, manifold geometry, printer-bed placement, and production routes.

The AI feature selects and configures an existing geometry family; it does not generate arbitrary meshes or executable code. The core library, Studio, previews, and exports work without an AI provider.

## Technology

| Area | Stack |
| --- | --- |
| Application | React 19, TypeScript, Vinext, Vite |
| 3D preview | Three.js |
| Solid geometry | Manifold |
| Export packaging | JSZip |
| Runtime | Node.js 22 |
| Deployment | Docker and Docker Compose |
| Quality gates | ESLint, TypeScript, Node test runner, geometry validators |

The application is intentionally client-heavy. Model construction and file packaging happen in the browser; the server handles rendered routes, health checks, and the optional AI recipe request. There is no database, account system, or server-side model storage.

## Getting started

Requirements:

- Node.js 22.13 or newer
- npm 10 or newer

```bash
git clone <repository-url>
cd letpot-maker
npm ci
npm run dev
```

Open the URL printed by the development server. No environment variables are required for the standard maker workflow.

### Optional AI recipes

Create a local environment file:

```bash
cp .env.example .env.local
```

Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` for a provider that implements the standard OpenAI chat-completions messages format. Keep real credentials out of Git. See [AI generation](docs/ai-generation.md) for the supported shape boundary and security controls.

## Development workflow

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Produce the standalone application build |
| `npm run check` | Run ESLint and TypeScript checks |
| `npm test` | Build, test rendered routes, and run all geometry validators |
| `npm run ci` | Run every check used by continuous integration |
| `npm run docker:deploy` | Build and health-check a local Compose deployment |
| `npm run docker:deploy-image` | Pull and deploy an immutable published image |
| `npm run generate:assets` | Regenerate the checked-in STL, OBJ, manifest, and stack-test assets |
| `npm run validate:assets` | Validate generated STL topology and adapter orientation |
| `npm run validate:parameters` | Exercise supported parameter boundaries |
| `npm run validate:ai` | Validate constrained AI recipes and printable output |
| `npm run validate:ai-security` | Test prompt screening and output allowlisting |
| `npm run validate:bambu` | Validate A1 mini and P1S 3MF packages |

Run `npm run ci` before opening a pull request. Generated model files must be rebuilt from `lib/model-factory.ts`; do not hand-edit STL, OBJ, 3MF, or generated `model-spec.json` files.

## Repository layout

```text
app/                  Routes, metadata, and API handlers
components/           Library, Maker Studio, and Pod Styler interfaces
lib/                  Model definitions, solidification, AI recipes, and 3MF output
public/models/         Generated printable assets and manifests
scripts/               Asset generation, validation, and deployment tools
tests/                 Production-route smoke tests
docs/                  Maintained architecture and operations documentation
.github/workflows/     Continuous integration
```

The geometry flow is:

```text
bounded parameters -> Three.js assembly -> Manifold solidification
                                      -> browser preview
                                      -> STL / OBJ / 3MF / manifest exports
```

See the [documentation index](docs/README.md) for architecture, AI integration, and Docker deployment details. Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing a shared mechanical interface or adding a model.

## Printable interface and safety

The initial collection uses a locked pod adapter: a Ø33 mm lower section, Ø41 mm upper band, 5.6 mm total height, and an R3.96 mm double-ended hex connector pin. The browser and validators treat these values as compatibility contracts.

Automated checks can verify topology and expected dimensions, but they cannot certify real-world fit, material suitability, food contact, heat resistance, electrical safety, or load-bearing performance. Calibrate the printer and test the adapter on the actual device before printing a full set.

## Docker deployment

The supplied Compose configuration binds to `127.0.0.1:3000` by default so the service can sit behind a private reverse proxy, VPN, or SSH tunnel.

```bash
cp .env.example .env
npm run docker:deploy
```

See [Docker deployment](docs/docker-deployment.md) before exposing the service to a network. The reverse proxy should provide TLS, authentication or access policy where needed, and request limits for AI-enabled deployments.

GitHub Actions verifies every change and publishes a Linux AMD64 image to GitHub Container Registry after a successful `main` build. Image publication uses the repository-scoped `GITHUB_TOKEN`; it requires no custom Actions secret. GHCR package visibility is managed separately from repository visibility; see the deployment guide before configuring anonymous pulls.

## Contributing and license

Issues and pull requests are welcome. Please keep changes focused, include test-print evidence when it is available, and identify the license of any third-party media or geometry.

The project is distributed under the [MIT License](LICENSE). Contributions must be original or have redistribution terms compatible with the repository. Security concerns should follow [SECURITY.md](SECURITY.md).
