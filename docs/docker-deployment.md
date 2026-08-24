# Private Docker deployment

LetPot Maker ships as a standalone Node.js container. Docker Compose binds it to the server loopback interface by default, which keeps the app unreachable from the public network until a reverse proxy, VPN, or SSH tunnel is configured.

## Requirements

- Docker Engine 24 or newer
- Docker Compose v2
- A Linux server with at least 1 GB of free memory during the image build

## First deployment

Clone the repository on the server, then create the local environment file:

```bash
cp .env.example .env
```

Keep `LETPOT_BIND_ADDRESS=127.0.0.1` for a private reverse-proxy or VPN setup. For a public deployment, set `LETPOT_SITE_URL` to the final HTTPS origin so canonical and discovery URLs never depend on proxy headers. Set `AI_API_KEY` only if the optional AI Generate feature should be enabled.

Build and start the service:

```bash
npm run docker:deploy
```

The script waits for the container health check before returning. The default local endpoint is `http://127.0.0.1:3000` and the health endpoint is `http://127.0.0.1:3000/api/health`.

## Branch and artifact policy

`main` is the integration branch. Pushes and pull requests run lint, type checks, tests, geometry validation, and a production application build, but they do not publish an image or contact a server. Keeping the production build as a check catches bundler, SSR, and static-resource failures that lint and TypeScript cannot detect.

`release` is the protected production branch. It accepts changes through pull requests and requires the `verify` status check. Each new `release` commit runs the same quality gate, then:

1. Builds a Linux AMD64 image with provenance and an SBOM.
2. Publishes `sha-<full-commit-sha>` and `latest` to `ghcr.io/<owner>/letpot-maker`.
3. Pulls the exact registry digest with the workflow-scoped `GITHUB_TOKEN`.
4. Streams that image through a restricted deployment-only SSH key.
5. Starts and checks an isolated candidate container before changing production.
6. Replaces the loopback-only production container and rolls back if local health or canonical URL checks fail.
7. Verifies the public HTTPS, health, canonical, robots, sitemap, and manifest endpoints.
8. Creates generated GitHub Release notes after a successful deployment.

The GHCR image is the single deployment artifact. GitHub Releases contain the commit, image digest, production URL, and generated change summary, but no redundant zip or tar attachment. The server stores no GitHub PAT and does not need anonymous package access: the Actions runner authenticates with its short-lived repository token and transfers the verified image over SSH.

## Production Environment

The `production` GitHub Environment is restricted to the `release` branch and supplies these variables and secret:

| Name | Kind | Purpose |
| --- | --- | --- |
| `LETPOT_DEPLOY_HOST` | variable | Production server IP or hostname |
| `LETPOT_DEPLOY_PORT` | variable | SSH port |
| `LETPOT_DEPLOY_USER` | variable | Dedicated forced-command account |
| `LETPOT_DEPLOY_KNOWN_HOSTS` | variable | Pinned OpenSSH host-key line |
| `LETPOT_DEPLOY_SSH_KEY` | secret | Dedicated private deploy key |

The matching public key is installed with OpenSSH `restrict` and a forced command. It cannot request a shell, allocate a PTY, forward ports, or run arbitrary remote commands. The server-side command accepts only `deploy <full-commit-sha>`, verifies the image revision label and Linux AMD64 platform, and reads runtime settings from `/etc/letpot-maker/runtime.env`.

Runtime credentials such as `AI_API_KEY` remain server-only and must never be added to image build jobs or GitHub release notes.

## Manual immutable-image deployment

The automatic release pipeline is preferred for production. For an operator-managed server that can authenticate to GHCR, an immutable image can still be deployed through Compose:

```bash
export LETPOT_IMAGE=ghcr.io/<owner>/letpot-maker:sha-<full-commit-sha>
export LETPOT_BIND_ADDRESS=127.0.0.1
export LETPOT_PORT=4020
npm run docker:deploy-image
```

The prebuilt-image script pulls the selected tag, starts only this Compose service without building on the server, and waits for its health check. Do not reuse a personal root SSH key or broad personal access token for automation.

## Network exposure

The recommended layout is:

```text
Private network / HTTPS reverse proxy
                │
                ▼
       127.0.0.1:4020
                │
                ▼
       LetPot Maker container
```

Use the reverse proxy to provide TLS, authentication, request limits, and an access policy appropriate for the server. Production binds to `127.0.0.1:4020` behind Caddy. If the container must listen on every interface, set `LETPOT_BIND_ADDRESS=0.0.0.0` deliberately and protect the selected port with the server firewall.

## Operations

Follow logs:

```bash
npm run docker:logs
```

Rebuild and deploy an updated checkout:

```bash
git pull --ff-only
npm run docker:deploy
```

Stop the service:

```bash
npm run docker:down
```

Compose and the automated production container use `restart: unless-stopped`, so the service returns after a server reboot. The application currently stores no server-side user data, so no persistent application volume or backup job is required. Back up the deployment runtime environment and reverse-proxy configuration instead.

The automated deployment keeps the current container until an isolated candidate passes health checks. During replacement the old container is renamed and retained until the new production container passes both its Docker health check and local canonical/health smoke checks. Any failure restores and restarts the old container. Successful deployments record the active SHA under the deployment account's state directory; previous immutable images remain in Docker for operator-directed rollback.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `LETPOT_BIND_ADDRESS` | `127.0.0.1` | Host interface exposed by Compose |
| `LETPOT_PORT` | `3000` | Host port exposed by Compose |
| `LETPOT_IMAGE` | `letpot-maker:local` | Local image name and tag |
| `LETPOT_SITE_URL` | request origin | Public HTTPS origin used by canonical URLs, the sitemap, robots.txt, and JSON-LD |
| `LETPOT_HEALTH_ATTEMPTS` | `30` | Two-second health polling attempts used by the deployment script |
| `GOOGLE_SITE_VERIFICATION` | empty | Optional Google Search Console HTML verification token |
| `BING_SITE_VERIFICATION` | empty | Optional Bing Webmaster Tools HTML verification token |
| `AI_API_KEY` | empty | Enables optional AI model recipes |
| `AI_BASE_URL` | empty | OpenAI-compatible API base URL or full chat endpoint |
| `AI_MODEL` | empty | Provider-specific model ID |
| `AI_DISABLE_THINKING` | `false` | Sends MiniMax's optional disabled-thinking request field |
| `AI_RATE_LIMIT_MAX` | `5` | Accepted requests per client in each window |
| `AI_RATE_LIMIT_WINDOW_MS` | `600000` | Per-client request window in milliseconds |
| `AI_MAX_CONCURRENCY` | `2` | Maximum simultaneous provider requests per app replica |
