#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Claudia Complete Setup & Launch${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

# Check if rustup is installed
if ! command -v rustup &> /dev/null; then
    echo -e "${YELLOW}⚠️  rustup not found. Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo -e "${GREEN}✓ rustup found${NC}"
fi

# Update Rust to latest stable
echo -e "${YELLOW}📦 Updating Rust toolchain to latest stable...${NC}"
rustup update stable
rustup default stable

# Verify Cargo version
CARGO_VERSION=$(cargo --version | awk '{print $2}')
echo -e "${GREEN}✓ Cargo version: $CARGO_VERSION${NC}"

# Check Rust version
RUST_VERSION=$(rustc --version | awk '{print $2}')
echo -e "${GREEN}✓ Rust version: $RUST_VERSION${NC}"

cd /usr/local/src/claudia

# Install Node dependencies
echo -e "${YELLOW}📦 Installing Node dependencies...${NC}"
bun install

# Build the web server backend
echo -e "${YELLOW}🔨 Building opcode-web backend...${NC}"
cd src-tauri
cargo build --bin opcode-web --release 2>&1 | grep -E "Compiling|Finished|error|warning" || true
cd ..

WEB_BINARY="./src-tauri/target/release/opcode-web"
if [ ! -f "$WEB_BINARY" ]; then
    echo -e "${RED}❌ Failed to build opcode-web${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Built: $WEB_BINARY${NC}"

# Kill any existing processes on ports 1420 and 8080
echo -e "${YELLOW}🛑 Cleaning up existing processes...${NC}"
pkill -f "vite|opcode-web" || true
sleep 1

# Start the backend web server in background
echo -e "${YELLOW}🌐 Starting opcode-web backend on port 8080...${NC}"
$WEB_BINARY --port 8080 &
WEB_PID=$!
sleep 2

# Check if web server started
if ! kill -0 $WEB_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start opcode-web${NC}"
    exit 1
fi
echo -e "${GREEN}✓ opcode-web running (PID: $WEB_PID)${NC}"

# Start the frontend dev server
echo -e "${YELLOW}🎨 Starting Vite frontend on port 1420...${NC}"
bun run dev &
FRONTEND_PID=$!
sleep 3

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Claudia is ready!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC}  http://localhost:1420"
echo -e "${BLUE}Backend:${NC}   http://localhost:8080"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo "  Backend (opcode-web): $WEB_PID"
echo "  Frontend (Vite):      $FRONTEND_PID"
echo ""
echo -e "${YELLOW}To stop:${NC} kill $WEB_PID $FRONTEND_PID"
echo ""

# Keep script running
wait
