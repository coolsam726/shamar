#!/usr/bin/env bash
# Pull and restart the demo panel on the VPS.
# Usage: IMAGE_TAG=v0.4.0 ./deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing $ROOT/.env — copy .env.example and fill secrets." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env
set +a

TAG="${IMAGE_TAG:-latest}"
export IMAGE_TAG="$TAG"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-coolsam726}" --password-stdin
fi

echo "Deploying ghcr.io/coolsam726/shamar-demo:${TAG}"
docker compose pull app
docker compose up -d --remove-orphans
docker image prune -f >/dev/null 2>&1 || true
docker compose ps
