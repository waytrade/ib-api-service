#!/bin/sh

# start IBGateway
/root/scripts/run.sh &

echo "Starting ib-api-service in 40s..."
sleep 20

echo "Starting ib-api-service in 20s..."
sleep 10

echo "Starting ib-api-service in 10s..."
sleep 5

echo "Starting ib-api-service in 5s..."
sleep 5

echo "Starting ib-api-service..."
node ./dist/run.js
