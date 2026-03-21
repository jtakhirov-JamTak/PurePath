---
name: resume
description: Restore context after /clear
---

**Read `session-context.md` from the project root and resume work.**

## Step 1: Find the File

Look for `session-context.md` at the project root.

If the file does not exist, say:
```
No session context found. Run /save-context before /clear to preserve your session.
```
And stop.

## Step 2: Display All Sections

Parse the file and show every category section, sorted by most recently updated first:

```
# Session Context Overview

## {category1} (Updated: YYYY-MM-DD HH:MM)
Working on: [1 sentence from "Working On"]
Last result: [1 sentence from "Results", or omit if N/A]
Next step: [from "Next Step"]
Running jobs: [from "Running Jobs", or omit if None]

## {category2} (Updated: YYYY-MM-DD HH:MM)
Working on: [1 sentence from "Working On"]
Last result: [1 sentence from "Results", or omit if N/A]
Next step: [from "Next Step"]
Running jobs: [from "Running Jobs", or omit if None]

---
Which context should we pick up? (or describe a different task)
```

## Step 3: Load Full Context

When the user picks a category:

1. Read the **full section** for that category (all 7 subsections)
2. Re-read any files listed in "Files Touched" to rebuild working knowledge
3. Check the status of any "Running Jobs" if applicable
4. Begin executing the "Next Step"

If the user describes a different task, proceed with that instead.

## Rules

1. Show ALL category sections, not just the most recent
2. Sort by most recently updated first
3. Keep display summaries to 1 sentence each — full detail loads after selection
4. If "Running Jobs" has active items, surface them prominently — the user may need status updates
5. Always wait for user to choose before taking action
6. If user specifies a different task, proceed with that
