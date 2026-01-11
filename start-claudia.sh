#!/bin/bash
# Quick start script for Claudia

cd "$(dirname "$0")" || exit 1

echo "🎨 Starting Claudia..."
echo ""
echo "Starting API Server on port 8080..."
node api-server.js &
API_PID=$!

sleep 2

echo "Starting Frontend on port 1420..."
bun run dev &
FRONTEND_PID=$!

sleep 3

echo ""
echo "✅ Claudia is running!"
echo ""
echo "📍 Frontend:  http://localhost:1420"
echo "📍 API:       http://localhost:8080"
echo ""
echo "Process IDs:"
echo "  API Server: $API_PID"
echo "  Frontend:   $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop both servers"

wait
