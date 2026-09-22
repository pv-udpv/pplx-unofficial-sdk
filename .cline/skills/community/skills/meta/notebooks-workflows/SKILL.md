---
name: notebooks-workflows
description: Reliable workflows for creating and running notebooks (IDLE/IPython/Jupyter/VS Code) with Cline hooks, magics, and context hygiene
when_to_use: when starting or maintaining notebooks in this repo, especially to align Jupyter/VS Code flows with Cline-aware hooks and keep .ipynb structure clean
version: 1.0.0
allowed-tools: [Read, Write, Execute]
compatibility:
  runtimes: [Codex CLI, Claude Code, VS Code AI]
  notes: use provider-native notebook kernel picker; web_search not required unless explicitly researching
---

# Notebooks Workflows

Use this skill to stand up, edit, and share notebooks across IDLE/IPython/Jupyter/VS Code while keeping Cline interop predictable. Keep SKILL.md concise; load references/scripts only if added later.

## Overview
- Goal: fast notebook setup with reproducible kernels, correct magics/hooks, and minimal context loss.
- Scope: .ipynb, .py (IPython), VS Code Notebook UI, Jupyter Lab/Classic, IDLE handoff.
- Assumptions: Jupyter extension installed in VS Code; Python env activated; git keeps large outputs trimmed.

## When to Use
- New notebook creation or conversion from .py.
- Cleaning a noisy .ipynb (outputs/metadata) before commit.
- Running Cline-assisted steps (plan → execute → verify) inside notebooks.
- Switching between VS Code, Jupyter web UI, and terminal IPython without breaking kernel state.

## Quick Reference
**Create + prime notebook (VS Code or Jupyter)**
1) Activate env: `source .venv/bin/activate` (or project env).  
2) Launch kernel: VS Code Command Palette → “Select Kernel” (match project env).  
3) Insert boilerplate cell:
   ```python
   %load_ext autoreload
   %autoreload 2
   import os, sys, pathlib
   os.chdir(pathlib.Path(__file__).parent if '__file__' in globals() else pathlib.Path().cwd())
   sys.path.insert(0, str(pathlib.Path.cwd()))
   ```
4) Add a “notebook header” markdown cell: title, purpose, inputs, outputs, data paths, author/date.
5) Save immediately to lock metadata (`.ipynb` captures kernel spec).

**Keep outputs sane**
- Clear or reduce heavy outputs: VS Code “Clear All Outputs” before commit; prefer text summaries over full DataFrame dumps.
- Store big artifacts under `analysis/` or data paths, not in notebook cells; reference via relative paths.

**Run scripts inside notebook**
- `%run script.py` for local modules; keep script idempotent.  
- `%%bash` for CLI steps; echo commands for provenance.  
- Use `pathlib.Path(__file__).parent` guards if moving between CLI and notebook contexts.

**One-button notebook + Cline (conceptual)**
- Command Palette macro: “Jupyter: Create New Blank Notebook” → auto-add header + boilerplate cell above → open Cline with prompt template “summarize cells + next actions”. Until automation exists, do it manually: create notebook, paste boilerplate cell, then invoke Cline with the open file.

## Implementation Notes
- **Kernel naming**: prefer env name (e.g., `pplx-sdk`) and avoid “Python 3 (ipykernel)” ambiguity; re-run “Select Kernel” after env changes.
- **Imports**: keep first code cell as imports/config; pin seeds (`import random, numpy as np; random.seed(0); np.random.seed(0)`).
- **Magics**:  
  - `%autoreload 2` while iterating on local modules.  
  - `%timeit` for micro-bench; `%prun` for profiling; avoid committing profiler outputs.  
  - `%%capture cap` for noisy setup; log `print(cap.stdout)` only when needed.  
- **File writes**: write outputs under `analysis/` or `data/derived/`; never inside `.vscode` or notebook directory roots unless intentional.
- **Metadata hygiene**: use VS Code “Export to Python” only for sharing; otherwise keep `.ipynb` canonical. If metadata bloats, run `nbstripout` or `jupyter nbconvert --ClearOutputPreprocessor.enabled=True --inplace file.ipynb`.

## Cross-Environment Handoff
- **VS Code ↔ Jupyter Lab**: ensure kernel display name matches env; if mismatch, run `python -m ipykernel install --user --name pplx-sdk --display-name "pplx-sdk"`.
- **Terminal IPython**: start with `ipython --matplotlib=inline`; `%load_ext autoreload`; `%run notebook.ipynb` is discouraged—convert to `.py` with `jupyter nbconvert --to script`.
- **IDLE**: use only for quick checks; do not save .ipynb from IDLE. Convert scripts back into notebook via `jupyter nbconvert --to notebook script.py --output new.ipynb` when needed.

## Cline Interop
- Keep notebooks small; Cline reads active cell + nearby context. Summaries: add a markdown “Context for agent” cell after key milestones.
- For long runs: checkpoint state in `analysis/checkpoints/` (pickle/json) and note file paths in markdown.
- When asking Cline for help: state kernel name, data paths, and whether outputs are cleared; include last executed cell number.

## Pressure Tests (self-check)
1) Start new notebook, forget `%autoreload`: expect module changes not reflected; fix by adding header cell.  
2) Switch kernel to wrong env: imports fail; run kernel selector and restart.  
3) Commit with large outputs: repo bloat; clear outputs and rerun critical summaries only.

## Common Mistakes to Avoid
- Mixing relative paths from different working dirs; always pin `Path().cwd()` in setup cell.
- Leaving random seeds unset; reproducibility breaks across runs/agents.
- Using `%run` on notebooks; convert to `.py` first.
- Trusting stale kernel state; restart kernel before final export or sharing.
- Embedding credentials in cells; load via env vars or config files ignored by git.

## Compatibility Notes
- **Codex/Claude Code**: `allowed-tools` limited to Read/Write/Execute; avoid tool-specific calls in instructions.
- **VS Code**: relies on Jupyter extension; “Clear All Outputs” and “Select Kernel” commands may differ slightly by build.
- **Headless CI**: prefer `papermill` or `nbconvert --execute` with `--ExecutePreprocessor.timeout=600`; ensure data paths exist.

### Runtime/tool matrix
| Runtime        | Tools typically available        | Notes                                             |
| -------------- | -------------------------------- | ------------------------------------------------- |
| Codex CLI      | Read, Write, Execute             | No web_search by default; shell magics via `%%bash` |
| Claude Code    | Read, Write, Execute             | Similar to Codex; confirm kernel from status bar   |
| VS Code AI     | Read, Write, Execute, UI actions | Uses Jupyter extension commands; outputs clearable from UI |
