#!/bin/bash
set -e
bearerbox /etc/kannel/kannel.conf &
BBPID=$!

# Wait for bearerbox to listen on smsbox-port
echo "Waiting for bearerbox..."
for i in $(seq 1 30); do
  if nc -z localhost 13001 2>/dev/null; then
    echo "bearerbox ready on port 13001"
    break
  fi
  sleep 1
done

if ! nc -z localhost 13001 2>/dev/null; then
  echo "ERROR: bearerbox did not start within 30 seconds"
  exit 1
fi

smsbox /etc/kannel/kannel.conf &
SMPID=$!

# Wait for both processes
wait $BBPID $SMPID
