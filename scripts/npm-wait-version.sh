#!/usr/bin/env bash
# Wait until a package version is served by the npm registry.
# npm publish can exit 0 with "Your package is being processed..." while the
# version still 404s for several minutes (or never appears).
set -euo pipefail

PKG="${1:?package name required, e.g. @shamar/adonis}"
VER="${2:?version required}"
TIMEOUT_SEC="${3:-900}"
INTERVAL_SEC="${4:-15}"

ENC_PKG="${PKG//\//%2F}"
URL="https://registry.npmjs.org/${ENC_PKG}/${VER}"
DEADLINE=$((SECONDS + TIMEOUT_SEC))
attempt=0

echo "Waiting for ${PKG}@${VER} at ${URL} (timeout ${TIMEOUT_SEC}s)"
while (( SECONDS < DEADLINE )); do
  attempt=$((attempt + 1))
  CODE="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$URL" || echo 000)"
  if [[ "$CODE" == "200" ]]; then
    echo "${PKG}@${VER} is live (attempt ${attempt})"
    exit 0
  fi
  echo "attempt ${attempt}: HTTP ${CODE} — sleeping ${INTERVAL_SEC}s"
  sleep "$INTERVAL_SEC"
done

echo "::error::${PKG}@${VER} was accepted by npm but never became available within ${TIMEOUT_SEC}s"
exit 1
