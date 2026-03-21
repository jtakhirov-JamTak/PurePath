---
name: quick-commit
description: Fast commit without pushing
---

Quick commit current changes (no push):

```bash
git status
git diff --stat
```

1. Stage modified/added files (exclude .env, node_modules, dist, source.zip)
2. Write a concise commit message based on the diff
3. Commit locally

$ARGUMENTS
