#!/usr/bin/env bash
# Сборка APK «АвтоПрофи».
#   по умолчанию — Gradle; флаг --manual — aapt/javac/d8/apksigner без Gradle.
#
# Переменные окружения:
#   ANDROID_HOME  путь к Android SDK (platforms;android-34, build-tools;34.0.0)
#   GRADLE_BIN    путь к исполняемому файлу Gradle (8.x)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
ASSETS="$ROOT/android/app/src/main/assets"
DIST="$ROOT/dist"

MODE="auto"
case "${1:-}" in
  --manual) MODE="manual"; shift ;;
  --gradle) MODE="gradle"; shift ;;
esac
BUILD_TYPE="${1:-debug}"

if [ -z "${ANDROID_HOME:-}" ]; then
  for candidate in "$ROOT/../_tools/android-sdk" "$HOME/Android/Sdk" "${ANDROID_SDK_ROOT:-}"; do
    if [ -n "$candidate" ] && [ -d "$candidate/platforms" ]; then
      ANDROID_HOME="$candidate"
      break
    fi
  done
fi
export ANDROID_HOME
export ANDROID_SDK_ROOT="${ANDROID_HOME:-}"

if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "$ANDROID_HOME/platforms" ]; then
  echo "Android SDK не найден. Укажите ANDROID_HOME." >&2
  echo 'Например: ANDROID_HOME=$HOME/Android/Sdk scripts/build-apk.sh' >&2
  exit 1
fi

# 1. Веб-приложение → assets/www
rm -rf "$ASSETS"
mkdir -p "$ASSETS/www"
cp -r "$WEB/." "$ASSETS/www/"

# 2. Иконки (если есть rsvg-convert)
if command -v rsvg-convert >/dev/null 2>&1; then
  "$ROOT/scripts/make-icons.sh" >/dev/null
fi

# 3. Выбор пути сборки
if [ "$MODE" = "auto" ]; then
  AAPT2="$ANDROID_HOME/build-tools/34.0.0/aapt2"
  if [ -x "$AAPT2" ] && "$AAPT2" version >/dev/null 2>&1; then
    MODE="gradle"
  else
    MODE="manual"
  fi
fi

if [ "$MODE" = "manual" ]; then
  echo "aapt2 недоступен → сборка через aapt/javac/d8"
  exec bash "$ROOT/scripts/build-apk-manual.sh" "$BUILD_TYPE"
fi

# 4. Gradle
GRADLE_BIN="${GRADLE_BIN:-}"
if [ -z "$GRADLE_BIN" ]; then
  for candidate in "$ROOT/../_tools/gradle-8.9/bin/gradle" "$ROOT/android/gradlew"; do
    if [ -x "$candidate" ]; then GRADLE_BIN="$candidate"; break; fi
  done
fi
if [ -z "$GRADLE_BIN" ]; then
  GRADLE_BIN="$(command -v gradle || true)"
fi
if [ -z "$GRADLE_BIN" ]; then
  echo "Gradle не найден. Укажите GRADLE_BIN или установите Gradle 8.x." >&2
  exit 1
fi

echo "Сборка: $BUILD_TYPE"
(cd "$ROOT/android" && "$GRADLE_BIN" --no-daemon -q "assemble${BUILD_TYPE^}")

APK="$ROOT/android/app/build/outputs/apk/$BUILD_TYPE/app-$BUILD_TYPE.apk"

mkdir -p "$DIST"
if [ "$BUILD_TYPE" = "release" ]; then
  OUT="$DIST/autoprofi-v$(grep -oP 'versionName "\K[^"]+' "$ROOT/android/app/build.gradle")-release.apk"
else
  OUT="$DIST/autoprofi-debug.apk"
fi
cp -f "$APK" "$OUT"
echo "APK: $OUT ($(du -h "$OUT" | cut -f1))"
