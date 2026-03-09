# retro

Write my development retrospective and append it to my Google Doc. Covers today or multiple days if retros were missed — always one single block regardless of time span.

## Rules

- Only summarize work proven by git history or repository changes.
- Do not invent work.
- Output MUST match the template exactly — including bold formatting.
- All dates in America/Los_Angeles timezone.

## Retro Template

Single day:
mm/dd/yy

Multi-day catch-up:
mm/dd/yy – mm/dd/yy

**BRANCH** — brief description (e.g. "dev branch", "feature/foo merged into main", "active development period — no merges to main")

**Notes:**
Summarize the overall period — what was the theme or focus? Flag anything notable (large refactors, schema changes, security work, etc.). If it's a long catch-up period, acknowledge that.

**Client**
- Summarize front end contributions grouped by feature/area
- One line per meaningful change or theme

**Server**
- Summarize back end contributions grouped by feature/area
- One line per meaningful change or theme

## Step 1 - Collect work evidence

First, read the last retro date:

```bash
cat .claude/last-retro
```

This tells you the date of the last retro written. Use the day AFTER that date as the start of your git log range.

Then run:

```bash
git log --after="LAST_RETRO_DATE" --no-merges --pretty=format:"%ad %h %s" --date=short
git log --after="LAST_RETRO_DATE" --no-merges --pretty=format:"%ad" --date=short | sort | uniq
git branch -a
```

Use the commit dates to determine:
- The earliest and latest commit dates in this batch
- Whether this is a single-day or multi-day entry

If there are no commits since the last retro date, tell the user and stop — do not write an empty retro.

## Step 2 - Produce Retro

- Use a date range (mm/dd/yy – mm/dd/yy) if commits span more than one day, otherwise single date.
- Group work by feature or system area — not by day, not by file.
- Summarize intent and outcome.
- Include important technical events: schema changes, refactors, debugging, infra/config updates, test additions.
- Notes section should read naturally — not a list, but a brief narrative summary of the period.

## Step 3 - Append to Google Docs

Use the Bash tool to POST the retro to the Apps Script web app:

```bash
curl -s -X POST "https://script.google.com/macros/s/AKfycbxYExf4CdPqrzCpxu1v5cpeA3gc8DkpajWbUQt28CsEhzQFUoTY1fxvzWPM0U1p0csgfg/exec" \
  -H "Content-Type: application/json" \
  -d '{"date":"MM/DD/YY or MM/DD/YY – MM/DD/YY","branch":"BRANCH description","notes":"narrative summary","client":["item1","item2"],"server":["item1","item2"]}'
```

Requirements:

- `date`: single date (MM/DD/YY) or range (MM/DD/YY – MM/DD/YY) depending on commits
- `branch`: what actually happened — e.g. "dev branch", "feature/foo merged", "dev branch — active development period (no merges to main)". Only use action words (created/merged/deleted) if that event actually occurred.
- `notes`: narrative summary of the period, not a list. Mention if it's a catch-up entry.
- `client`: array of front end contribution strings (omit bullet dashes, the script adds them)
- `server`: array of back end contribution strings (omit bullet dashes, the script adds them)
- A 302 response is success — the script executed correctly.
- Do NOT use the Google Docs MCP tools for this step.

After a successful POST, update the last retro date:

```bash
echo "MM/DD/YY" > .claude/last-retro
```

Write today's date (the end date of the retro range) in MM/DD/YY format.
