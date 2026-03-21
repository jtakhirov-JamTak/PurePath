---
name: code-simplifier
description: Review and simplify recently changed code
---

Review the git diff of uncommitted changes. For each changed file:

1. Can any new code be simplified without changing behavior?
2. Are there unnecessary abstractions, over-engineering, or verbose patterns?
3. Can any repeated logic be consolidated?
4. Are there unnecessary null checks, redundant conditions, or dead branches?
5. Are there unused imports or variables introduced by the changes?

Make the simplifications directly. Keep changes minimal and behavior-preserving.
Run `npm run check` after changes to verify nothing broke.

Do not add comments, docstrings, or type annotations that weren't there before.
Do not refactor code that wasn't part of the original changes.
