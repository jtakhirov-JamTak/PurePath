---
name: techdebt
description: Scan for dead code, duplication, and cleanup opportunities
---

Scan the codebase for tech debt. Check for:

1. **Dead code** — unused imports, unreferenced components, unused exports
2. **Duplication** — similar logic in multiple places that should be extracted
3. **Large files** — any file over 500 lines that could be split
4. **Inconsistencies** — mixed patterns (e.g., react-hook-form vs useState for forms)
5. **TODO/FIXME comments** — list them all
6. **Unused dependencies** in package.json

For each finding: explain what it is, why it matters, and propose a fix.

Do NOT make changes — just report. I'll approve what to fix.

$ARGUMENTS
