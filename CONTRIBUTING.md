# Contributing to LetPot Maker

Thanks for helping make LetPot hardware more useful, personal, and repairable.

## Before you start

Open a discussion or issue before making a large change to:

- the shared adapter or connector dimensions;
- the asset manifest format;
- the export or solidification pipeline;
- a new device or accessory family;
- persistence, accounts, or community publishing.

These changes affect compatibility across the collection and need a clear migration path.

## Development setup

```bash
npm ci
npm run dev
```

Run the lightweight code checks while working:

```bash
npm run check
```

Run the complete suite before requesting review:

```bash
npm run ci
```

The complete suite runs lint and type checks, generates a production build, and validates rendered routes, supported model parameters, manifold assets, AI recipe constraints, and Bambu 3MF packages. The same command runs in GitHub Actions.

## Adding or changing an asset

1. Add the parametric definition and geometry to `lib/model-factory.ts`.
2. Keep model-specific controls inside bounded, named ranges.
3. Define detachable parts, manufacturing notes, minimum walls, and minimum features.
4. Run `npm run generate:assets` to rebuild `public/models/`.
5. Run `npm test`.
6. Test-print the shared adapter first, then the complete asset.
7. Include printer, nozzle, material, layer height, fit result, and photos in the review description when possible.

Generated files must come from the checked-in source pipeline. Do not hand-edit STL, OBJ, 3MF, or generated `model-spec.json` files.

## Pull request expectations

- Keep each change focused and explain the maker problem it solves.
- Include before-and-after visuals for UI changes.
- Document new environment variables in `.env.example`.
- Preserve keyboard access and reduced-motion behavior.
- Do not add secrets, generated caches, slicer profiles with personal data, or proprietary third-party models.
- Confirm that contributed geometry and media can be redistributed under the MIT License or clearly document their compatible third-party license.

## Physical safety

LetPot Maker assets are prototypes, not certified replacement parts. Contributions must call out heat, water, load, electrical, food-contact, or plant-contact assumptions when relevant. Never describe a model as safe based only on a browser preview or automated geometry check.

## Licensing note

By contributing code or original project assets, you agree that your contribution may be distributed under the project's [MIT License](LICENSE). Clearly identify third-party assets and their license terms in the pull request.
