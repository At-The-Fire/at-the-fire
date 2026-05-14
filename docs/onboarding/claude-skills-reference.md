# Claude Code — Skills, Commands & Tools Reference

> Quick reference for what this project's Claude Code setup can do beyond the defaults.
> For full Claude Code docs, see [claude.ai/code](https://claude.ai/code).

---

## How to invoke

- **Commands** — type `/command-name` in the Claude Code prompt (e.g. `/write-retro`)
- **Plugin skills** — type `/skill-name` or just ask in plain English; Claude picks them up automatically
- **Agents** — Claude invokes these internally; you don't call them directly
- **MCPs** — Claude uses these as tools; you don't call them directly either

---

## Custom Commands

These live in `.claude/commands/` and are specific to this project.

| Command | What it does |
| --- | --- |
| `/write-retro` | Reads git history since the last retro, writes a formatted retrospective, and POSTs it to the shared Google Doc. Also reads/writes `.claude/last-retro` as the timestamp cutoff. Run at the end of any work session. |
| `/e2e-test [env]` | Runs the full E2E checklist via Playwright and produces a report in `.claude/reports/e2e-testing/`. Pass `local`, `dev-server`, or `prod-server`. |
| `/e2e-generate [section]` | Generates a Playwright `.spec.js` test file for one checklist section. Run once per section to build out `tests/e2e/`. |
| `/project-code-review [mode]` | Full codebase review. Optional modes: `BUGS`, `SECURITY`, `PERFORMANCE`, or combine (e.g. `BUGS,SECURITY`). Saves report to `.claude/reports/`. |

---

## Plugin Skills

Installed from `claude-plugins-official`. Invoke by name or just describe what you want.

| Skill | What it does |
| --- | --- |
| `/commit` | Stages, writes a commit message, and commits. |
| `/commit-push-pr` | Commit + push + open a GitHub PR in one step. |
| `/clean_gone` | Deletes local branches whose remote has been deleted. |
| `/code-review` | Reviews a PR — pass a PR number or branch name. |
| `/simplify` | Refactors recently changed code for clarity without changing behavior. |
| `/frontend-design` | Builds polished UI components with high design quality. |
| `/security-review` | Security-focused review of current branch changes. |
| `/e2e-test` | (Also a plugin skill — see Custom Commands above for project-specific behavior.) |

---

## Custom Agent

Lives in `.claude/agents/`. Claude invokes this automatically — you don't call it directly.

| Agent | What it does |
| --- | --- |
| `DocsExplorer` | Fetches up-to-date library and framework docs. Triggered automatically whenever Claude needs documentation for a package. Uses Context7 MCP as primary source, falls back to web search. |

---

## Custom Skill

Lives in `.claude/skills/`. Applied automatically during code work.

| Skill | What it does |
| --- | --- |
| `web-security` | Enforces security rules (XSS, injection, auth, CORS, CSP) during all code generation. Runs passively — you don't invoke it. |

---

## MCPs (Model Context Protocol tools)

These extend what Claude can access. Some need one-time authentication.

| MCP | Status | What it does |
| --- | --- | --- |
| `context7` | Connected | Fetches LLM-optimized library docs. Used by DocsExplorer automatically. |
| `playwright` | Connected | Browser automation for E2E testing. Used by `/e2e-test` and `/e2e-generate`. |
| `google-docs` | Needs auth | Read/write Google Docs. Used by `/write-retro` to append retrospectives. Authenticate once with `/mcp` → google-docs → Enter to auth. |
| `whimsical-desktop` | Needs DT app running | Whimsical diagram tool.|
| `Gmail` | Needs auth | Gmail access via claude.ai. Authenticate via `/mcp` if needed. |
| `Google Calendar` | Needs auth | Google Calendar access via claude.ai. Authenticate via `/mcp` if needed. |

---

## Setup — Installing Plugins for a New Machine

Open Claude Code and run `/plugins` (or open the plugin panel from the menu). Install the following from `claude-plugins-official`:

- `code-review`
- `code-simplifier`
- `commit-commands`
- `context7`
- `frontend-design`
- `playwright`

The local MCPs (`google-docs`, `whimsical-desktop`) are configured in the project's `.claude.json` and should appear automatically. Authenticate google-docs on first use via `/mcp`.
