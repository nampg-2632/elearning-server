#!/usr/bin/env bash
# Runs on the VPS (as the deploy user) from the release workflow:
#   ./deploy.sh sha-1a2b3c4
# Pulls the image, migrates, restarts, and waits for /health/ready. When the
# new version is not ready, the previous image is started again. Only the
# running and the previous image are kept on disk.
#
# Migrations run before the new code and are not rolled back, so they must
# stay compatible with the version still running (add, don't drop/rename).
set -euo pipefail
cd "$(dirname "$0")"

tag=${1:?usage: deploy.sh <image tag>}
previous=$(cat .image-tag 2>/dev/null || true)
READY_TIMEOUT=${READY_TIMEOUT:-90}
# Written to .env by the release workflow, like for docker-compose.prod.yml.
IMAGE_REPO=$(sed -n 's/^IMAGE_REPO=//p' .env)
: "${IMAGE_REPO:?IMAGE_REPO missing from .env}"

compose() { IMAGE_TAG=$1 docker compose -f docker-compose.prod.yml "${@:2}"; }

# Records the running tag. .env gets it too, so docker compose commands typed
# on the VPS work without IMAGE_TAG (the workflow rewrites .env each deploy).
set_current() {
  echo "$1" >.image-tag
  { grep -v '^IMAGE_TAG=' .env || true; echo "IMAGE_TAG=$1"; } >.env.tmp
  chmod 600 .env.tmp
  mv .env.tmp .env
}

# Removes app images other than the running and the previous one (kept for
# a rollback), then layers no longer used by any image.
remove_old_images() {
  docker image ls "$IMAGE_REPO" --format '{{.Tag}}' |
    { grep -vxF -e "$1" -e "${2:-$1}" -e '<none>' || true; } |
    while read -r old; do
      docker image rm "$IMAGE_REPO:$old" >/dev/null || true
    done
  docker image prune -f >/dev/null
}

wait_ready() {
  local deadline=$((SECONDS + READY_TIMEOUT))
  until compose "$1" exec -T app node -e \
    "fetch('http://127.0.0.1:3000/health/ready').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"; do
    if ((SECONDS >= deadline)); then
      return 1
    fi
    sleep 3
  done
}

echo "==> Pulling $tag"
compose "$tag" pull app

echo "==> Starting Postgres and Redis"
compose "$tag" up -d --wait postgres redis

echo "==> Running migrations"
compose "$tag" run --rm --no-deps app yarn db:migrate:prod

echo "==> Starting $tag"
compose "$tag" up -d --remove-orphans

if wait_ready "$tag"; then
  set_current "$tag"
  remove_old_images "$tag" "$previous"
  echo "==> $tag is ready"
  exit 0
fi

echo "==> $tag did not become ready within ${READY_TIMEOUT}s" >&2
compose "$tag" logs --tail 100 app >&2
if [[ -n $previous && $previous != "$tag" ]]; then
  echo "==> Rolling back to $previous" >&2
  compose "$previous" up -d app
  set_current "$previous"
  wait_ready "$previous" && echo "==> $previous is running again" >&2
fi
exit 1
