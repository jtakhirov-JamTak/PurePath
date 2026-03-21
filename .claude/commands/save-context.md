---
name: save-context
description: Save session context before /clear
---

**Multi-project session context with automatic archiving and smart category detection.**

## Step 0: First-Run Setup (only if `session-context.md` does NOT exist)

If `session-context.md` does not exist at the project root, this is the first run. Ask the user:

```
I'll create your session context file. Quick setup:

What areas or projects do you work on in this repo?
(Examples: frontend, backend, api, docs, devops, testing, design, mobile, data)

Type your categories separated by commas, or say "auto" and I'll detect them from your folder structure.
```

- If the user provides categories, use those.
- If the user says "auto", scan top-level directories and infer categories from folder names and project structure.

Create the initial `session-context.md` with this header:

```markdown
# Session Context
<!-- categories: frontend, backend, api -->
```

Then proceed to Step 2.

## Step 1: Archive Current File

Before any changes, archive the existing file to preserve history.

```bash
mkdir -p .archive && cp session-context.md .archive/session-context-$(date +%Y%m%d-%H%M%S).md 2>/dev/null || true
```

## Step 2: Detect Active Categories

Scan the conversation for project/area mentions. Match against:

1. **Established categories** from the `<!-- categories: ... -->` comment in `session-context.md`
2. **New categories** detected from conversation context (file paths, topics, tools discussed)

If a new category is detected that isn't in the header, add it to the `<!-- categories: ... -->` line.

If no category can be detected, use `general`.

## Step 3: Update Only Detected Sections

Read existing `session-context.md` and parse into sections (split on `## `).

For each detected category:
- If section exists: replace with new content
- If section doesn't exist: append new section

**Leave all other sections untouched.**

## Section Format

```markdown
## {category}
Updated: [YYYY-MM-DD HH:MM]

### Working On
[1-3 sentences: current task and goal]

### Key Decisions
- [Decision 1 and reasoning]
- [Decision 2 and reasoning]

### Results
[Quantitative outcomes: metrics, completed deliverables, before/after numbers. Write "N/A" if session was purely setup/config work.]

### Files Touched
- [file1 - what changed]
- [file2 - what changed]

### Running Jobs
[Background processes still in progress (builds, deploys, long-running scripts), or "None"]

### Context
[References, links, error messages, or important background needed to resume. Include specific versions, URLs, or config values that would be lost on /clear.]

### Next Step
[Specific, actionable instruction. Should read like a task you could hand to another developer.]
```

## Rules

1. **ALWAYS archive first** - Never lose data
2. **ONLY update detected category sections** - Preserve other sections exactly as-is
3. **Keep each section under 45 lines** - Be concise but capture outcomes
4. **"Next Step" must be actionable** - Not vague ("Continue working on X" is bad; "Run the test suite and fix the 3 failing assertions in test_login.py" is good)
5. **"Results" captures value** - What was accomplished, not just what was attempted
6. **"Context" prevents re-discovery** - Include anything you had to look up or figure out this session

After writing, confirm:
```
Context saved for: [category1, category2, ...]
Archived previous version to .archive/
Ready for /clear
```
