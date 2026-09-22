#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
SKILL_DIR="$ROOT/skills/using_cline_ai"
CLINE_DIR="$ROOT/.clinerules"
COMMUNITY_DIR="$ROOT/.cline/skills/community"
OUT_DIR="$ROOT/analysis/code-mode"

say() { printf "\n==> %s\n" "$*"; }
ok() { printf "   ✓ %s\n" "$*"; }
warn() { printf "   ! %s\n" "$*" >&2; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { warn "Missing command: $1"; return 1; }
}

ensure_dir() {
  local d="$1"
  if [ ! -d "$d" ]; then
    mkdir -p "$d"
    ok "Created dir: $d"
  else
    ok "Dir exists: $d"
  fi
}

copy_if_missing() {
  local src="$1" dst="$2"
  if [ ! -f "$dst" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    ok "Installed: $dst"
  else
    ok "Already exists: $dst"
  fi
}

append_gitignore_once() {
  local line="$1"
  local file="$ROOT/.gitignore"
  touch "$file"
  if ! grep -qxF "$line" "$file"; then
    printf "%s\n" "$line" >> "$file"
    ok "Added to .gitignore: $line"
  else
    ok ".gitignore already has: $line"
  fi
}

say "Bootstrap: using_cline_ai"

# --- sanity ---
need_cmd git || { warn "Install git first."; exit 2; }

# --- dirs ---
ensure_dir "$CLINE_DIR"
ensure_dir "$CLINE_DIR/rules"
ensure_dir "$CLINE_DIR/workflows"
ensure_dir "$CLINE_DIR/hooks"
ensure_dir "$OUT_DIR"
touch "$OUT_DIR/test-plan.md" "$OUT_DIR/report.md"
ok "Ensured artifacts: $OUT_DIR/test-plan.md, $OUT_DIR/report.md"

# --- .gitignore ---
append_gitignore_once "node_modules/"
append_gitignore_once ".venv/"
append_gitignore_once "out/"
append_gitignore_once "analysis/code-mode/*.log"

# --- install rules/workflows/hooks from skill pack ---
say "Installing Cline rules/workflows/hooks from skill pack (if present)"
# Expect the canonical source inside skills/using_cline_ai/cline/...
if [ -d "$SKILL_DIR/cline/rules" ]; then
  for f in "$SKILL_DIR"/cline/rules/*.md; do
    [ -e "$f" ] || continue
    copy_if_missing "$f" "$CLINE_DIR/rules/$(basename "$f")"
  done
else
  warn "Missing $SKILL_DIR/cline/rules (you haven't generated the pack yet)"
fi

if [ -d "$SKILL_DIR/cline/workflows" ]; then
  for f in "$SKILL_DIR"/cline/workflows/*.md; do
    [ -e "$f" ] || continue
    copy_if_missing "$f" "$CLINE_DIR/workflows/$(basename "$f")"
  done
else
  warn "Missing $SKILL_DIR/cline/workflows"
fi

if [ -d "$SKILL_DIR/cline/hooks" ]; then
  for f in "$SKILL_DIR"/cline/hooks/*; do
    [ -e "$f" ] || continue
    local_name="$(basename "$f")"
    dst="$CLINE_DIR/hooks/$local_name"
    copy_if_missing "$f" "$dst"
    chmod +x "$dst" || true
  done
else
  warn "Missing $SKILL_DIR/cline/hooks"
fi

# --- community skills (project-specific) ---
say "Community skills (project-specific): obra/superpowers-skills"
if [ -d "$COMMUNITY_DIR/.git" ]; then
  ok "Community skills already cloned: $COMMUNITY_DIR"
else
  ensure_dir "$(dirname "$COMMUNITY_DIR")"
  git clone https://github.com/obra/superpowers-skills.git "$COMMUNITY_DIR"
  ok "Cloned community skills into: $COMMUNITY_DIR"
fi

# --- node + deps ---
say "Node/npm dependencies for UTCP code-mode"
if need_cmd node && need_cmd npm; then
  ok "Node: $(node -v)"
  ok "npm:  $(npm -v)"
  if [ -f "$ROOT/package.json" ]; then
    say "Running npm install (idempotent)"
    npm install
    ok "npm dependencies installed"
  else
    warn "No package.json in repo root. Skipping npm install."
    warn "If you want UTCP code-mode runner, add package.json with @utcp/code-mode deps."
  fi
else
  warn "Node/npm missing. Install Node.js >= 18, then re-run bootstrap."
fi

say "Done."
say "Next: open Cline in this repo and use workflows from .clinerules/workflows/"
