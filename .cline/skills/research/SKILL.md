---
name: research
description: Deep knowledge gathering with memory-aware search
when_to_use: When task requires understanding unfamiliar APIs, patterns, or technologies
allowed-tools: [Read, Search, memory_mcp, web_search, Execute]
model: qwen/qwen3-next-80b-a3b-instruct:free
memory_scopes:
  read: [global, workspace, project, agent:research]
  write: [agent:research, session]
  elevate_to: [project]
---

# Research Process with Memory Integration

## Step 1: Search Memory First
1. Определить ключевые вопросы/пробелы.
2. Выполнить `memory_search` по scope: global, workspace, project, agent:research.
3. Если релевантность ≥ 0.8 — использовать знания из памяти и не запускать web-search.

## Step 2: Web / Doc / Code Search (если memory miss)
1. Выполнить web/doc/code search.
2. Сохранить найденные факты в agent:research.

## Step 3: Synthesize Findings
1. Сформировать краткое JSON-резюме.
2. Записать артефакт `analysis/research-summary.json`.

## Step 4: Elevate (после Think)
После валидации Think можно промотировать находки из agent:research → project.

## Outputs
- `analysis/research-summary.json`

## Anti-patterns
- ❌ Начинать план без проверки памяти
- ❌ Игнорировать проверку качества источников