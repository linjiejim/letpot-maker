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

Keep `LETPOT_BIND_ADDRESS=127.0.0.1` for a private reverse-proxy or VPN setup. Set `AI_API_KEY` only if the optional AI Generate feature should be enabled.

Build and start the service:

```bash
npm run docker:deploy
```

The script waits for the container health check before returning. The default local endpoint is `http://127.0.0.1:3000` and the health endpoint is `http://127.0.0.1:3000/api/health`.

## Published images

GitHub Actions runs the complete repository checks and publishes a Linux AMD64 image to `ghcr.io/<owner>/letpot-maker` after successful `main` builds. Every image receives an immutable `sha-<full-commit-sha>` tag; `main` also updates `latest`.

Image publication uses the workflow's repository-scoped `GITHUB_TOKEN`. It does not require a personal access token, SSH key, or custom Actions secret. AI provider credentials are runtime-only server settings and must never be added to the build workflow.

For a server deployment, prefer an immutable SHA tag:

```bash
export LETPOT_IMAGE=ghcr.io/<owner>/letpot-maker:sha-<full-commit-sha>
export LETPOT_BIND_ADDRESS=127.0.0.1
export LETPOT_PORT=18906
npm run docker:deploy-image
```

The prebuilt-image script pulls the selected tag, starts only this Compose service without building on the server, and waits for its health check. Keep deployment from GitHub Actions disabled unless a dedicated, least-privilege server account and deploy key have been provisioned; do not upload a personal root SSH key as a repository secret.

## Network exposure

The recommended layout is:

```text
Private network / HTTPS reverse proxy
                │
                ▼
       127.0.0.1:3000
                │
                ▼
       LetPot Maker container
```

Use the reverse proxy to provide TLS, authentication, request limits, and an access policy appropriate for the server. If the container must listen on every interface, set `LETPOT_BIND_ADDRESS=0.0.0.0` deliberately and protect port 3000 with the server firewall.

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

Compose uses `restart: unless-stopped`, so the service returns after a server reboot. The application currently stores no server-side user data, so no persistent application volume or backup job is required. Back up the repository, deployment `.env`, and any reverse-proxy configuration instead.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `LETPOT_BIND_ADDRESS` | `127.0.0.1` | Host interface exposed by Compose |
| `LETPOT_PORT` | `3000` | Host port exposed by Compose |
| `LETPOT_IMAGE` | `letpot-maker:local` | Local image name and tag |
| `LETPOT_HEALTH_ATTEMPTS` | `30` | Two-second health polling attempts used by the deployment script |
| `AI_API_KEY` | empty | Enables optional AI model recipes |
| `AI_BASE_URL` | empty | OpenAI-compatible API base URL or full chat endpoint |
| `AI_MODEL` | empty | Provider-specific model ID |
