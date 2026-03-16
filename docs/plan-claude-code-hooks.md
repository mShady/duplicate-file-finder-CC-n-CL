# Plan: Add Claude Code Pre-Commit Hooks and CLAUDE.md

## Goal

This project lacks a CLAUDE.md and Claude Code hooks. Add both so Claude runs verification before every commit.

## Step 1: Create CLAUDE.md

Create a project CLAUDE.md with verification commands. Reference the Interview project's CLAUDE.md as a template — adapt for this project's actual setup:

- Check if `npm run lint`, `npm run check`, `npm test` scripts exist in package.json
- Check if `cargo clippy` and `cargo test` work from `src-tauri/`
- Check if prettier is configured
- Document the working commands under an `## Automated Verification` section

## Step 2: Create `.claude/settings.json` with pre-commit hooks

Once verification commands are confirmed, add hooks:

```json
{
  "hooks": {
    "PreCommit": [
      {
        "command": "cd src-tauri && cargo clippy --all-targets -- -D warnings",
        "description": "Rust linter"
      },
      {
        "command": "cd src-tauri && cargo test --quiet",
        "description": "Rust tests"
      },
      {
        "command": "npm run lint",
        "description": "ESLint"
      },
      {
        "command": "npx prettier --check .",
        "description": "Prettier format check"
      }
    ]
  }
}
```

Adjust commands based on what's actually available in this project's package.json and Cargo.toml.

## Notes

- Verify each command works manually before adding to hooks.
- This project uses Tauri (src-tauri/) + Vite + Tailwind — same stack as the Interview variant, but may have fewer npm scripts configured.
