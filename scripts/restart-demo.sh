#!/usr/bin/env bash
# Bring the live demo back after this WSL machine restarts.
#
# The scoring API runs on this machine and reaches Vercel through a Cloudflare quick
# tunnel, whose address changes every time it starts. This script:
#   1. starts the FastAPI server on 127.0.0.1:8000 (if it isn't already running),
#   2. opens a new tunnel and waits until it answers,
#   3. points AI_SERVER_URL on Vercel production at the new address,
#   4. rebuilds the deployment that is live right now, so no unreviewed local code ships.
#
# Usage:  bash scripts/restart-demo.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="${TMPDIR:-/tmp}/ev-demo"
mkdir -p "$LOGS"
cd "$ROOT"

# 1. API
if curl -s -m 3 -o /dev/null http://127.0.0.1:8000/health; then
  echo "API already running."
else
  echo "Starting API…"
  (
    set -a; . ./.env; set +a
    # Ollama is not installed here; without this every report waits ~2 min, then falls back anyway.
    export REPORT_BACKEND=template
    nohup ml/.venv/bin/python -m uvicorn server.app:app --app-dir ./ml --host 127.0.0.1 --port 8000 > "$LOGS/api.log" 2>&1 &
  )
  for _ in $(seq 1 60); do curl -s -m 2 -o /dev/null http://127.0.0.1:8000/health && break; sleep 1; done
  curl -s -m 3 -o /dev/null http://127.0.0.1:8000/health || { echo "API did not start, see $LOGS/api.log"; exit 1; }
fi

# 2. Tunnel (a new one each run; stop any old ones first)
pkill -x cloudflared 2>/dev/null || true
: > "$LOGS/tunnel.log"
nohup "$HOME/.local/bin/cloudflared" tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:8000 > "$LOGS/tunnel.log" 2>&1 &
URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOGS/tunnel.log" | head -1 || true)"
  [ -n "$URL" ] && break; sleep 1
done
[ -n "$URL" ] || { echo "Tunnel gave no address, see $LOGS/tunnel.log"; exit 1; }
echo "Tunnel: $URL"
for _ in $(seq 1 30); do
  [ "$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$URL/health")" = 200 ] && break; sleep 4
done

# 3 + 4. Vercel
cd "$ROOT/frontend"
vercel env rm AI_SERVER_URL production --yes --confirm-name AI_SERVER_URL >/dev/null 2>&1 || true
printf '%s' "$URL" | vercel env add AI_SERVER_URL production >/dev/null
LIVE="$(vercel inspect ev-campaign-analyser.vercel.app 2>&1 | awk '$1=="url"{print $2; exit}')"
echo "Rebuilding $LIVE with the new address…"
vercel redeploy "$LIVE" --target production >/dev/null

sleep 5
echo -n "Production AI health: "
curl -s -m 30 -o /dev/null -w '%{http_code}\n' https://ev-campaign-analyser.vercel.app/api/ai/health
echo "Keep this machine awake and a WSL terminal open during judging."
