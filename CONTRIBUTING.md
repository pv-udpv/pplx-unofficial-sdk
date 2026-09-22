# Contributing to Perplexity AI Research Workspace

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pplx-unofficial-sdk.git
   cd pplx-unofficial-sdk
   ```
3. **Set up the workspace**:
   ```bash
   make setup
   ```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Use branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### 2. Make Your Changes

Follow the coding standards:

#### Python
- Use Python 3.12+ features
- Follow Ruff configuration (see `ruff.toml`)
- Add type hints everywhere
- Use async/await for I/O operations
- Write docstrings for functions and classes
- Keep functions small and focused

#### TypeScript
- Enable strict mode
- No `any` types - use proper types
- Prefer composition over inheritance
- Follow ESLint configuration
- Write unit tests for new features

### 3. Format and Lint

```bash
# Format all code
make format

# Run linters
make lint
```

Fix any issues reported by linters.

### 4. Write Tests

- **Python**: Use pytest
  ```python
  import pytest

  @pytest.mark.asyncio
  async def test_my_feature():
      result = await my_function()
      assert result == expected
  ```

- **TypeScript**: Use Vitest
  ```typescript
  import { describe, it, expect } from 'vitest';

  describe('MyFeature', () => {
    it('should work correctly', () => {
      expect(myFunction()).toBe(expected);
    });
  });
  ```

### 5. Run Tests

```bash
# Run all tests
make test

# Run Python tests only
make test-python

# Run TypeScript tests only
make test-ts
```

### 6. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git commit -m "feat: add new authentication flow"
git commit -m "fix: resolve SSE streaming issue"
git commit -m "docs: update API documentation"
```

Use conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

### 7. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub targeting the `develop` branch.

## Pull Request Guidelines

### PR Title
Use the same format as commit messages:
- `feat: Add SSE streaming support`
- `fix: Resolve authentication timeout`

### PR Description
Include:
1. **What**: What changes are being made
2. **Why**: Why these changes are needed
3. **How**: How the changes work
4. **Testing**: How you tested the changes
5. **Screenshots**: For UI changes

### Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests pass
- [ ] No linting errors
- [ ] PR targets `develop` branch

## Code Review Process

1. Maintainers will review your PR
2. Address any feedback
3. Once approved, your PR will be merged
4. Your changes will be included in the next release

## Project Structure

```
/
├── services/           # Microservices
│   ├── gateway/       # API Gateway
│   ├── auth-service/  # Authentication
│   └── knowledge-api/ # Core API
├── packages/          # Shared packages
│   ├── shared-python/ # Python utilities
│   └── shared-ts/     # TypeScript utilities
├── schemas/           # API schemas
├── src/               # TypeScript SDK
├── docs/              # Documentation
└── infra/             # Infrastructure
```

## Adding a New Service

1. Create service directory:
   ```bash
   mkdir -p services/my-service/{src,runtime,tests}
   ```

2. Create `pyproject.toml`:
   ```toml
   [project]
   name = "perplexity-my-service"
   version = "0.1.0"
   requires-python = ">=3.12"
   ```

3. Create service application:
   ```python
   # services/my-service/src/app.py
   from fastapi import FastAPI

   app = FastAPI(title="My Service")

   @app.get("/")
   async def root():
       return {"service": "my-service"}
   ```

4. Create runtime entry point:
   ```python
   # services/my-service/runtime/main.py
   import uvicorn
   from ..src.app import app

   if __name__ == "__main__":
       uvicorn.run(app, host="0.0.0.0", port=8003)
   ```

5. Add tests:
   ```python
   # services/my-service/tests/test_api.py
   import pytest
   from fastapi.testclient import TestClient

   def test_root():
       # Your tests here
       pass
   ```

## Best Practices

### Python
- Use `pydantic-settings` for configuration
- Use `dependency-injector` for DI
- Follow async-first approach
- Handle errors gracefully
- Log important events
- Document complex logic

### TypeScript
- Use strict TypeScript
- Avoid `any` type
- Write unit tests
- Keep components small
- Use proper error handling
- Document public APIs

### Documentation
- Update README.md for major features
- Add docstrings to functions
- Update architecture.md if needed
- Include usage examples
- Keep docs in sync with code

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Features**: Open a GitHub Issue with feature request template

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
