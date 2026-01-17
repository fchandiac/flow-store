#!/usr/bin/env bash
set -euo pipefail

SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}"
AVD_NAME="${AVD_NAME:-imin_emulador}"
EMULATOR_BIN="$SDK_ROOT/emulator/emulator"
ADB_BIN="$SDK_ROOT/platform-tools/adb"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

log() {
  printf '\n[imin-dev] %s\n' "$1"
}

die() {
  printf '\n[imin-dev][error] %s\n' "$1" >&2
  exit 1
}

[[ -x "$EMULATOR_BIN" ]] || die "No se encontró el binario del emulador en $EMULATOR_BIN"
[[ -x "$ADB_BIN" ]] || die "No se encontró adb en $ADB_BIN"

start_adb() {
  "$ADB_BIN" start-server >/dev/null
}

wait_for_device() {
  local retries=60
  local wait_seconds=5

  while (( retries > 0 )); do
    local devices
    devices=$("$ADB_BIN" devices | awk '/^emulator-/{print $1 " " $2}')
    if grep -q "device$" <<<"$devices"; then
      log "Emulador listo: $(awk '{print $1}' <<<"$devices" | head -n 1)"
      return 0
    fi

    if grep -q "offline$" <<<"$devices"; then
      log "Emulador detectado pero todavía offline; reintentando..."
    else
      log "Esperando a que el emulador se inicie..."
    fi

    sleep "$wait_seconds"
    (( retries-- ))
  done

  die "El emulador tardó demasiado en inicializar"
}

ensure_emulator() {
  start_adb

  local emulator_running
  emulator_running=$("$ADB_BIN" devices | awk '/^emulator-/{print $1 " " $2}')

  if grep -q "device$" <<<"$emulator_running"; then
    log "Emulador ya activo."
    return 0
  fi

  log "Lanzando emulador $AVD_NAME..."
  "$EMULATOR_BIN" -avd "$AVD_NAME" -no-snapshot-load -netdelay none -netspeed full \
    >/dev/null 2>&1 &

  wait_for_device
}

run_expo_android() {
  log "Iniciando build de desarrollo con Expo..."
  cd "$PROJECT_ROOT"
  npx expo run:android
}

log "Usando SDK en $SDK_ROOT"
log "AVD objetivo: $AVD_NAME"

ensure_emulator
run_expo_android
