# GitHub Copilot Customizations

The files under `.github/copilot/skills/` are workspace reference notes. Supported
repository Agent Skills live under `.github/skills/<skill-name>/SKILL.md`.

## Available Reference Notes

### Workspace Skills

- **Python Microservices**: FastAPI service patterns, pydantic-settings, async/await
- **Schema-Driven Development**: OpenAPI spec generation, validation, code generation
- **Testing Patterns**: pytest fixtures, FastAPI TestClient, async test patterns
- **Service Configuration**: Environment-based config with pydantic-settings

## REA Agent and Skill

- Select [rea](../agents/rea.agent.md) for authorized local SDK/protocol artifact
  analysis. Its agent-scoped MCP server runs `npx -y rea-agents@6.8.0 mcp`.
- The reusable [reverse-engineer-anything skill](../skills/reverse-engineer-anything/SKILL.md)
  connects evidence to SSE, REST, connector, schema, and bundle-analysis code.
- Node.js/npm must be available to the host. Initial launch may download the
  pinned package; analysis providers have separate prerequisites.
- Agent-scoped MCP configuration is not used by IDE custom agents. This setup
  does not change global settings, install providers, or establish runtime readiness.

## Adding New Skills

1. Create `.github/skills/<skill-name>/SKILL.md` with `name` and `description` YAML frontmatter.
2. Document when to use the skill, its workflow, and verification requirements.
3. Place custom agents under `.github/agents/*.agent.md` and link related skills.
