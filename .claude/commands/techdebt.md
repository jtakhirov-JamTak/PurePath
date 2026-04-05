---
name: techdebt
description: Scan for dead code, duplication, and cleanup opportunities — then fix approved items
---

## Phase 1: Scan and Report

Scan the codebase for tech debt. Check for:

1. **Dead code** — unused imports, unreferenced components, unused exports
2. **Duplication** — similar logic in multiple places that should be extracted
3. **Large files** — any file over 500 lines that could be split
4. **Inconsistencies** — mixed patterns (e.g., react-hook-form vs useState for forms)
5. **TODO/FIXME comments** — list them all
6. **Unused dependencies** in package.json
7. **Stale files** — leftover temp files, empty files, old archives

For each finding: explain what it is in plain English, why it matters, and propose a fix.

## Phase 2: Get Approval

Group findings by type and present them:
- **Quick wins** — unused imports, dead files, stale leftovers (safe to delete now)
- **Medium effort** — duplicated constants, mixed patterns (need small refactors)
- **Big items** — large files to split, architecture changes (plan first)

Ask which groups to fix. Wait for approval before touching anything.

## Phase 3: Clean Up Approved Items

For each approved group:
1. Make the changes
2. Run `npm run check` to verify nothing broke
3. If something breaks, undo immediately and report what happened
4. Report what was removed/changed

## Final Report
- Issues found: [count by type]
- Issues fixed: [count]
- Issues skipped: [count with reasons]
- Remaining items for future sessions

$ARGUMENTS
