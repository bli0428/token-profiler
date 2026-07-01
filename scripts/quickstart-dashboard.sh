#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTH_MODE="chatgpt"
INSTALL_DEPS=1
BUILD_DASHBOARD=1
OPEN_DASHBOARD=1
CONFIGURE_CODEX=0
AUTOSTART=0
DASHBOARD_API_HOST="127.0.0.1"
DASHBOARD_API_PORT="8788"

usage() {
  cat <<'EOF'
Usage: scripts/quickstart-dashboard.sh [options]

Build and start the local Token Profiler dashboard.

Options:
  --auth chatgpt|api       Upstream Codex auth mode. Defaults to chatgpt.
  --configure-codex        Enable Codex routing through the local profiler proxy.
  --autostart              macOS only: install login autostart for local services.
  --skip-install           Do not run npm install in root and dashboard/.
  --skip-build             Do not build dashboard/dist before starting services.
  --no-autostart           Accepted for compatibility; autostart is off by default.
  --no-open                Configure/start local services but do not open the dashboard.
  --no-frontend            Alias for --no-open.
  --dashboard-host <host>  Dashboard API host. Defaults to 127.0.0.1.
  --dashboard-port <port>  Dashboard API port. Defaults to 8788.
  -h, --help               Show this help.
EOF
}

require_value() {
  local option="$1"
  local value="${2:-}"

  if [[ -z "$value" || "$value" == --* ]]; then
    echo "$option requires a value." >&2
    exit 1
  fi
}

run_setup_codex() {
  local output
  local status

  set +e
  output="$(node src/cli.js setup codex "$@" 2>&1)"
  status=$?
  set -e

  if [[ -n "$output" ]]; then
    printf '%s\n' "$output"
  fi

  if [[ "$status" -eq 0 ]]; then
    return 0
  fi

  if [[ "$output" == *"Codex provider token-profiler already exists"* ]]; then
    echo "Codex already has a token-profiler provider block; continuing to start local services."
    echo "If Codex routing looks wrong, run: node src/cli.js codex disable"
    return 0
  fi

  return "$status"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auth)
      require_value "$1" "${2:-}"
      AUTH_MODE="${2:-}"
      shift 2
      ;;
    --configure-codex)
      CONFIGURE_CODEX=1
      shift
      ;;
    --autostart)
      CONFIGURE_CODEX=1
      AUTOSTART=1
      shift
      ;;
    --skip-install)
      INSTALL_DEPS=0
      shift
      ;;
    --skip-build)
      BUILD_DASHBOARD=0
      shift
      ;;
    --no-autostart)
      AUTOSTART=0
      shift
      ;;
    --no-open|--no-frontend)
      OPEN_DASHBOARD=0
      shift
      ;;
    --dashboard-host)
      require_value "$1" "${2:-}"
      DASHBOARD_API_HOST="${2:-}"
      shift 2
      ;;
    --dashboard-port)
      require_value "$1" "${2:-}"
      DASHBOARD_API_PORT="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$AUTH_MODE" != "chatgpt" && "$AUTH_MODE" != "api" ]]; then
  echo "--auth must be chatgpt or api." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ "$AUTOSTART" -eq 1 && "$(uname -s)" != "Darwin" ]]; then
  echo "--autostart uses a macOS LaunchAgent and only works on macOS." >&2
  exit 1
fi

if [[ "$INSTALL_DEPS" -eq 1 ]]; then
  echo "Installing root dependencies..."
  npm install

  echo "Installing dashboard dependencies..."
  (cd dashboard && npm install)
fi

if [[ "$BUILD_DASHBOARD" -eq 1 ]]; then
  echo "Building dashboard bundle..."
  (cd dashboard && npm run build)
fi

if [[ "$AUTOSTART" -eq 1 ]]; then
  echo "Configuring Codex routing and local service autostart..."
  run_setup_codex --auth "$AUTH_MODE" --autostart --dashboard-port "$DASHBOARD_API_PORT" --host "$DASHBOARD_API_HOST"
else
  if [[ "$CONFIGURE_CODEX" -eq 1 ]]; then
    echo "Configuring Codex routing..."
    run_setup_codex --auth "$AUTH_MODE" --dashboard-port "$DASHBOARD_API_PORT" --host "$DASHBOARD_API_HOST"
  else
    echo "Skipping Codex config changes. Pass --configure-codex to enable capture routing."
  fi

  echo "Starting local proxy and dashboard API..."
  node src/cli.js daemon ensure --auth "$AUTH_MODE" --dashboard-port "$DASHBOARD_API_PORT" --host "$DASHBOARD_API_HOST"
fi

echo
if [[ "$CONFIGURE_CODEX" -eq 1 ]]; then
  echo "Restart Codex before starting a new monitored session."
else
  echo "Dashboard started. To capture new Codex traffic, rerun with --configure-codex and restart Codex."
fi

dashboard_url="http://$DASHBOARD_API_HOST:$DASHBOARD_API_PORT"

if [[ "$OPEN_DASHBOARD" -eq 0 ]]; then
  echo "Dashboard is available at $dashboard_url"
  exit 0
fi

echo "Opening dashboard at $dashboard_url ..."
if command -v open >/dev/null 2>&1; then
  open "$dashboard_url"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$dashboard_url"
else
  echo "Open $dashboard_url in your browser."
fi
