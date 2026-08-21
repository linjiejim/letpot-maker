#!/usr/bin/env sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
image="${LETPOT_IMAGE:-letpot-maker:local}"

cd "$project_dir"

normalize_build_proxy() {
  printf '%s' "$1" | sed \
    -e 's#://127\.0\.0\.1:#://host.docker.internal:#' \
    -e 's#://localhost:#://host.docker.internal:#'
}

build_http_proxy="$(normalize_build_proxy "${HTTP_PROXY:-${http_proxy:-}}")"
build_https_proxy="$(normalize_build_proxy "${HTTPS_PROXY:-${https_proxy:-}}")"
build_no_proxy="${NO_PROXY:-${no_proxy:-}}"

# Docker treats these names as predefined proxy build arguments and excludes
# their values from image history and cache metadata.
docker build \
  --add-host "host.docker.internal:host-gateway" \
  --build-arg "HTTP_PROXY=$build_http_proxy" \
  --build-arg "HTTPS_PROXY=$build_https_proxy" \
  --build-arg "NO_PROXY=$build_no_proxy" \
  --build-arg "http_proxy=$build_http_proxy" \
  --build-arg "https_proxy=$build_https_proxy" \
  --build-arg "no_proxy=$build_no_proxy" \
  --tag "$image" \
  .
printf 'Built %s\n' "$image"
