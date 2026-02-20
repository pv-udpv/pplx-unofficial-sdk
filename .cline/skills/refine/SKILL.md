---
name: refine
description: Iterative improvement of requirements and plans through dialogue and feedback
when_to_use: After initial plan or when Think identifies gaps that require clarification
allowed-tools: [Read, Write, memory_mcp, Skill]
model: meta-llama/llama-3.3-70b-instruct:free
memory_scopes:
  read: [global, workspace, project, agent:*]
  write: [agent:refine, session]
  elevate_to: [project]
---

# Refine Process

## Mode 1: Requirements Refinement
1. Сформулировать вопросы для уточнения (Socratic dialog).
2. Запросить ответы у пользователя.
3. Обновить `analysis/refined-requirements.md`.

## Mode 2: Plan Improvement
1. Загрузить plan.json + Think feedback.
2. Исправить риски/пробелы.
3. Сохранить обновлённый план.

## Mode 3: Trade-offs
1. Сравнить 2–3 альтернативы.
2. Зафиксировать выбор и rationale.

## Outputs
- `analysis/refined-requirements.md`

## Anti-patterns
- ❌ Игнорировать фидбек Think
- ❌ Уточнять требования без фиксации изменений