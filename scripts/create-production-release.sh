#!/usr/bin/env bash
set -Eeuo pipefail

required_variables=(
  GITHUB_REPOSITORY
  LETPOT_IMAGE
  LETPOT_IMAGE_DIGEST
  LETPOT_RELEASE_SHA
  LETPOT_SITE_URL
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

readonly short_sha="${LETPOT_RELEASE_SHA:0:12}"
readonly release_tag="production-${short_sha}"
readonly release_title="Production ${short_sha}"
# Backticks are intentional Markdown code spans, not shell expansion.
# shellcheck disable=SC2016
release_notes="$(printf 'Successfully deployed [%s](%s).\n\n- Commit: `%s`\n- Image: `%s`\n- Digest: `%s`\n- Deployment: GitHub `production` environment\n' \
  "$LETPOT_SITE_URL" \
  "$LETPOT_SITE_URL" \
  "$LETPOT_RELEASE_SHA" \
  "$LETPOT_IMAGE" \
  "$LETPOT_IMAGE_DIGEST")"

if gh release view "$release_tag" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  gh release edit "$release_tag" \
    --repo "$GITHUB_REPOSITORY" \
    --target "$LETPOT_RELEASE_SHA" \
    --title "$release_title" \
    --notes "$release_notes" \
    --latest
else
  gh release create "$release_tag" \
    --repo "$GITHUB_REPOSITORY" \
    --target "$LETPOT_RELEASE_SHA" \
    --title "$release_title" \
    --generate-notes \
    --notes "$release_notes" \
    --latest
fi

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  # Backticks are intentional Markdown code spans, not shell expansion.
  # shellcheck disable=SC2016
  {
    printf '### GitHub Release\n\n'
    printf -- '- Tag: `%s`\n' "$release_tag"
    printf -- '- Generated change summary: published\n'
    printf -- '- Attached binary artifacts: none (GHCR is the deployment artifact)\n'
  } >> "$GITHUB_STEP_SUMMARY"
fi

printf 'Published release notes for %s.\n' "$release_tag"
