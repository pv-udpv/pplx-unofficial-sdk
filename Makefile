.PHONY: setup dev lint format test clean codegen help install-python install-node

help:
	@echo "Available commands:"
	@echo "  make setup          - Complete workspace setup"
	@echo "  make install-python - Install Python dependencies"
	@echo "  make install-node   - Install Node.js dependencies"
	@echo "  make dev            - Start development environment"
	@echo "  make lint           - Run linters (ruff, mypy, eslint)"
	@echo "  make format         - Format code (ruff, prettier)"
	@echo "  make test           - Run all tests"
	@echo "  make test-python    - Run Python tests"
	@echo "  make test-ts        - Run TypeScript tests"
	@echo "  make codegen        - Generate code from schemas"
	@echo "  make clean          - Clean build artifacts"

setup: install-python install-node
	@echo "Setting up pre-commit hooks..."
	@pip install pre-commit
	@pre-commit install
	@echo "✓ Workspace setup complete"

install-python:
	@echo "Installing Python dependencies..."
	@pip install -e ".[dev]"
	@echo "✓ Python dependencies installed"

install-node:
	@echo "Installing Node.js dependencies..."
	@npm install
	@echo "✓ Node.js dependencies installed"

dev:
	@echo "Starting development environment..."
	@bash scripts/dev/start-dev.sh

lint:
	@echo "Running Python linters..."
	@ruff check .
	@mypy services packages
	@echo "Running TypeScript linters..."
	@npm run lint

format:
	@echo "Formatting Python code..."
	@ruff check --fix .
	@ruff format .
	@echo "Formatting TypeScript code..."
	@npm run format

test: test-python test-ts

test-python:
	@echo "Running Python tests..."
	@pytest -v

test-ts:
	@echo "Running TypeScript tests..."
	@npm test

codegen:
	@echo "Generating code from schemas..."
	@python schemas/tools/codegen/python.py
	@python schemas/tools/codegen/typescript.py

clean:
	@echo "Cleaning build artifacts..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf dist/ build/ *.egg-info
	@echo "✓ Cleanup complete"
