# LetPot Workshop Light design system

LetPot Maker uses one light, workshop-oriented visual language across the public landing page, Maker Studio, and Pod Styler. A neutral canvas keeps printable geometry legible; LetPot green is reserved for identity, primary actions, selection, focus, and verified states.

## Type contract

| Role | Token | Rule |
| --- | --- | --- |
| Metadata | `--text-xs` / 12 px | Counts, overlines, compact dimensions; never long copy |
| Controls | `--text-sm` / 14 px | Buttons, labels, tabs, filters, helper copy |
| Body | `--text-md` / 16 px | Explanations, landing copy, input text |
| Section lead | `--text-lg` / 20 px | Compact headings and prominent values |

Long copy uses `--leading-copy` (1.65). Do not introduce text below 12 px. Uppercase metadata should use moderate tracking (at most `.12em`) and retain 4.5:1 contrast on its final surface.

## Surfaces and color

- `--canvas` is the clean page/3D background.
- `--chrome`, `--card`, and `--raised` build the interface hierarchy.
- `--fg`, `--fg-secondary`, and `--fg-muted` are the only default text tiers.
- `--primary-600` is the normal primary action; `--primary-700/800` are hover and high-emphasis states.
- Error and review colors are reserved for their semantic states, not decoration.

All new colors must be expressed through a shared semantic token unless they belong to rendered 3D materials or a documented status state.

## Shape, spacing, and elevation

Use the 4/8/12/16/24/32 spacing steps. `--radius-sm`, `--radius-md`, and `--radius-lg` cover controls, cards, and large panels; `--radius-pill` is only for filters, counts, and compact status. Use `--shadow-sm` for selected controls, `--shadow-md` for popovers, and `--shadow-lg` for modal surfaces.

## Interaction contract

- Primary touch targets are at least 44 × 44 CSS pixels.
- Every keyboard-focusable control uses the shared `--focus-ring` with a visible offset.
- A modal traps focus, supports Escape when cancellation is safe, and restores focus to its trigger.
- Full-screen tools expose a skip link and must remain operable at 200% zoom.
- Dense desktop layouts may rearrange content, but may not reduce the type scale.

## Responsive contract

The public page reflows as a document. Canvas-heavy tools use a preview-first mobile layout with explicit Library and Adjust surfaces; they must not compress the three-column desktop workspace into unreadable columns. Horizontal collections must expose a visible continuation cue or scrollbar.
