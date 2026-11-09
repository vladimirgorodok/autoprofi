#!/usr/bin/env bash
# Публикация PWA и APK на GitHub Pages в ветку gh-pages.
# Источник Pages в настройках репозитория: ветка gh-pages, папка /.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${REMOTE:-origin}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -r "$ROOT/web/." "$TMP/"
mkdir -p "$TMP/download"
LATEST_APK="$(ls -1t "$ROOT"/dist/*.apk 2>/dev/null | head -1 || true)"
if [ -n "$LATEST_APK" ]; then
  cp "$LATEST_APK" "$TMP/download/autoprofi.apk"
fi

REMOTE_URL="$(git -C "$ROOT" remote get-url "$REMOTE")"

cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="АвтоПрофи" -c user.email="autoprofi@users.noreply.github.com" \
  commit -q -m "Deploy PWA $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git remote add origin "$REMOTE_URL"
git push -f origin gh-pages
echo "Опубликовано в ветку gh-pages: $REMOTE_URL"
