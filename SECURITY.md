# Security policy

## Reporting a vulnerability

Please use the hosting repository's private security-reporting channel when it is available. Do not publish secrets, exploit details, or user data in a public issue.

Include the affected route or file, expected impact, reproduction steps, and any suggested mitigation. Reports about unsafe model geometry should also include the exported format and the parameter values used.

## Supported version

Until the first public release, security fixes are made on the default branch only.

## Scope notes

- The optional AI endpoint must never expose provider keys to the browser or return executable code.
- Exported files are untrusted inputs to external slicers and should stay within documented formats and size limits.
- Physical print safety is separate from application security. Automated manifold checks do not certify heat, water, food-contact, electrical, or load-bearing use.
