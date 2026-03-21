---
name: commit-push
description: Stage, commit, and push to GitHub
---

Commit and push current changes:

```bash
git status
git diff --stat
git log --oneline -5
```

1. Stage relevant files (exclude .env, node_modules, dist, source.zip)
2. Write a concise commit message based on the diff
3. Commit and push to origin main
4. Report what was pushed

$ARGUMENTS
