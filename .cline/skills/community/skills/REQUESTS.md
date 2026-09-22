# Skill Requests

Use this page to document skills you wish existed. Add requests here when you encounter situations where a skill would have helped.

## Format

```markdown
## [Short Descriptive Name]
**What I need:** One-line description
**When I'd use it:** Specific situations/symptoms
**Why I need this:** What makes this non-obvious or worth capturing
**Added:** YYYY-MM-DD
```

---

## Current Requests

(None yet - add requests below as you discover needs)

---

## Completed Requests

Skills that have been created from this list will move here with links.

### Notebooks Workflows
**What I needed:** A consistent workflow for creating/running notebooks (IDLE/IPython/Jupyter/VS Code) with Cline-aware hooks and magics.  
**When I'd use it:** Whenever starting or cleaning .ipynb files, switching kernels, or handing notebooks to agents.  
**Why it mattered:** Prevents kernel drift, output bloat, and loss of context when agents assist within notebooks.  
**Added:** 2026-02-02  
**Skill:** `skills/meta/notebooks-workflows/SKILL.md`

### Using Cline CLI
**What I needed:** A concise operational guide for running Cline CLI safely, handling sandbox/approvals, and picking models/providers.  
**When I'd use it:** When setting up Cline, switching inference providers, or troubleshooting blocked commands.  
**Why it mattered:** Reduces errors with sandboxed commands and keeps provider/model choices explicit.  
**Added:** 2026-02-02  
**Skill:** `skills/meta/using-cline-cli/SKILL.md`

---

## Guidelines

- **Be specific** - "Flaky test debugging" not "testing help"
- **Include symptoms** - Error messages, behavior patterns
- **Explain non-obvious** - Why can't you just figure this out?
- **One skill per request** - Keep them focused

your human partner reviews this periodically and we create skills together.
