# GitHub Copilot Customizations

The Markdown files under `.github/copilot/skills/` are existing workspace reference notes. For supported repository customizations, use `.github/agents/` for custom agents and `.github/skills/<skill-name>/SKILL.md` for reusable Agent Skills.

## Existing Workspace Notes

- **Python Microservices**: FastAPI service patterns, pydantic-settings, async/await
- **Schema-Driven Development**: OpenAPI spec generation, validation, code generation
- **Testing Patterns**: pytest fixtures, FastAPI TestClient, async test patterns
- **Service Configuration**: Environment-based config with pydantic-settings

## Adding New Skills

To add a new reusable Agent Skill:

1. Create `.github/skills/<skill-name>/SKILL.md` with `name` and `description` frontmatter.
2. Document the skill's workflow and relevant examples.
3. Add custom agents under `.github/agents/*.agent.md`.

## REA

- Select the `rea` agent in `.github/agents/rea.agent.md` for authorized local reverse-engineering analysis.
- The agent registers the REA MCP server only for that profile, pinned to `rea-agents@6.8.0`.
- The reusable `reverse-engineer-anything` skill is in `.github/skills/reverse-engineer-anything/SKILL.md`.
