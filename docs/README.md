# Documentation

This directory contains maintained technical documentation for LetPot Maker:

- [Architecture](architecture.md) explains the application surfaces, geometry pipeline, generated assets, and runtime boundaries.
- [AI generation](ai-generation.md) documents bounded recipe generation, the optional local Tripo bridge, BYOK storage, billing, and the prompt-injection boundary.
- [Docker deployment](docker-deployment.md) covers the private-by-default container setup and operational controls.
- [Search visibility](seo.md) documents canonical URL configuration, crawler endpoints, structured data, and the post-deployment search-engine checklist.
- [Design system](design-system.md) defines the shared type, color, spacing, interaction, and responsive contracts.

Keep durable product and engineering decisions here. Time-bound research notes, vendor comparisons, experiments, and implementation scratchpads should stay in issues or discussions instead of the release repository.

When behavior, commands, environment variables, mechanical interfaces, or deployment assumptions change, update the relevant document in the same pull request.
