# Security policy

## Reporting a vulnerability

Please use the hosting repository's private security-reporting channel when it is available. Do not publish secrets, exploit details, or user data in a public issue.

Include the affected route or file, expected impact, reproduction steps, and any suggested mitigation. Reports about unsafe model geometry should also include the exported format and the parameter values used.

## Supported version

Until the first public release, security fixes are made on the default branch only.

## Scope notes

- The optional bounded-AI endpoint must never expose its server provider key to the browser or return executable code.
- Direct Tripo mode is explicit BYOK: the user key must bypass the LetPot Maker application server and default to dialog-only memory. Because Tripo rejects browser CORS preflights, API traffic may pass only through the repository's helper bound to `127.0.0.1`; the helper must allow only localhost or explicitly configured origins and must not persist or log request data. The Key may be written only to the dedicated origin-local localStorage entry after the user explicitly enables `Remember Key in this browser`; opting out must remove that entry. It must never be written to IndexedDB, mesh records, exports, logs, URLs, analytics, or error messages.
- Exported files are untrusted inputs to external slicers and should stay within documented formats and size limits.
- Physical print safety is separate from application security. Automated manifold checks do not certify heat, water, food-contact, electrical, or load-bearing use.
