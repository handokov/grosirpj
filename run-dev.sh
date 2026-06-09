#!/bin/bash
while true; do
  node /home/z/my-project/node_modules/.bin/next dev -p 3000 -H 0.0.0.0
  echo "Server crashed, restarting in 3s..."
  sleep 3
done
