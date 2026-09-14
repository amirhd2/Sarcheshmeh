#!/bin/bash
# Restarts Vite dev server if it dies
cd /home/z/my-project
while true; do
  if ! pgrep -f "vite.*port 5173" > /dev/null; then
    npx vite --host 0.0.0.0 --port 5173 > /tmp/vite-dev.log 2>&1 &
    VITE_PID=$!
    echo "[$(date +%T)] Started vite (pid=$VITE_PID)" >> /tmp/keep-alive.log
  fi
  sleep 3
done
