#!/bin/bash

set -e

echo "🔥 Starting development environment..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Run 'make setup' first."
    exit 1
fi

# Source environment variables
source .env

# Start services in background using direct Python execution
echo "Starting Gateway service..."
cd services/gateway && python3 runtime/main.py &
GATEWAY_PID=$!
cd ../..

echo "Starting Auth service..."
cd services/auth-service && python3 runtime/main.py &
AUTH_PID=$!
cd ../..

echo "Starting Knowledge API service..."
cd services/knowledge-api && python3 runtime/main.py &
KNOWLEDGE_API_PID=$!
cd ../..

echo ""
echo "✅ Development environment started!"
echo ""
echo "Services:"
echo "  - Gateway: http://localhost:${GATEWAY_PORT:-8000}"
echo "  - Auth: http://localhost:${AUTH_PORT:-8001}"
echo "  - Knowledge API: http://localhost:${KNOWLEDGE_API_PORT:-8002}"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C and stop all services
trap "kill $GATEWAY_PID $AUTH_PID $KNOWLEDGE_API_PID 2>/dev/null; exit" INT

# Wait for any process to exit
wait
