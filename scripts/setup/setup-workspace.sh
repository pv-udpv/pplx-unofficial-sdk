#!/bin/bash

set -e

echo "🚀 Setting up Perplexity AI Research Workspace..."

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
python_major=$(echo "$python_version" | cut -d'.' -f1)
python_minor=$(echo "$python_version" | cut -d'.' -f2)

# Use pure bash comparison instead of bc
if [[ $python_major -lt 3 ]] || [[ $python_major -eq 3 && $python_minor -lt 12 ]]; then
    echo "❌ Python 3.12+ is required. Current version: $python_version"
    exit 1
fi
echo "✓ Python $python_version"

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [[ $node_version -lt 18 ]]; then
    echo "❌ Node.js 18+ is required. Current version: $node_version"
    exit 1
fi
echo "✓ Node.js $(node --version)"

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -e ".[dev]"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Install pre-commit hooks
echo "Installing pre-commit hooks..."
pip install pre-commit
pre-commit install

# Create runtime directories
echo "Creating runtime directories..."
mkdir -p data/{assets,traffic,schemas}
mkdir -p services/*/runtime
touch data/traffic/.gitkeep

# Create .env template if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env template..."
    cat > .env << EOF
# Gateway Service
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=8000
GATEWAY_DEBUG=true

# Auth Service
AUTH_HOST=0.0.0.0
AUTH_PORT=8001
AUTH_SECRET_KEY=change-this-in-production

# Knowledge API
KNOWLEDGE_API_HOST=0.0.0.0
KNOWLEDGE_API_PORT=8002

# Perplexity API
PERPLEXITY_API_URL=https://www.perplexity.ai
EOF
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env file with your configuration"
echo "  2. Run 'make dev' to start development environment"
echo "  3. Run 'make test' to run tests"
echo ""
