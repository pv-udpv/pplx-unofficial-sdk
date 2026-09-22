# Copilot Instructions — pplx-unofficial-sdk

> Loaded automatically by GitHub Copilot coding agent. Keep concise and specific.
> Primary language: **TypeScript**. Default branch: `main`.

## Project intent

<!-- Maintainer: fill in 2-3 sentences on what this repo does. -->

## How to run locally

<!-- Maintainer: add setup + run commands. -->

## Language rules

- TypeScript strict mode. No `any` unless unavoidable and commented.
- Prefer `pnpm` if lockfile exists, else `npm`. Match existing manager.
- Tests: `vitest` or `jest` per existing config. Keep them fast (<5s each).

## Commit & PR conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Small PRs. Prefer <400 lines of diff.
- Every PR needs a `Why`, `Testing`, and `Risk` section (matches `pull_request_template.md`).
- Do NOT disable CI checks. Do NOT merge your own PR.

## Tests

- Running tests locally must match CI. If CI uses a specific Python/Node version, pin it.
- Snapshot tests: regenerate only when you intentionally changed output, and explain why in the PR.

## Secrets

- Never read secrets from the filesystem. Use `${{ secrets.XXX }}` in workflows.
- Do not invent new secret names without coordinating with the maintainer.
- If you need a secret that doesn't exist, stop and open an issue instead of hardcoding.

### CI runner

- This repo currently runs CI on GitHub-hosted runners.
- Do not propose switching workflows to a self-hosted runner by default; this repo's current workflows use GitHub-hosted runners.
- If maintainers explicitly ask about reducing CI minutes or handling long-running jobs, you may mention the self-hosted `[self-hosted, pv-cargo]` runner as a future/optional path and point to `pv-udpv/gh-runner-infra` for onboarding.

## What to avoid

- Don't touch `.github/workflows/` without an explicit ask — CI changes need human review.
- Don't introduce new runtime dependencies without justification.
- Don't rewrite unrelated code in the same PR. Keep the diff scoped.
- Don't assume `git push` auto-merges. Wait for review.
