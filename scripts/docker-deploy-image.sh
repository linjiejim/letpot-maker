#!/usr/bin/env sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
service="letpot-maker"
image="${LETPOT_IMAGE:-}"
max_attempts="${LETPOT_HEALTH_ATTEMPTS:-30}"

case "$image" in
  ""|letpot-maker:local)
    printf 'Set LETPOT_IMAGE to a published immutable image tag.\n' >&2
    exit 1
    ;;
esac

cd "$project_dir"
docker compose pull "$service"
docker compose up --detach --no-build "$service"

container_id="$(docker compose ps --quiet "$service")"
if [ -z "$container_id" ]; then
  printf 'Could not find the %s container.\n' "$service" >&2
  exit 1
fi

attempt=1
while [ "$attempt" -le "$max_attempts" ]; do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' "$container_id")"
  case "$status" in
    healthy)
      printf '%s is healthy at http://%s:%s using %s\n' \
        "$service" "${LETPOT_BIND_ADDRESS:-127.0.0.1}" "${LETPOT_PORT:-3000}" "$image"
      exit 0
      ;;
    unhealthy)
      printf '%s failed its health check.\n' "$service" >&2
      docker compose logs --tail=100 "$service" >&2
      exit 1
      ;;
  esac

  sleep 2
  attempt=$((attempt + 1))
done

printf '%s did not become healthy in time.\n' "$service" >&2
docker compose logs --tail=100 "$service" >&2
exit 1
