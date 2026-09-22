# GitHub Copilot Skills

This directory contains custom skills for GitHub Copilot to improve code generation and assistance within this workspace.

## Available Skills

Skills are loaded lazily to provide context-aware assistance for specific tasks.

### Workspace Skills

- **Python Microservices**: FastAPI service patterns, pydantic-settings, async/await
- **Schema-Driven Development**: OpenAPI spec generation, validation, code generation
- **Testing Patterns**: pytest fixtures, FastAPI TestClient, async test patterns
- **Service Configuration**: Environment-based config with pydantic-settings

## Usage

Copilot automatically loads relevant skills based on the file you're editing and the task context.

## Adding New Skills

To add a new skill:

1. Create a new `.md` file in the `skills/` directory
2. Document the skill with examples
3. Skills are automatically available to Copilot
