---
description: Session start briefing - synthesizes recent git history, retro notes, and project context into a quick orientation for returning team members
allowed-tools: Bash, Read, mcp__google-docs__google_docs-get-document
---

# /start-up — Session Orientation Briefing

Orient a developer picking up this project after time away. Pull from git history, current branch state, the retro Google Doc, and project context to produce a clear, actionable briefing.

## Argument

`$ARGUMENTS` may be a number of days to look back (e.g. `60`). If omitted, default to whichever goes further back: the last retro timestamp from `.claude/last-retro` or 45 days ago.

## Step 1 — Collect Data

Run all bash commands in parallel:

```bash
cat .claude/last-retro
```

```bash
git branch --show-current && echo "---" && git status --short
```

```bash
git log --pretty=format:"%ad %h %s" --date=short -80
```

```bash
git log --after="45 days ago" --pretty=format:"%ad %h %s" --date=short
```

(If `$ARGUMENTS` is a number, replace `45` with that number in the last command.)

```bash
git diff --stat HEAD
```

Also in parallel, fetch the retro Google Doc:

```
mcp__google-docs__google_docs-get-document: document_id = "17U80EX_e00zypPKUCH4gj6llovGd6JYeRmOs6U4FsWI"
```

And read:
- `CLAUDE.md` (root — project architecture and critical constraints)

If the Google Docs call fails for any reason, continue without it and note "retro doc unavailable" in the briefing.

## Step 2 — Analyze

**From git log:**
- Determine the current branch and infer its purpose from the name and commit messages
- Group commits into 2-6 thematic areas (e.g., "Subscription gating", "Auction fixes", "Auth refactor") — group by feature/area, not by date
- Identify the most recent meaningful commit and what it suggests was in-flight
- Note any uncommitted changes from `git status` and `git diff --stat`
- Calculate time since last commit relative to today

**From the retro Google Doc:**
- Find the last 3 retro entries (each starts with a date line like `MM/DD/YY` or `MM/DD/YY - MM/DD/YY`)
- Extract the **Notes** paragraph from each — this contains synthesized "why" context and notable decisions
- Use these Notes as the primary narrative source; git log provides the structural backbone

**Synthesize:**
- What was the team working toward? (strategic goal)
- What was completed vs. what was still in motion at the last commit?
- Are there any signals of incomplete work (WIP-style commits, fix: commits suggesting an active bug hunt, partial feature patterns)?

## Step 3 — Present Briefing

Output exactly this format. Keep the total under 600 words — a returning dev should be oriented in under 2 minutes of reading.

---

## Session Briefing — [today's date, America/Los_Angeles]

### Current Branch: [branch name]
[One sentence describing what this branch is for, inferred from name + commits.]

### What's Been Happening
[2-4 sentences written like a senior dev catching up a returning teammate. Draw from retro Notes for the "why" and from git themes for the "what". Mention the overall trajectory and any notable pivots or decisions.]

### Recent Work Breakdown
[List 2-6 grouped themes. Format each as:]

**[Area/Feature Name]** — [what was done and why, 1-2 sentences]

### Current State of Play
- **Last commit:** [date] — [message]
- **Last retro written:** [date from .claude/last-retro]
- **Uncommitted changes:** [brief description, or "clean working tree"]
- **Time since last activity:** [X days]

### Where To Pick Up
[Specific, evidence-based recommendation. Do not say "continue development." Instead: "The last few commits were around X — based on the pattern, Y is the likely next step" or "Retro notes flagged Z as still pending." Ground every claim in what you found.]

### Project Context (Quick Reminders)
[3-5 facts from CLAUDE.md that are most relevant to the current branch's focus — the things a returning dev would need to avoid stepping on landmines. Skip generic facts; pick the ones that directly apply to what's been worked on.]

---

Do not include any section that has no data to fill it. If git log is empty for the lookback period, say so clearly rather than generating an empty breakdown.
