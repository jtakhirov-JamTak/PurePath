---
name: diff-summary
description: Plain English summary of what changed since last commit
---

Summarize recent changes in plain English so the user knows what happened.

## Steps

1. Run `git log --oneline -10` to see recent commits
2. Run `git diff --stat` to see uncommitted changes
3. If there are uncommitted changes, run `git diff` to read them

## How to summarize

Write a short, plain-English summary. No code, no jargon. Format:

**Since last commit:**
- [what was added/changed/fixed, in human terms]

**Uncommitted changes:**
- [what's been changed but not saved yet]

## Example

**Last 3 commits:**
- Fixed a bug where habits showed the wrong count on the dashboard
- Made the journal save button work on mobile
- Added a loading animation to the plan page

**Uncommitted changes:**
- Changed the dashboard header color from blue to green
- Added a new "skip reason" field to habit tracking

Keep it brief — if there are 20 changes, group them ("several small fixes to the journal page") rather than listing every one.
