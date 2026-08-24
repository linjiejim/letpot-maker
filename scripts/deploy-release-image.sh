#!/usr/bin/env bash
set -Eeuo pipefail

required_variables=(
  LETPOT_DEPLOY_HOST
  LETPOT_DEPLOY_PORT
  LETPOT_DEPLOY_USER
  LETPOT_IMAGE_DIGEST
  LETPOT_IMAGE_REPOSITORY
  LETPOT_KNOWN_HOSTS_FILE
  LETPOT_RELEASE_SHA
  LETPOT_SSH_KEY_FILE
)

for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    printf 'Required environment variable %s is not set.\n' "$variable_name" >&2
    exit 64
  fi
done

if [[ ! "$LETPOT_RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  printf 'LETPOT_RELEASE_SHA must be a full lowercase Git commit SHA.\n' >&2
  exit 64
fi

if [[ ! "$LETPOT_IMAGE_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  printf 'LETPOT_IMAGE_DIGEST must be a sha256 digest.\n' >&2
  exit 64
fi

if [[ ! "$LETPOT_IMAGE_REPOSITORY" =~ ^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+$ ]]; then
  printf 'LETPOT_IMAGE_REPOSITORY must be a normalized GHCR repository.\n' >&2
  exit 64
fi

if [[ ! "$LETPOT_DEPLOY_PORT" =~ ^[0-9]{1,5}$ ]] || (( LETPOT_DEPLOY_PORT < 1 || LETPOT_DEPLOY_PORT > 65535 )); then
  printf 'LETPOT_DEPLOY_PORT must be a valid TCP port.\n' >&2
  exit 64
fi

if [[ ! -r "$LETPOT_SSH_KEY_FILE" ]]; then
  printf 'Deployment SSH key is not readable: %s\n' "$LETPOT_SSH_KEY_FILE" >&2
  exit 66
fi

if [[ ! -r "$LETPOT_KNOWN_HOSTS_FILE" ]]; then
  printf 'Pinned known_hosts file is not readable: %s\n' "$LETPOT_KNOWN_HOSTS_FILE" >&2
  exit 66
fi

readonly source_image="${LETPOT_IMAGE_REPOSITORY}@${LETPOT_IMAGE_DIGEST}"
readonly release_image="${LETPOT_IMAGE_REPOSITORY}:sha-${LETPOT_RELEASE_SHA}"

printf 'Pulling immutable production image %s\n' "$source_image"
docker pull --platform linux/amd64 "$source_image"
docker tag "$source_image" "$release_image"

image_revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$release_image")"
if [[ "$image_revision" != "$LETPOT_RELEASE_SHA" ]]; then
  printf 'Image revision label mismatch: expected %s, got %s.\n' "$LETPOT_RELEASE_SHA" "$image_revision" >&2
  exit 65
fi

printf 'Transferring %s to the restricted production deploy endpoint.\n' "$release_image"
docker save "$release_image" \
  | gzip -1 \
  | ssh \
      -p "$LETPOT_DEPLOY_PORT" \
      -i "$LETPOT_SSH_KEY_FILE" \
      -o BatchMode=yes \
      -o IdentitiesOnly=yes \
      -o LogLevel=ERROR \
      -o StrictHostKeyChecking=yes \
      -o "UserKnownHostsFile=$LETPOT_KNOWN_HOSTS_FILE" \
      "$LETPOT_DEPLOY_USER@$LETPOT_DEPLOY_HOST" \
      "deploy $LETPOT_RELEASE_SHA"

printf 'Production deployment completed for %s.\n' "$LETPOT_RELEASE_SHA"
