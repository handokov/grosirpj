#!/bin/bash
# Auto-restart dev server when it crashes
while true; do
  cd /home/z/my-project
  NODE_OPTIONS='--max-old-space-size=128' npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server crashed, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
