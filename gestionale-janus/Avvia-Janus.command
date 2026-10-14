#!/bin/bash
cd "$(dirname "$0")" || exit 1
JANUS_NODE="${JANUS_NODE:-$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
if [ ! -x "$JANUS_NODE" ]; then JANUS_NODE="$(command -v node)"; fi
if [ -z "$JANUS_NODE" ]; then echo "Occorre Node.js 18 o successivo."; read -r; exit 1; fi
JANUS_OPEN_BROWSER=1 "$JANUS_NODE" server.cjs
read -r -p "Premi Invio per chiudere."
